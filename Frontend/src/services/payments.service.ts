/**
 * Servicio que contiene la lógica de negocio para services.
 */
import api from '../api';

/**
 * Tipo PublicPaymentMethod para definir la estructura de datos utilizada en services.
 */
/**
 * Tipo PublicPaymentMethod para definir la estructura de datos utilizada en services.
 */
/**
 * Tipo PublicPaymentMethod para definir la estructura de datos utilizada en services.
 */
export type PublicPaymentMethod = 'NEQUI' | 'CARD' | 'BANK_ACCOUNT';

/**
 * Tipo ExitPaymentIntentResponse para definir la estructura de datos utilizada en services.
 */
/**
 * Tipo ExitPaymentIntentResponse para definir la estructura de datos utilizada en services.
 */
/**
 * Tipo ExitPaymentIntentResponse para definir la estructura de datos utilizada en services.
 */
export type ExitPaymentIntentResponse = {
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
  expiresAt: string;
  paymentPageUrl: string;
  qrImageUrl: string;
};

/**
 * Tipo PublicPaymentResponse para definir la estructura de datos utilizada en services.
 */
/**
 * Tipo PublicPaymentResponse para definir la estructura de datos utilizada en services.
 */
/**
 * Tipo PublicPaymentResponse para definir la estructura de datos utilizada en services.
 */
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

/**
 * Tipo PublicCheckoutResponse para definir la estructura de datos utilizada en services.
 */
/**
 * Tipo PublicCheckoutResponse para definir la estructura de datos utilizada en services.
 */
/**
 * Tipo PublicCheckoutResponse para definir la estructura de datos utilizada en services.
 */
export type PublicCheckoutResponse = {
  paymentId: string;
  checkoutUrl: string;
};

/**
 * Tipo ExitCashPaymentResponse para definir la estructura de datos utilizada en services.
 */
/**
 * Tipo ExitCashPaymentResponse para definir la estructura de datos utilizada en services.
 */
/**
 * Tipo ExitCashPaymentResponse para definir la estructura de datos utilizada en services.
 */
export type ExitCashPaymentResponse = {
  paymentId: string;
  amount: number;
  method: string;
  status: string;
  message: string;
};

/**
 * Constante paymentsService utilizada en la configuración o la lógica de services.
 */
/**
 * Constante paymentsService utilizada en la configuración o la lógica de services.
 */
/**
 * Constante paymentsService utilizada en la configuración o la lógica de services.
 */
export const paymentsService = {
  async createExitWompiIntent(exitId: string) {
    const { data } = await api.post<ExitPaymentIntentResponse>(
      `/payments/wompi/exit/${exitId}/intent`,
      {},
    );
    return data;
  },

  async registerExitCashPayment(exitId: string) {
    const { data } = await api.post<ExitCashPaymentResponse>(
      `/payments/exit/${exitId}/cash`,
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
