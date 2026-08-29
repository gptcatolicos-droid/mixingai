import { getSecureAccessToken } from './masteringAccess';

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

async function checkoutRequest<T>(payload: Record<string, unknown>): Promise<T> {
  const accessToken = await getSecureAccessToken();
  if (!supabaseUrl || !supabaseAnonKey) throw new Error('CHECKOUT_NOT_CONFIGURED');
  const response = await fetch(`${supabaseUrl}/functions/v1/mastering-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'CHECKOUT_ERROR');
  return data as T;
}

async function mercadoPagoRequest<T>(): Promise<T> {
  const accessToken = await getSecureAccessToken();
  if (!supabaseUrl || !supabaseAnonKey) throw new Error('CHECKOUT_NOT_CONFIGURED');
  const response = await fetch(`${supabaseUrl}/functions/v1/create-mercadopago-subscription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'MERCADOPAGO_CHECKOUT_ERROR');
  return data as T;
}

export const createMasteringOrder = () => checkoutRequest<{
  orderID: string;
  amount: string;
  currency: string;
}>({ action: 'create_order' });

export const captureMasteringOrder = (orderID: string) => checkoutRequest<{
  success: true;
  unlimited: true;
}>({ action: 'capture_order', orderID });

export const createMercadoPagoOrder = () => mercadoPagoRequest<{
  init_point: string;
  preference_id: string;
  amount: number;
  currency: 'COP';
}>();

export const reportMasteringCheckoutEvent = (payload: {
  eventType: 'paypal_error' | 'paypal_cancel' | 'webview_detected';
  orderID?: string;
  errorCode?: string;
  browserContext?: string;
}) => checkoutRequest<{ received: true }>({ action: 'report_client_event', ...payload });
