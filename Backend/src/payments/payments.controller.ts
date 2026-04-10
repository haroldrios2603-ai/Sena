import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireScreenPermission } from '../common/decorators/screen-permission.decorator';
import { PaymentsService } from './payments.service';
import { CreateExitPaymentIntentDto } from './dto/create-exit-payment-intent.dto';
import { CreatePublicCheckoutDto } from './dto/create-public-checkout.dto';

type WompiWebhookInput = Parameters<PaymentsService['processWompiWebhook']>[0];

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('wompi/exit/:exitId/intent')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @RequireScreenPermission('operations-dashboard')
  async createExitIntent(
    @Param('exitId') exitId: string,
    @Body() dto: CreateExitPaymentIntentDto,
    @Req() req: { user?: { userId?: string } },
  ) {
    return this.paymentsService.createExitPaymentIntent(
      exitId,
      req.user?.userId,
      dto,
    );
  }

  @Get('public/:paymentId')
  async getPublicPayment(@Param('paymentId') paymentId: string) {
    return this.paymentsService.getPublicPayment(paymentId);
  }

  @Post('public/:paymentId/checkout')
  async createPublicCheckout(
    @Param('paymentId') paymentId: string,
    @Body() dto: CreatePublicCheckoutDto,
  ) {
    return this.paymentsService.createPublicCheckout(paymentId, dto);
  }

  @Post('wompi/webhook')
  async handleWompiWebhook(@Body() payload: unknown) {
    return this.paymentsService.processWompiWebhook(payload as WompiWebhookInput);
  }
}
