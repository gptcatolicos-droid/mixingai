import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
})

const paypalBaseUrl = () => Deno.env.get('PAYPAL_ENV') === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

async function paypalToken() {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID') ?? ''
  const secret = Deno.env.get('PAYPAL_SECRET') ?? ''
  if (!clientId || !secret) throw new Error('PAYPAL_NOT_CONFIGURED')
  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${btoa(`${clientId}:${secret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!response.ok) throw new Error('PAYPAL_AUTH_FAILED')
  return (await response.json()).access_token as string
}

async function verifySignature(req: Request, event: unknown, token: string) {
  const webhookId = Deno.env.get('PAYPAL_V3_WEBHOOK_ID') ?? ''
  if (!webhookId) throw new Error('PAYPAL_WEBHOOK_NOT_CONFIGURED')
  const required = {
    transmission_id: req.headers.get('paypal-transmission-id'),
    transmission_time: req.headers.get('paypal-transmission-time'),
    cert_url: req.headers.get('paypal-cert-url'),
    auth_algo: req.headers.get('paypal-auth-algo'),
    transmission_sig: req.headers.get('paypal-transmission-sig'),
  }
  if (Object.values(required).some((value) => !value)) return false
  const response = await fetch(`${paypalBaseUrl()}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...required, webhook_id: webhookId, webhook_event: event }),
  })
  if (!response.ok) return false
  return (await response.json()).verification_status === 'SUCCESS'
}

async function getOrder(orderId: string, token: string) {
  const response = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error('PAYPAL_ORDER_LOOKUP_FAILED')
  return data
}

function completedCapture(order: any) {
  const unit = order?.purchase_units?.[0]
  const capture = unit?.payments?.captures?.find((item: any) => item?.status === 'COMPLETED')
  return { unit, capture }
}

