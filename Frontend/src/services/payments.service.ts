import api from '../api';

export type PublicPaymentMethod = 'NEQUI' | 'CARD' | 'BANK_ACCOUNT';

export type ExitPaymentIntentResponse = {
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
  expiresAt: string;
  paymentPageUrl: string;
  qrImageUrl: string;
};

export type PublicPaymentResponse = {
  id: string;
  amount: number;
  method: string;
  status: string;
  currency: string;
  createdAt: string;
  reference: string;
  availableMethods: PublicPaymentMethod[];
};

export type PublicCheckoutResponse = {
  paymentId: string;
  checkoutUrl: string;
};

export const paymentsService = {
  async createExitWompiIntent(exitId: string) {
    const { data } = await api.post<ExitPaymentIntentResponse>(
      `/payments/wompi/exit/${exitId}/intent`,
      {},
    );
    return data;
  },

  async getPublicPayment(paymentId: string) {
    const { data } = await api.get<PublicPaymentResponse>(
      `/payments/public/${paymentId}`,
    );
    return data;
  },

  async createPublicCheckout(
    paymentId: string,
    payload: {
      method: PublicPaymentMethod;
      customerEmail?: string;
      customerName?: string;
      phoneNumber?: string;
    },
  ) {
    const { data } = await api.post<PublicCheckoutResponse>(
      `/payments/public/${paymentId}/checkout`,
      payload,
    );
    return data;
  },
};
