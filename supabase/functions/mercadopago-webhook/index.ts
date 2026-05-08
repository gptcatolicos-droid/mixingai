import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-request-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const MP_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') ?? ''

    const body = await req.json()
    console.log('MP Webhook received:', JSON.stringify(body))

    if (body.type === 'payment' && body.data?.id) {
      const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${body.data.id}`, {
        headers: { 'Authorization': `Bearer ${MP_TOKEN}` }
      })
      const payment = await paymentRes.json()
      console.log('Payment detail:', payment.status, payment.external_reference)

      if (payment.status === 'approved') {
        const userId = payment.external_reference

        // Update user as pro in Supabase (best-effort — no crash if RPC not found)
        try {
          await supabase.rpc('activate_pro', {
            p_user_id: userId,
            p_provider: 'mercadopago',
            p_subscription_id: String(payment.id)
          })
        } catch (e) {
          console.warn('activate_pro RPC not found, updating directly:', e)
          // Fallback: direct table update
          await supabase.from('users').update({ is_pro: true, plan: 'unlimited' }).eq('id', userId)
        }

        // Log payment
        await supabase.from('payment_history').upsert({
          user_id: userId,
          amount: payment.transaction_amount,
          currency: payment.currency_id,
          provider: 'mercadopago',
          status: 'approved',
          payment_id: String(payment.id),
          created_at: new Date().toISOString()
        }, { onConflict: 'payment_id' })
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    console.error('MP Webhook error:', e.message)
    // Always return 200 to MP to avoid retries
    return new Response(JSON.stringify({ ok: true, warning: e.message }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
