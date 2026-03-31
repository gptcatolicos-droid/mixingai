import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')??'', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'')
    const body = await req.json()
    const MP_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') ?? ''
    if (body.type === 'payment' && body.data?.id) {
      const r = await fetch(`https://api.mercadopago.com/v1/payments/${body.data.id}`, { headers: { 'Authorization': `Bearer ${MP_TOKEN}` } })
      const payment = await r.json()
      if (payment.status === 'approved') {
        const userId = payment.external_reference
        await supabase.rpc('activate_pro', { p_user_id: userId, p_provider: 'mercadopago', p_subscription_id: String(payment.id) })
        await supabase.from('payment_history').insert({ user_id: userId, amount: 3.99, currency: 'USD', provider: 'mercadopago', status: 'approved', payment_id: String(payment.id), created_at: new Date().toISOString() })
        // Actualizar localStorage no es posible desde backend — el cliente lo hace al volver
      }
    }
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status:500, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