serve(async (req) => {
  if (req.method === 'GET') return json({ service: 'mixingmusic-paypal-webhook-v3', ready: Boolean(Deno.env.get('PAYPAL_V3_WEBHOOK_ID')) })
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceKey) return json({ error: 'SERVER_NOT_CONFIGURED' }, 503)
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  let event: any
  try { event = await req.json() } catch { return json({ error: 'INVALID_JSON' }, 400) }
  if (!event?.id || !event?.event_type) return json({ error: 'INVALID_EVENT' }, 400)

  let token = ''
  try {
    token = await paypalToken()
    if (!await verifySignature(req, event, token)) return json({ error: 'INVALID_SIGNATURE' }, 401)
  } catch (error) {
    const code = error instanceof Error ? error.message : 'SIGNATURE_CHECK_FAILED'
    console.error('PayPal V3 webhook verification failed', { eventId: event.id, code })
    return json({ error: code }, code === 'PAYPAL_WEBHOOK_NOT_CONFIGURED' ? 503 : 401)
  }

  const eventType = String(event.event_type)
  const resourceId = String(event.resource?.id ?? '') || null
  const related = event.resource?.supplementary_data?.related_ids ?? {}
  const orderId = eventType.startsWith('CHECKOUT.ORDER.')
    ? resourceId
    : String(related.order_id ?? '') || null

  const { error: claimError } = await admin.from('mastering_paypal_webhook_events').insert({
    event_id: event.id,
    event_type: eventType,
    resource_id: resourceId,
    order_id: orderId,
    status: 'processing',
  })
  if (claimError?.code === '23505') return json({ received: true, duplicate: true })
  if (claimError) return json({ error: 'EVENT_CLAIM_FAILED' }, 500)

  const finishEvent = async (status: 'processed' | 'ignored' | 'failed', errorCode?: string) => {
    await admin.from('mastering_paypal_webhook_events').update({
      status,
      error_code: errorCode ?? null,
      processed_at: new Date().toISOString(),
    }).eq('event_id', event.id)
  }

  const grantUnlimited = async (userId: string, captureId: string) => {
    const now = new Date().toISOString()
    const { error: entitlementError } = await admin.from('mastering_entitlements').upsert({
      user_id: userId, tier: 'unlimited', source: 'paypal_v3_founder', granted_at: now, updated_at: now,
    }, { onConflict: 'user_id' })
    if (entitlementError) throw entitlementError
    const { error: usersError } = await admin.from('users').update({
      is_pro: true, plan: 'unlimited', subscription_status: 'active',
      subscription_id: captureId, subscription_provider: 'paypal', subscription_start: new Date().toISOString().slice(0, 10),
    }).eq('id', userId)
    if (usersError) throw usersError
    const { error: profilesError } = await admin.from('profiles').update({ is_pro: true, plan: 'unlimited' }).eq('id', userId)
    if (profilesError) throw profilesError
    const { data: authUser, error: authReadError } = await admin.auth.admin.getUserById(userId)
    if (authReadError) throw authReadError
    const { error: authError } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: { ...(authUser.user?.app_metadata ?? {}), is_pro: true, plan: 'unlimited' },
    })
    if (authError) throw authError
  }

  const finalizeOrder = async (targetOrderId: string, expectedCaptureId?: string) => {
    const { data: stored, error: storedError } = await admin.from('mastering_orders').select('*').eq('order_id', targetOrderId).single()
    if (storedError || !stored) throw new Error('ORDER_NOT_FOUND')
    const canonical = await getOrder(targetOrderId, token)
    const { unit, capture } = completedCapture(canonical)
    const amountMatches = Number(capture?.amount?.value) === Number(stored.amount)
    const currencyMatches = capture?.amount?.currency_code === stored.currency
    const captureMatches = !expectedCaptureId || capture?.id === expectedCaptureId
    const customMatches = !unit?.custom_id || unit.custom_id === stored.user_id
    const referenceMatches = !unit?.reference_id || unit.reference_id === 'MIXINGMUSIC_V3_UNLIMITED'
    if (canonical?.status !== 'COMPLETED' || !capture?.id || capture.status !== 'COMPLETED' ||
      !amountMatches || !currencyMatches || !captureMatches || !customMatches || !referenceMatches) {
      throw new Error('PAYMENT_NOT_VERIFIED')
    }
    const { error: orderError } = await admin.from('mastering_orders').update({
      status: 'captured', capture_id: capture.id,
      provider_payload: { status: canonical.status, capture_status: capture.status, verified_by: 'paypal_webhook_v3' },
      updated_at: new Date().toISOString(),
    }).eq('order_id', targetOrderId)
    if (orderError) throw orderError
    await grantUnlimited(stored.user_id, capture.id)
  }

  try {
    if (eventType === 'CHECKOUT.ORDER.APPROVED') {
      if (!orderId) throw new Error('ORDER_ID_MISSING')
      const captureResponse = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': `mixingmusic-v3-capture-${orderId}`,
        },
      })
      if (!captureResponse.ok && ![409, 422].includes(captureResponse.status)) throw new Error('PAYPAL_CAPTURE_FAILED')
      await finalizeOrder(orderId)
      await finishEvent('processed')
      return json({ received: true, action: 'captured' })
    }

    if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      if (!orderId) throw new Error('ORDER_ID_MISSING')
      await finalizeOrder(orderId, resourceId ?? undefined)
      await finishEvent('processed')
      return json({ received: true, action: 'entitled' })
    }

    if (eventType === 'PAYMENT.CAPTURE.DENIED') {
      if (orderId) await admin.from('mastering_orders').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('order_id', orderId).neq('status', 'captured')
      await finishEvent('processed')
      return json({ received: true, action: 'denied' })
    }

    if (eventType === 'PAYMENT.CAPTURE.REFUNDED') {
      const captureId = String(related.capture_id ?? '')
      if (!captureId) throw new Error('CAPTURE_ID_MISSING')
      const { data: stored, error: storedError } = await admin.from('mastering_orders').select('*').eq('capture_id', captureId).single()
      if (storedError || !stored) throw new Error('ORDER_NOT_FOUND')
      await admin.from('mastering_orders').update({ status: 'refunded', updated_at: new Date().toISOString() }).eq('order_id', stored.order_id)
      const { data: otherPaid } = await admin.from('mastering_orders').select('order_id').eq('user_id', stored.user_id).eq('status', 'captured').neq('order_id', stored.order_id).limit(1)
      const { data: entitlement } = await admin.from('mastering_entitlements').select('source').eq('user_id', stored.user_id).maybeSingle()
      if (!otherPaid?.length && entitlement?.source === 'paypal_v3_founder') {
        await admin.from('mastering_entitlements').delete().eq('user_id', stored.user_id)
        await admin.from('users').update({ is_pro: false, plan: 'free', subscription_status: 'refunded' }).eq('id', stored.user_id)
        await admin.from('profiles').update({ is_pro: false, plan: 'free' }).eq('id', stored.user_id)
        const { data: authUser } = await admin.auth.admin.getUserById(stored.user_id)
        await admin.auth.admin.updateUserById(stored.user_id, {
          app_metadata: { ...(authUser.user?.app_metadata ?? {}), is_pro: false, plan: 'free' },
        })
      }
      await finishEvent('processed')
      return json({ received: true, action: 'refunded' })
    }

    await finishEvent('ignored')
    return json({ received: true, action: 'ignored' })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'WEBHOOK_PROCESSING_FAILED'
    console.error('PayPal V3 webhook processing failed', { eventId: event.id, eventType, orderId, code })
    await finishEvent('failed', code)
    return json({ error: code }, 500)
  }
})
