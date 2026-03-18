import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const { amount, currency = 'USD', userId, itemName } = await req.json()

    if (!amount || !userId) {
      return new Response(
        JSON.stringify({ error: 'Amount and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get PayPal credentials from environment
    const clientId = Deno.env.get('PAYPAL_CLIENT_ID')
    const clientSecret = Deno.env.get('PAYPAL_SECRET')
    const environment = Deno.env.get('PAYPAL_ENV') || 'sandbox'

    if (!clientId || !clientSecret) {
      throw new Error('PayPal credentials not configured')
    }

    // PayPal API URLs
    const baseURL = environment === 'live' 
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com'

    // 1. Get access token
    const authResponse = await fetch(`${baseURL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en_US',
        'Authorization': `Basic ${btoa(clientId + ':' + clientSecret)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials'
    })

    if (!authResponse.ok) {
      const errorText = await authResponse.text()
      console.error('PayPal auth error:', errorText)
      throw new Error('Failed to authenticate with PayPal')
    }

    const authData = await authResponse.json()
    const accessToken = authData.access_token

    // 2. Create order
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: `CREDITS_${userId}_${Date.now()}`,
        description: itemName || `MixingMusic.ai - ${amount === '3.99' ? '5,000' : 'Premium'} Credits`,
        custom_id: userId,
        amount: {
          currency_code: currency,
          value: amount.toString()
        }
      }],
      application_context: {
        brand_name: 'MixingMusic.ai',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${req.headers.get('origin') || 'http://localhost:5173'}/pricing?payment=success`,
        cancel_url: `${req.headers.get('origin') || 'http://localhost:5173'}/pricing?payment=cancel`
      }
    }

    const orderResponse = await fetch(`${baseURL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': `${userId}_${Date.now()}`,
      },
      body: JSON.stringify(orderData)
    })

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text()
      console.error('PayPal order creation error:', errorText)
      throw new Error('Failed to create PayPal order')
    }

    const order = await orderResponse.json()
    
    console.log('✅ PayPal order created:', {
      orderId: order.id,
      userId,
      amount,
      timestamp: new Date().toISOString()
    })

    return new Response(
      JSON.stringify({
        orderID: order.id,
        status: 'success'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Create order error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: 'Failed to create PayPal order'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})