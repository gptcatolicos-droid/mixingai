import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const { orderID, userId } = await req.json()

    if (!orderID || !userId) {
      return new Response(
        JSON.stringify({ error: 'OrderID and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get PayPal credentials
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

    // 2. Capture the order
    const captureResponse = await fetch(`${baseURL}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': `capture_${orderID}_${Date.now()}`,
      }
    })

    if (!captureResponse.ok) {
      const errorText = await captureResponse.text()
      console.error('PayPal capture error:', errorText)
      throw new Error('Failed to capture PayPal payment')
    }

    const captureData = await captureResponse.json()
    console.log('💰 PayPal capture response:', captureData)

    // Check if payment was completed
    if (captureData.status === 'COMPLETED') {
      const purchase_unit = captureData.purchase_units[0]
      const capture = purchase_unit.payments.captures[0]
      
      const amount = parseFloat(capture.amount.value)
      const currency = capture.amount.currency_code
      const paymentId = capture.id
      const customId = purchase_unit.custom_id || userId

      // Calculate credits based on amount
      let credits = 0
      if (amount >= 3.99 && amount < 10) credits = 5000
      else if (amount >= 10 && amount < 25) credits = 12000
      else if (amount >= 25 && amount < 50) credits = 30000
      else if (amount >= 50) credits = 75000

      // Check if payment already processed
      const { data: existingPayment } = await supabaseClient
        .from('payment_history')
        .select('*')
        .eq('payment_id', paymentId)
        .single()

      if (!existingPayment) {
        // Record payment
        const { error: paymentError } = await supabaseClient
          .from('payment_history')
          .insert([
            {
              user_id: customId,
              payment_id: paymentId,
              amount: amount,
              currency: currency,
              status: 'completed',
              payment_method: 'paypal',
              provider: 'paypal_sdk',
              description: `Compra de ${credits.toLocaleString()} créditos`,
              credits_purchased: credits,
              metadata: {
                paypal_capture: captureData,
                order_id: orderID
              }
            }
          ])

        if (paymentError) {
          console.error('Error saving payment:', paymentError)
          throw paymentError
        }

        // Update user credits
        const { error: creditsError } = await supabaseClient
          .from('users')
          .update({ 
            credits: supabaseClient.raw(`credits + ${credits}`),
            total_spent: supabaseClient.raw(`COALESCE(total_spent, 0) + ${amount}`)
          })
          .eq('id', customId)

        if (creditsError) {
          console.error('Error updating credits:', creditsError)
          throw creditsError
        }

        // Create success notification
        await supabaseClient
          .from('notifications')
          .insert([
            {
              user_id: customId,
              title: '🎉 Pago Completado',
              message: `¡Tu pago de $${amount} ${currency} fue procesado exitosamente! Se han añadido ${credits.toLocaleString()} créditos a tu cuenta.`,
              type: 'success',
              metadata: {
                payment_id: paymentId,
                credits_added: credits,
                amount: amount
              }
            }
          ])

        console.log(`✅ Payment captured for user ${customId}: +${credits} credits`)

        return new Response(
          JSON.stringify({
            status: 'success',
            paymentId: paymentId,
            creditsAdded: credits,
            message: `¡Pago completado! Se han añadido ${credits.toLocaleString()} créditos a tu cuenta.`
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )

      } else {
        console.log(`⚠️  Payment ${paymentId} already processed`)
        return new Response(
          JSON.stringify({
            status: 'already_processed',
            message: 'Este pago ya fue procesado anteriormente.'
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

    } else {
      // Payment not completed
      console.log(`❌ Payment not completed. Status: ${captureData.status}`)
      
      return new Response(
        JSON.stringify({
          status: 'failed',
          message: 'El pago no pudo ser completado.',
          paypalStatus: captureData.status
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('❌ Capture order error:', error)
    
    return new Response(
      JSON.stringify({
        status: 'error',
        error: error.message || 'Internal server error',
        message: 'Error al procesar el pago. Inténtalo nuevamente.'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})