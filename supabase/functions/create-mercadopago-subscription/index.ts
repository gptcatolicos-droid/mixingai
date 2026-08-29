import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Allow all origins — Supabase Edge Functions handle auth via apikey header
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    if (!supabaseUrl || !anonKey || !token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } })
    }
    const auth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    })
    const { data: authData, error: authError } = await auth.auth.getUser(token)
    if (authError || !authData.user?.email) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } })
    }
    const userId = authData.user.id
    const userEmail = authData.user.email

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!serviceRoleKey) throw new Error('PAYMENT_PROVIDER_NOT_CONFIGURED')
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const { data: entitlement, error: entitlementError } = await admin
      .from('mastering_entitlements')
      .select('tier')
      .eq('user_id', userId)
      .maybeSingle()
    if (entitlementError) throw entitlementError
    if (entitlement?.tier === 'unlimited') {
      return new Response(JSON.stringify({ error: 'ALREADY_UNLIMITED' }), { status: 409, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const MP_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') ?? ''
    if (!MP_TOKEN) throw new Error('MERCADOPAGO_ACCESS_TOKEN no configurado en Supabase secrets')
    const unitPrice = 49900

    const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `mixing-${userId}-${Date.now()}`,
      },
      body: JSON.stringify({
        items: [{
          id: 'mixingmusic_v3_unlimited',
          title: 'MixingMusic.AI — Unlimited para siempre',
          description: 'Pago único: mezclas, mastering y modo álbum ilimitados',
          quantity: 1,
          unit_price: unitPrice,
          currency_id: 'COP',
        }],
        payer: { email: userEmail },
        external_reference: userId,
        back_urls: {
          success: 'https://mixingmusic.ai/payment-confirmation?status=success&provider=mp',
          failure: 'https://mixingmusic.ai/payment-confirmation?status=failed&provider=mp',
          pending: 'https://mixingmusic.ai/payment-confirmation?status=pending&provider=mp',
        },
        auto_return: 'approved',
        notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
        metadata: { product_id: 'mixingmusic_v3_unlimited', user_id: userId },
        statement_descriptor: 'MIXINGMUSIC',
        expires: false,
      })
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.message || data.error || JSON.stringify(data))

    const { error: orderError } = await admin.from('mastering_orders').upsert({
      order_id: String(data.id),
      user_id: userId,
      provider: 'mercadopago',
      amount: unitPrice,
      currency: 'COP',
      status: 'created',
      provider_payload: { preference_id: data.id },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'order_id' })
    if (orderError) throw orderError

    return new Response(
      JSON.stringify({
        init_point: data.init_point,
        sandbox_init_point: data.sandbox_init_point,
        preference_id: data.id,
        amount: unitPrice,
        currency: 'COP',
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  } catch (e: any) {
    console.error('MP Preference error:', e.message)
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }
})
