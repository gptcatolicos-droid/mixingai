import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-request-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, 'Content-Type': 'application/json' },
})

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const mpToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') ?? ''
    if (!supabaseUrl || !serviceRoleKey || !mpToken) throw new Error('PAYMENT_PROVIDER_NOT_CONFIGURED')

    const payload = await req.json()
    if (payload.type !== 'payment' || !payload.data?.id) return json({ ok: true, ignored: true })

    // Never trust amounts, status, or the account reference from the incoming webhook.
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(payload.data.id))}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    })
    const payment = await paymentResponse.json()
    if (!paymentResponse.ok) throw new Error('MERCADOPAGO_PAYMENT_LOOKUP_FAILED')
    if (payment.status !== 'approved') return json({ ok: true, pending: true })

    const userId = String(payment.external_reference ?? '')
    const amount = Number(payment.transaction_amount)
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      throw new Error('INVALID_EXTERNAL_REFERENCE')
    }
    if (!Number.isFinite(amount) || amount <= 0 || payment.currency_id !== 'USD') {
      throw new Error('INVALID_PAYMENT_AMOUNT')
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const { data: authResult, error: authError } = await admin.auth.admin.getUserById(userId)
    if (authError || !authResult.user) throw new Error('USER_NOT_FOUND')
    const user = authResult.user
    const now = new Date().toISOString()

    const { error: entitlementError } = await admin.from('mastering_entitlements').upsert({
      user_id: user.id,
      tier: 'unlimited',
      source: 'mercadopago_founder',
      granted_at: now,
      updated_at: now,
    }, { onConflict: 'user_id' })
    if (entitlementError) throw entitlementError

    const [usersResult, profilesResult, metadataResult, historyResult] = await Promise.all([
      admin.from('users').update({ is_pro: true, plan: 'unlimited', subscription_status: 'active', subscription_provider: 'mercadopago', subscription_id: String(payment.id) }).eq('id', user.id),
      admin.from('profiles').update({ is_pro: true, plan: 'unlimited' }).eq('id', user.id),
      admin.auth.admin.updateUserById(user.id, { app_metadata: { ...(user.app_metadata ?? {}), is_pro: true, plan: 'unlimited' } }),
      admin.from('payment_history').upsert({
        user_id: user.id,
        transaction_id: String(payment.id),
        provider_transaction_id: String(payment.id),
        amount,
        currency: payment.currency_id,
        provider: 'mercadopago',
        status: 'completed',
        credits_purchased: 999999,
        subscription_type: 'pro',
        metadata: { preference_id: payment.preference_id ?? null, payment_type: payment.payment_type_id ?? null },
      }, { onConflict: 'provider,transaction_id' }),
    ])
    if (usersResult.error || profilesResult.error || metadataResult.error || historyResult.error) {
      throw usersResult.error || profilesResult.error || metadataResult.error || historyResult.error
    }
    return json({ ok: true })
  } catch (error) {
    console.error('Mercado Pago webhook error:', error)
    // Mercado Pago retries non-2xx notifications. Returning an error preserves retry
    // behaviour rather than silently losing a verified payment.
    return json({ error: 'WEBHOOK_PROCESSING_FAILED' }, 500)
  }
})
