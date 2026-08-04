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

export const createMasteringOrder = () => checkoutRequest<{
  orderID: string;
  amount: string;
  currency: string;
}>({ action: 'create_order' });

export const captureMasteringOrder = (orderID: string) => checkoutRequest<{
  success: true;
  unlimited: true;
}>({ action: 'capture_order', orderID });

