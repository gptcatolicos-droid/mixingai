import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { userId, userEmail } = await req.json()
    const MP_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') ?? ''
    const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${MP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ id:'pro_monthly', title:'MixingMusic.AI Pro — 1 mes', quantity:1, unit_price:3.99, currency_id:'USD' }],
        payer: { email: userEmail },
        external_reference: userId,
        back_urls: { success:'https://mixingmusic.ai/?payment=success', failure:'https://mixingmusic.ai/?payment=failed' },
        auto_return: 'approved',
        notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
        statement_descriptor: 'MIXINGMUSIC.AI',
      })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || JSON.stringify(data))
    return new Response(JSON.stringify({ init_point: data.init_point, sandbox_init_point: data.sandbox_init_point }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status:500, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
