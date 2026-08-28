import { createHmac } from 'crypto';
import { WompiValidatorService } from './wompi.validator';

describe('WompiValidatorService', () => {
  const originalSecret = process.env.WOMPI_INTEGRITY_SECRET;

  beforeEach(() => {
    process.env.WOMPI_INTEGRITY_SECRET = 'test-secret-1234567890';
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.WOMPI_INTEGRITY_SECRET;
      return;
    }
    process.env.WOMPI_INTEGRITY_SECRET = originalSecret;
  });

  it('acepta una firma válida del webhook', () => {
    const payload = { event: 'transaction.updated', data: { transaction: { id: 'abc-123', status: 'APPROVED' } } };
    const signature = createHmac('sha256', process.env.WOMPI_INTEGRITY_SECRET!)
      .update(JSON.stringify(payload))
      .digest('hex');

    const service = new WompiValidatorService();

    expect(service.validateWebhookSignature(payload, signature)).toBe(true);
  });

  it('rechaza una firma inválida del webhook', () => {
    const payload = { event: 'transaction.updated', data: { transaction: { id: 'abc-123', status: 'APPROVED' } } };

    const service = new WompiValidatorService();

    expect(service.validateWebhookSignature(payload, 'invalid-signature')).toBe(false);
  });
});
