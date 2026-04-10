import { useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { useParams } from 'react-router-dom';
import { paymentsService } from '../services/payments.service';
import type {
  PublicPaymentMethod,
  PublicPaymentResponse,
} from '../services/payments.service';

type MessageState = {
  text: string;
  type: 'success' | 'error' | '';
};

type ApiErrorResponse = {
  message?: string;
};

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

const methodLabels: Record<PublicPaymentMethod, string> = {
  NEQUI: 'Nequi',
  CARD: 'Tarjeta de crédito',
  BANK_ACCOUNT: 'Cuenta bancaria (PSE)',
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.message ?? fallback;
  }
  return fallback;
};

const PaymentCheckoutPage = () => {
  const { paymentId } = useParams<{ paymentId: string }>();
  const [payment, setPayment] = useState<PublicPaymentResponse | null>(null);
  const [method, setMethod] = useState<PublicPaymentMethod>('NEQUI');
  const [customerEmail, setCustomerEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [message, setMessage] = useState<MessageState>({ text: '', type: '' });

  const isPaid = useMemo(() => payment?.status === 'COMPLETED', [payment?.status]);

  useEffect(() => {
    let isMounted = true;

    const fetchPayment = async () => {
      if (!paymentId) {
        setMessage({ text: 'No se recibió un identificador de pago válido.', type: 'error' });
        setLoading(false);
        return;
      }

      try {
        const data = await paymentsService.getPublicPayment(paymentId);
        if (!isMounted) {
          return;
        }

        setPayment(data);
        if (data.availableMethods.includes('NEQUI')) {
          setMethod('NEQUI');
        } else if (data.availableMethods.length > 0) {
          setMethod(data.availableMethods[0]);
        }
      } catch (error: unknown) {
        if (isMounted) {
          setMessage({
            text: getErrorMessage(error, 'No fue posible consultar este pago.'),
            type: 'error',
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchPayment();

    const poll = window.setInterval(() => {
      if (!paymentId) return;
      void paymentsService
        .getPublicPayment(paymentId)
        .then((data) => {
          if (isMounted) {
            setPayment(data);
          }
        })
        .catch(() => {
          // Polling silencioso para no degradar UX en caídas temporales.
        });
    }, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(poll);
    };
  }, [paymentId]);

  const handleStartCheckout = async () => {
    if (!paymentId) {
      return;
    }

    setMessage({ text: '', type: '' });
    setRedirecting(true);

    try {
      const checkout = await paymentsService.createPublicCheckout(paymentId, {
        method,
        customerEmail: customerEmail || undefined,
      });
      window.location.href = checkout.checkoutUrl;
    } catch (error: unknown) {
      setMessage({
        text: getErrorMessage(error, 'No se pudo iniciar el pago en Wompi.'),
        type: 'error',
      });
      setRedirecting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">RM Parking</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Pago por QR</h1>
        <p className="mt-2 text-sm text-slate-500">
          Selecciona el método de pago y continúa a la pasarela segura de Wompi Sandbox.
        </p>

        {loading && <p className="mt-6 text-sm text-slate-500">Cargando información del pago...</p>}

        {!loading && payment && (
          <div className="mt-6 space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Referencia</p>
              <p className="font-semibold text-slate-900">{payment.reference}</p>
              <p className="mt-3 text-xs text-slate-500">Valor</p>
              <p className="text-2xl font-semibold text-slate-900">
                {currencyFormatter.format(payment.amount)}
              </p>
              <p className="mt-3 text-xs text-slate-500">Estado actual</p>
              <p className="font-semibold text-slate-900">{payment.status}</p>
            </div>

            {isPaid ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900">
                Pago confirmado exitosamente. Ya puedes cerrar esta pantalla.
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-800">Método de pago</p>
                  {payment.availableMethods.map((option) => (
                    <label
                      key={option}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700"
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={option}
                        checked={method === option}
                        onChange={() => setMethod(option)}
                      />
                      <span>{methodLabels[option]}</span>
                    </label>
                  ))}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Email (opcional)</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    placeholder="cliente@correo.com"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void handleStartCheckout()}
                  disabled={redirecting}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {redirecting ? 'Redirigiendo a Wompi...' : 'Continuar con Wompi'}
                </button>
              </>
            )}
          </div>
        )}

        {message.text && (
          <div
            className={`mt-5 rounded-xl border p-3 text-sm ${{
              success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
              error: 'border-rose-200 bg-rose-50 text-rose-900',
              '': 'border-slate-200 bg-slate-50 text-slate-700',
            }[message.type]}`}
          >
            {message.text}
          </div>
        )}
      </div>
    </main>
  );
};

export default PaymentCheckoutPage;
