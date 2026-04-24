import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireScreenPermission } from '../common/decorators/screen-permission.decorator';
import { PaymentsService } from './payments.service';
import { CreateExitPaymentIntentDto } from './dto/create-exit-payment-intent.dto';
import { CreatePublicCheckoutDto } from './dto/create-public-checkout.dto';
import { AuditService } from '../audit/audit.service';
import { AuditOperation, AuditResult } from '@prisma/client';

type WompiWebhookInput = Parameters<PaymentsService['processWompiWebhook']>[0];

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly auditService: AuditService,
  ) {}

  @Post('wompi/exit/:exitId/intent')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @RequireScreenPermission('operations-dashboard')
  async createExitIntent(
    @Param('exitId') exitId: string,
    @Body() dto: CreateExitPaymentIntentDto,
    @Req() req: { user?: { userId?: string } },
  ) {
    const result = await this.paymentsService.createExitPaymentIntent(
      exitId,
      req.user?.userId,
      dto,
    );

    this.auditService.log({
      operation: AuditOperation.CREATE,
      entity: 'payment_exit_intent_qr',
      recordId: result.paymentId,
      newValues: {
        exitId,
        paymentId: result.paymentId,
        amount: result.amount,
        status: result.status,
      },
      result: AuditResult.SUCCESS,
      context: this.auditService.buildContextFromRequest(req as any),
    });

    return result;
  }

  @Post('exit/:exitId/cash')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @RequireScreenPermission('operations-dashboard')
  async registerExitCashPayment(
    @Param('exitId') exitId: string,
    @Req() req: { user?: { userId?: string } },
  ) {
    const result = await this.paymentsService.registerExitCashPayment(
      exitId,
      req.user?.userId,
    );

    this.auditService.log({
      operation: AuditOperation.UPDATE,
      entity: 'payment_exit_cash',
      recordId: result.paymentId,
      newValues: {
        exitId,
        paymentId: result.paymentId,
        amount: result.amount,
        method: result.method,
        status: result.status,
      },
      result: AuditResult.SUCCESS,
      context: this.auditService.buildContextFromRequest(req as any),
    });

    return result;
  }

  @Get('public/:paymentId')
  async getPublicPayment(@Param('paymentId') paymentId: string) {
    return this.paymentsService.getPublicPayment(paymentId);
  }

  @Post('public/:paymentId/checkout')
  async createPublicCheckout(
    @Param('paymentId') paymentId: string,
    @Body() dto: CreatePublicCheckoutDto,
    @Request() req: any,
  ) {
    const result = await this.paymentsService.createPublicCheckout(paymentId, dto);

    this.auditService.log({
      operation: AuditOperation.CREATE,
      entity: 'payment_public_checkout',
      recordId: paymentId,
      newValues: {
        paymentId,
        method: dto.method,
      },
      result: AuditResult.SUCCESS,
      context: this.auditService.buildContextFromRequest(req as any),
    });

    return result;
  }

  @Post('wompi/webhook')
  async handleWompiWebhook(@Body() payload: unknown) {
    return this.paymentsService.processWompiWebhook(payload as WompiWebhookInput);
  }
}
