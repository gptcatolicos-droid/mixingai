import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

const getPayPalBaseUrl = () => Deno.env.get('PAYPAL_ENV') === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

async function getPayPalToken() {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID') ?? ''
  const clientSecret = Deno.env.get('PAYPAL_SECRET') ?? ''
  if (!clientId || !clientSecret) throw new Error('PAYPAL_NOT_CONFIGURED')
  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!response.ok) throw new Error('PAYPAL_AUTH_FAILED')
  const data = await response.json()
  return data.access_token as string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !token) return json({ error: 'Unauthorized' }, 401)

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    })
    const { data: authData, error: authError } = await authClient.auth.getUser(token)
    if (authError || !authData.user) return json({ error: 'Unauthorized' }, 401)

    const user = authData.user
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const body = await req.json()
    const action = body?.action
    const configuredPrice = Number(Deno.env.get('MASTERING_V3_PRICE_USD') ?? '14.99')
    const price = (Number.isFinite(configuredPrice) && configuredPrice > 0 ? configuredPrice : 14.99).toFixed(2)
    const currency = 'USD'

    const grantUnlimited = async () => {
      const now = new Date().toISOString()
      const { error: entitlementError } = await admin.from('mastering_entitlements').upsert({
        user_id: user.id,
        tier: 'unlimited',
        source: 'paypal_v3_founder',
        granted_at: now,
        updated_at: now,
      }, { onConflict: 'user_id' })
      if (entitlementError) throw entitlementError
      const { error: usersError } = await admin
        .from('users')
        .update({ is_pro: true, plan: 'unlimited', subscription_status: 'active' })
        .eq('id', user.id)
      if (usersError) throw usersError
      const { error: profilesError } = await admin
        .from('profiles')
        .update({ is_pro: true, plan: 'unlimited' })
        .eq('id', user.id)
      if (profilesError) throw profilesError
      const existingAppMetadata = user.app_metadata ?? {}
      const { error: metadataError } = await admin.auth.admin.updateUserById(user.id, {
        app_metadata: { ...existingAppMetadata, is_pro: true, plan: 'unlimited' },
      })
      if (metadataError) throw metadataError
    }

    const { data: entitlement } = await admin
      .from('mastering_entitlements')
      .select('tier')
      .eq('user_id', user.id)
      .maybeSingle()
    if (action === 'create_order') {
      if (entitlement?.tier === 'unlimited') return json({ error: 'ALREADY_UNLIMITED' }, 409)
      const paypalToken = await getPayPalToken()
      const orderResponse = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paypalToken}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': `mixingmusic-v3-${user.id}-${crypto.randomUUID()}`,
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            reference_id: 'MIXINGMUSIC_V3_UNLIMITED',
            description: 'MixingMusic V3 Unlimited - acceso permanente',
            custom_id: user.id,
            amount: { currency_code: currency, value: price },
          }],
          application_context: {
            brand_name: 'MixingMusic.ai',
            landing_page: 'NO_PREFERENCE',
            user_action: 'PAY_NOW',
          },
        }),
      })
      const order = await orderResponse.json()
      if (!orderResponse.ok || !order.id) throw new Error('PAYPAL_ORDER_FAILED')

      const { error: orderError } = await admin.from('mastering_orders').insert({
        order_id: order.id,
        user_id: user.id,
        amount: price,
        currency,
        status: 'created',
        provider_payload: { status: order.status },
      })
      if (orderError) throw orderError
      return json({ orderID: order.id, amount: price, currency }, 201)
    }

    if (action === 'capture_order') {
      const orderId = String(body?.orderID ?? '')
      if (!orderId) return json({ error: 'ORDER_ID_REQUIRED' }, 400)
      const { data: storedOrder, error: storedOrderError } = await admin
        .from('mastering_orders')
        .select('*')
        .eq('order_id', orderId)
        .eq('user_id', user.id)
        .single()
      if (storedOrderError || !storedOrder) return json({ error: 'ORDER_NOT_FOUND' }, 404)
      if (storedOrder.status === 'captured') {
        await grantUnlimited()
        return json({ success: true, unlimited: true })
      }
      if (storedOrder.amount.toString() !== price || storedOrder.currency !== currency) {
        return json({ error: 'ORDER_AMOUNT_MISMATCH' }, 409)
      }

      const paypalToken = await getPayPalToken()
      const captureResponse = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paypalToken}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': `mixingmusic-v3-capture-${orderId}`,
        },
      })
      const captureData = await captureResponse.json()
      const capture = captureData?.purchase_units?.[0]?.payments?.captures?.[0]
      const capturedAmount = capture?.amount?.value
      const capturedCurrency = capture?.amount?.currency_code
      const customId = captureData?.purchase_units?.[0]?.custom_id
      if (
        !captureResponse.ok || captureData?.status !== 'COMPLETED' || !capture?.id ||
        capturedAmount !== price || capturedCurrency !== currency || customId !== user.id
      ) {
        await admin.from('mastering_orders').update({
          status: 'failed',
          provider_payload: { status: captureData?.status ?? 'unknown' },
          updated_at: new Date().toISOString(),
        }).eq('order_id', orderId)
        return json({ error: 'PAYMENT_NOT_VERIFIED' }, 400)
      }

      const { error: updateOrderError } = await admin.from('mastering_orders').update({
        status: 'captured',
        capture_id: capture.id,
        provider_payload: { status: captureData.status, capture_status: capture.status },
        updated_at: new Date().toISOString(),
      }).eq('order_id', orderId).eq('user_id', user.id)
      if (updateOrderError) throw updateOrderError

      await grantUnlimited()

      return json({ success: true, unlimited: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (error) {
    console.error('Mastering checkout error:', error)
    return json({ error: 'CHECKOUT_ERROR' }, 500)
  }
})
