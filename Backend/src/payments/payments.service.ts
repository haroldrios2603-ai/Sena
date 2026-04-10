import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  CreatePublicCheckoutDto,
  PublicPaymentMethod,
} from './dto/create-public-checkout.dto';
import { createHash } from 'crypto';
import { CreateExitPaymentIntentDto } from './dto/create-exit-payment-intent.dto';

type WompiWebhookPayload = {
  event?: string;
  data?: {
    transaction?: {
      id?: string;
      reference?: string;
      status?: string;
      payment_method_type?: string;
    };
  };
};

@Injectable()
export class PaymentsService {
  private readonly frontendBaseUrl =
    process.env.FRONTEND_BASE_URL ?? 'http://localhost:5173';

  private readonly wompiCheckoutBaseUrl =
    process.env.WOMPI_CHECKOUT_BASE_URL ?? 'https://checkout.wompi.co/p/';

  async createExitPaymentIntent(
    exitId: string,
    userId: string | undefined,
    dto: CreateExitPaymentIntentDto,
  ) {
    const exit = await this.prisma.exit.findUnique({
      where: { id: exitId },
      include: {
        payment: true,
      },
    });

    if (!exit) {
      throw new NotFoundException('No se encontró la salida indicada');
    }

    if (exit.payment && exit.payment.status === 'COMPLETED') {
      return this.buildIntentResponse(
        exit.payment.id,
        exit.payment.amount,
        exit.payment.status,
        dto.expiresInMinutes,
      );
    }

    const amount = this.resolveAmount(exit.totalAmount, dto.overrideAmount);
    const payment =
      exit.payment ??
      (await this.prisma.payment.create({
        data: {
          amount,
          method: 'ONLINE',
          status: 'PENDING',
          userId,
        },
      }));

    if (!exit.paymentId) {
      await this.prisma.exit.update({
        where: { id: exitId },
        data: { paymentId: payment.id },
      });
    }

    return this.buildIntentResponse(
      payment.id,
      payment.amount,
      payment.status,
      dto.expiresInMinutes,
    );
  }

  async getPublicPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        amount: true,
        method: true,
        status: true,
        createdAt: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('No se encontró el pago');
    }

    return {
      ...payment,
      currency: 'COP',
      availableMethods: Object.values(PublicPaymentMethod),
      reference: this.buildReference(payment.id),
    };
  }

  async createPublicCheckout(paymentId: string, dto: CreatePublicCheckoutDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        amount: true,
        status: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('No se encontró el pago');
    }

    if (payment.status === 'COMPLETED') {
      throw new BadRequestException('Este pago ya fue confirmado');
    }

    const wompiPublicKey = process.env.WOMPI_PUBLIC_KEY;
    const wompiIntegritySecret = process.env.WOMPI_INTEGRITY_SECRET;

    if (!wompiPublicKey || !wompiIntegritySecret) {
      throw new ServiceUnavailableException(
        'Falta configurar WOMPI_PUBLIC_KEY o WOMPI_INTEGRITY_SECRET',
      );
    }

    const reference = this.buildReference(payment.id);
    const amountInCents = Math.round(payment.amount * 100);
    const redirectUrl = `${this.frontendBaseUrl}/pago/${payment.id}`;
    const signature = this.buildIntegritySignature(
      reference,
      amountInCents,
      wompiIntegritySecret,
    );

    const query = new URLSearchParams();
    query.set('public-key', wompiPublicKey);
    query.set('currency', 'COP');
    query.set('amount-in-cents', amountInCents.toString());
    query.set('reference', reference);
    query.set('redirect-url', redirectUrl);
    query.set('signature:integrity', signature);
    query.set('payment-method', this.mapMethodForCheckout(dto.method));

    if (dto.customerEmail) {
      query.set('customer-data:email', dto.customerEmail);
    }

    if (dto.customerName) {
      query.set('customer-data:full-name', dto.customerName);
    }

    if (dto.phoneNumber) {
      query.set('customer-data:phone-number', dto.phoneNumber);
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PENDING',
        method: dto.method,
      },
    });

    return {
      paymentId: payment.id,
      checkoutUrl: `${this.wompiCheckoutBaseUrl}?${query.toString()}`,
    };
  }

  async processWompiWebhook(payload: WompiWebhookPayload) {
    const transaction = payload.data?.transaction;
    const reference = transaction?.reference;

    if (!reference) {
      return { received: true, updated: false };
    }

    const paymentId = this.getPaymentIdFromReference(reference);
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, status: true },
    });

    if (!payment) {
      return { received: true, updated: false };
    }

    const nextStatus = this.mapWompiStatus(transaction?.status);
    const nextMethod = this.mapWompiMethod(transaction?.payment_method_type);

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: nextStatus,
        ...(nextMethod ? { method: nextMethod } : {}),
      },
    });

    return {
      received: true,
      updated: true,
      paymentId,
      status: nextStatus,
    };
  }

  constructor(private readonly prisma: PrismaService) {}

  private buildIntentResponse(
    paymentId: string,
    amount: number,
    status: string,
    expiresInMinutes?: number,
  ) {
    const expiresAt = new Date(
      Date.now() + (expiresInMinutes ?? 30) * 60 * 1000,
    ).toISOString();
    const paymentPageUrl = `${this.frontendBaseUrl}/pago/${paymentId}`;
    const qrImageUrl =
      'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' +
      encodeURIComponent(paymentPageUrl);

    return {
      paymentId,
      amount,
      currency: 'COP',
      status,
      expiresAt,
      paymentPageUrl,
      qrImageUrl,
    };
  }

  private resolveAmount(currentAmount: number, overrideAmount?: number) {
    if (overrideAmount !== undefined) {
      if (!Number.isFinite(overrideAmount) || overrideAmount <= 0) {
        throw new BadRequestException('El monto manual debe ser positivo');
      }
      return overrideAmount;
    }

    if (!Number.isFinite(currentAmount) || currentAmount <= 0) {
      throw new BadRequestException('La salida tiene un monto inválido');
    }

    return currentAmount;
  }

  private buildReference(paymentId: string) {
    return `RM-${paymentId}`;
  }

  private getPaymentIdFromReference(reference: string) {
    return reference.startsWith('RM-') ? reference.slice(3) : reference;
  }

  private buildIntegritySignature(
    reference: string,
    amountInCents: number,
    integritySecret: string,
  ) {
    return createHash('sha256')
      .update(`${reference}${amountInCents}COP${integritySecret}`)
      .digest('hex');
  }

  private mapMethodForCheckout(method: PublicPaymentMethod) {
    if (method === PublicPaymentMethod.NEQUI) return 'NEQUI';
    if (method === PublicPaymentMethod.BANK_ACCOUNT) return 'PSE';
    return 'CARD';
  }

  private mapWompiStatus(status?: string) {
    const normalized = status?.toUpperCase() ?? 'PENDING';

    if (normalized === 'APPROVED') return 'COMPLETED';
    if (normalized === 'DECLINED' || normalized === 'VOIDED' || normalized === 'ERROR') {
      return 'FAILED';
    }

    return 'PENDING';
  }

  private mapWompiMethod(method?: string) {
    if (!method) {
      return null;
    }

    const normalized = method.toUpperCase();
    if (normalized.includes('NEQUI')) return 'NEQUI';
    if (normalized.includes('PSE')) return 'BANK_ACCOUNT';
    if (normalized.includes('CARD')) return 'CARD';

    return method;
  }
}
