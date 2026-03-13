import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class PasswordRecoveryNotifierService {
  private readonly logger = new Logger(PasswordRecoveryNotifierService.name);
  private readonly transporter: Transporter | null;
  private readonly fromAddress: string;
  private readonly forcedRecipient?: string;

  constructor() {
    this.transporter = this.createTransporter();
    this.fromAddress =
      process.env.SMTP_FROM ??
      process.env.SMTP_USER ??
      'no-reply@rmparking.local';

    // ES: En desarrollo permitimos forzar un buzón destino para pruebas controladas.
    const envOverride = process.env.PASSWORD_RESET_DELIVERY_OVERRIDE?.trim();
    if (envOverride) {
      this.forcedRecipient = envOverride;
    } else if (process.env.NODE_ENV !== 'production') {
      this.forcedRecipient = 'haroldrios2603@gmail.com';
    }
  }

  async sendRecoveryCode(
    email: string,
    code: string,
    expirationMinutes: number,
  ): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      const deliveryAddress = this.forcedRecipient || email;
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: deliveryAddress,
        subject: 'RM Parking - Codigo de recuperacion',
        text: `Tu codigo de recuperacion es: ${code}. Este codigo vence en ${expirationMinutes} minutos. Correo solicitado: ${email}.`,
        html: `<p>Tu codigo de recuperacion es: <strong>${code}</strong>.</p><p>Este codigo vence en ${expirationMinutes} minutos.</p><p>Correo solicitado: <strong>${email}</strong>.</p>`,
      });
      return true;
    } catch (error) {
      this.logger.warn(
        `No fue posible enviar el correo de recuperacion a ${email}: ${(error as Error).message}`,
      );
      return false;
    }
  }

  private createTransporter(): Transporter | null {
    const host = process.env.SMTP_HOST;
    const portRaw = process.env.SMTP_PORT;

    if (!host || !portRaw) {
      return null;
    }

    const port = Number(portRaw);
    if (!Number.isFinite(port) || port <= 0) {
      this.logger.warn('SMTP_PORT invalido. Se omite envio de correo.');
      return null;
    }

    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
  }
}
