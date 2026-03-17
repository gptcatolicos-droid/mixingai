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

    const webhookData = await req.json()
    
    // Handle PayPal webhook
    if (webhookData.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const payment = webhookData.resource
      const userId = payment.custom_id // User ID passed during payment creation
      
      // Calculate credits based on amount
      const amount = parseFloat(payment.amount.value)
      let credits = 0
      
      if (amount >= 3.99 && amount < 10) credits = 5000
      else if (amount >= 10 && amount < 25) credits = 12000
      else if (amount >= 25 && amount < 50) credits = 30000
      else if (amount >= 50) credits = 75000

      // Record payment
      const { error: paymentError } = await supabaseClient
        .from('payment_history')
        .insert([
          {
            user_id: userId,
            payment_id: payment.id,
            amount: amount,
            currency: payment.amount.currency_code,
            status: 'completed',
            payment_method: 'paypal',
            provider: 'paypal',
            description: `Compra de ${credits.toLocaleString()} créditos`,
            credits_purchased: credits,
            metadata: {
              paypal_data: payment,
              webhook_event: webhookData.event_type
            }
          }
        ])

      if (paymentError) {
        throw paymentError
      }

      // Update user credits
      const { error: creditsError } = await supabaseClient
        .from('users')
        .update({ 
          credits: supabaseClient.raw(`credits + ${credits}`),
          total_spent: supabaseClient.raw(`total_spent + ${amount}`)
        })
        .eq('id', userId)

      if (creditsError) {
        throw creditsError
      }

      // Create success notification
      await supabaseClient
        .from('notifications')
        .insert([
          {
            user_id: userId,
            title: '🎉 Pago Completado',
            message: `¡Tu pago de $${amount} USD fue procesado exitosamente! Se han añadido ${credits.toLocaleString()} créditos a tu cuenta.`,
            type: 'success',
            metadata: {
              payment_id: payment.id,
              credits_added: credits,
              amount: amount
            }
          }
        ])

      // ENVIAR EMAIL CRÍTICO A SOPORTE
      await sendSupportEmail({
        to: 'soporte@mixingmusic.co',
        subject: '[CRÍTICO] Pago PayPal Completado - MixingMusic.AI',
        body: `
PAGO COMPLETADO EXITOSAMENTE:

Usuario ID: ${userId}
Payment ID: ${payment.id}
Monto: $${amount} ${payment.amount.currency_code}
Créditos añadidos: ${credits.toLocaleString()}
Método: PayPal
Timestamp: ${new Date().toISOString()}

Datos del pago:
${JSON.stringify(payment, null, 2)}
        `
      })

      console.log(`Payment completed for user ${userId}: +${credits} credits`)

    } else if (webhookData.event_type === 'PAYMENT.CAPTURE.DENIED') {
      const payment = webhookData.resource
      const userId = payment.custom_id

      // Record failed payment
      await supabaseClient
        .from('payment_history')
        .insert([
          {
            user_id: userId,
            payment_id: payment.id,
            amount: parseFloat(payment.amount.value),
            currency: payment.amount.currency_code,
            status: 'failed',
            payment_method: 'paypal',
            provider: 'paypal',
            description: 'Pago rechazado',
            credits_purchased: 0,
            metadata: {
              paypal_data: payment,
              webhook_event: webhookData.event_type
            }
          }
        ])

      // Create failure notification
      await supabaseClient
        .from('notifications')
        .insert([
          {
            user_id: userId,
            title: '❌ Pago Rechazado',
            message: 'Tu pago fue rechazado. Por favor, verifica tu método de pago e inténtalo nuevamente.',
            type: 'error',
            metadata: {
              payment_id: payment.id,
              reason: 'payment_denied'
            }
          }
        ])

      // ENVIAR EMAIL DE PAGO FALLIDO A SOPORTE
      await sendSupportEmail({
        to: 'soporte@mixingmusic.co',
        subject: '[ALERTA] Pago PayPal Rechazado - MixingMusic.AI',
        body: `
PAGO RECHAZADO:

Usuario ID: ${userId}
Payment ID: ${payment.id}
Monto: $${payment.amount.value} ${payment.amount.currency_code}
Método: PayPal
Timestamp: ${new Date().toISOString()}

Revisar y contactar al usuario si es necesario.
        `
      })

      console.log(`Payment denied for user ${userId}`)
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    
    // ENVIAR EMAIL DE ERROR CRÍTICO A SOPORTE
    await sendSupportEmail({
      to: 'soporte@mixingmusic.co',
      subject: '[ERROR CRÍTICO] Webhook PayPal Falló - MixingMusic.AI',
      body: `
ERROR EN WEBHOOK DE PAYPAL:

Error: ${error.message}
Stack: ${error.stack}
Timestamp: ${new Date().toISOString()}

REQUIERE ATENCIÓN INMEDIATA - El sistema de pagos puede estar fallando.
      `
    })
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// FUNCIÓN CRÍTICA para enviar emails a soporte
async function sendSupportEmail(emailData: { to: string, subject: string, body: string }) {
  try {
    // En producción, aquí iría la integración real con un servicio de email
    // Por ahora, solo log para debug
    console.log('📧 EMAIL CRÍTICO PARA SOPORTE:', emailData)
    
    // Ejemplo de integración con servicio de email:
    // await fetch('https://api.emailservice.com/send', {
    //   method: 'POST',
    //   headers: { 'Authorization': 'Bearer API_KEY' },
    //   body: JSON.stringify(emailData)
    // })
    
  } catch (error) {
    console.error('Error enviando email a soporte:', error)
    // No bloquear el webhook por error de email
  }
}