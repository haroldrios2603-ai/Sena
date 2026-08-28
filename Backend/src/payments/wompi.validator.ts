import { createHmac, timingSafeEqual } from 'crypto';

export class WompiValidatorService {
  validateWebhookSignature(payload: unknown, signature: string | undefined): boolean {
    const secret = process.env.WOMPI_INTEGRITY_SECRET;

    if (!secret) {
      return false;
    }

    if (!signature || typeof signature !== 'string') {
      return false;
    }

    const expected = createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(signature.trim(), 'hex');

    if (a.length !== b.length) {
      return false;
    }

    return timingSafeEqual(a, b);
  }
}
