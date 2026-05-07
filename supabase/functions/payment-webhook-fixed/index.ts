import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Manejar tanto webhooks JSON como form-data de PayPal
    let webhookData: any = {}
    const contentType = req.headers.get('content-type') || ''
    
    if (contentType.includes('application/json')) {
      webhookData = await req.json()
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      // PayPal IPN usa form-data
      const formData = await req.formData()
      webhookData = {}
      for (const [key, value] of formData.entries()) {
        webhookData[key] = value
      }
    } else {
      const text = await req.text()
      console.log('Raw webhook data:', text)
      // Intentar parsear como query string
      const params = new URLSearchParams(text)
      for (const [key, value] of params.entries()) {
        webhookData[key] = value
      }
    }

    console.log('Webhook data received:', webhookData)

    // MANEJAR PAYPAL IPN (Instant Payment Notification)
    if (webhookData.payment_status) {
      const paymentStatus = webhookData.payment_status
      const userId = webhookData.custom // ID del usuario
      const amount = parseFloat(webhookData.mc_gross || '0')
      const currency = webhookData.mc_currency || 'USD'
      const paymentId = webhookData.txn_id
      const itemName = webhookData.item_name || 'Créditos MixingMusic.ai'

      if (paymentStatus === 'Completed') {
        // PAGO COMPLETADO EXITOSAMENTE
        
        // Calcular créditos basado en el monto
        let credits = 0
        if (amount >= 3.99 && amount < 10) credits = 5000
        else if (amount >= 10 && amount < 25) credits = 12000
        else if (amount >= 25 && amount < 50) credits = 30000
        else if (amount >= 50) credits = 75000

        // Verificar si el pago ya fue procesado
        const { data: existingPayment } = await supabaseClient
          .from('payment_history')
          .select('*')
          .eq('payment_id', paymentId)
          .single()

        if (!existingPayment) {
          // Registrar el pago
          const { error: paymentError } = await supabaseClient
            .from('payment_history')
            .insert([
              {
                user_id: userId,
                payment_id: paymentId,
                amount: amount,
                currency: currency,
                status: 'completed',
                payment_method: 'paypal',
                provider: 'paypal',
                description: `Compra de ${credits.toLocaleString()} créditos`,
                credits_purchased: credits,
                metadata: {
                  paypal_ipn: webhookData,
                  item_name: itemName
                }
              }
            ])

          if (paymentError) {
            console.error('Error saving payment:', paymentError)
            throw paymentError
          }

          // Actualizar créditos del usuario
          const { error: creditsError } = await supabaseClient
            .from('users')
            .update({ 
              credits: supabaseClient.raw(`credits + ${credits}`),
              total_spent: supabaseClient.raw(`COALESCE(total_spent, 0) + ${amount}`)
            })
            .eq('id', userId)

          if (creditsError) {
            console.error('Error updating credits:', creditsError)
            throw creditsError
          }

          // Crear notificación de éxito
          await supabaseClient
            .from('notifications')
            .insert([
              {
                user_id: userId,
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

          console.log(`✅ Payment completed for user ${userId}: +${credits} credits`)

          // Log crítico para soporte
          console.log('🔔 PAGO COMPLETADO:', {
            userId,
            paymentId,
            amount,
            currency,
            credits,
            timestamp: new Date().toISOString()
          })

        } else {
          console.log(`⚠️  Payment ${paymentId} already processed`)
        }

      } else if (paymentStatus === 'Failed' || paymentStatus === 'Denied' || paymentStatus === 'Canceled_Reversal') {
        // PAGO FALLIDO
        
        // Registrar pago fallido
        await supabaseClient
          .from('payment_history')
          .insert([
            {
              user_id: userId,
              payment_id: paymentId,
              amount: amount,
              currency: currency,
              status: 'failed',
              payment_method: 'paypal',
              provider: 'paypal',
              description: `Pago fallido: ${paymentStatus}`,
              credits_purchased: 0,
              metadata: {
                paypal_ipn: webhookData,
                failure_reason: paymentStatus
              }
            }
          ])

        // Crear notificación de fallo
        await supabaseClient
          .from('notifications')
          .insert([
            {
              user_id: userId,
              title: '❌ Pago Fallido',
              message: `Tu pago fue ${paymentStatus.toLowerCase()}. Por favor, verifica tu método de pago e inténtalo nuevamente.`,
              type: 'error',
              metadata: {
                payment_id: paymentId,
                failure_reason: paymentStatus
              }
            }
          ])

        console.log(`❌ Payment failed for user ${userId}: ${paymentStatus}`)
      }

    } else if (webhookData.event_type) {
      // MANEJAR WEBHOOKS JSON DE PAYPAL (si los usas también)
      if (webhookData.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
        const payment = webhookData.resource
        const userId = payment.custom_id
        const amount = parseFloat(payment.amount.value)
        
        let credits = 0
        if (amount >= 3.99 && amount < 10) credits = 5000
        else if (amount >= 10 && amount < 25) credits = 12000
        else if (amount >= 25 && amount < 50) credits = 30000
        else if (amount >= 50) credits = 75000

        // Similar logic as above...
        console.log(`JSON Webhook - Payment completed for user ${userId}: +${credits} credits`)
      }
    }

    return new Response('OK', {
      headers: corsHeaders,
      status: 200,
    })

  } catch (error) {
    console.error('❌ Webhook error:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})