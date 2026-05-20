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

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: user } = await supabaseClient.auth.getUser(token)

    if (!user.user) {
      throw new Error('No autorizado')
    }

    const { action, subscriptionId, reason, acceptCredits = false } = await req.json()

    const userId = user.user.id

    if (action === 'request_cancellation') {
      // Verificar si tiene suscripción activa
      const { data: subscription, error: subError } = await supabaseClient
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()

      if (subError || !subscription) {
        throw new Error('No se encontró una suscripción activa')
      }

      // Registrar solicitud de cancelación
      const { error: cancellationError } = await supabaseClient
        .from('subscription_cancellations')
        .insert([
          {
            user_id: userId,
            subscription_id: subscriptionId || subscription.id,
            cancellation_reason: reason,
            offered_credits: 500,
            credits_accepted: false
          }
        ])

      if (cancellationError) {
        throw cancellationError
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: '¡Espera! Antes de cancelar tu suscripción...',
          offer: {
            credits: 500,
            message: 'Te ofrecemos 500 créditos GRATIS para que sigas disfrutando de MixingMusic.ai sin suscripción. ¿Qué te parece?'
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )

    } else if (action === 'accept_credits') {
      // Buscar la cancelación pendiente más reciente
      const { data: cancellation, error: cancError } = await supabaseClient
        .from('subscription_cancellations')
        .select('*')
        .eq('user_id', userId)
        .eq('credits_accepted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (cancError || !cancellation) {
        throw new Error('No se encontró una solicitud de cancelación pendiente')
      }

      // Otorgar los 500 créditos
      const { error: creditsError } = await supabaseClient
        .from('users')
        .update({ 
          credits: supabaseClient.raw(`credits + 500`)
        })
        .eq('id', userId)

      if (creditsError) {
        throw creditsError
      }

      // Marcar créditos como aceptados
      await supabaseClient
        .from('subscription_cancellations')
        .update({
          credits_accepted: true,
          credits_granted_at: new Date().toISOString()
        })
        .eq('id', cancellation.id)

      // Cancelar la suscripción
      await supabaseClient
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: cancellation.cancellation_reason
        })
        .eq('user_id', userId)
        .eq('status', 'active')

      // Crear notificación
      await supabaseClient
        .from('notifications')
        .insert([
          {
            user_id: userId,
            title: '🎁 ¡500 Créditos Gratis!',
            message: '¡Gracias por quedarte con nosotros! Hemos añadido 500 créditos gratis a tu cuenta. Tu suscripción ha sido cancelada pero puedes seguir usando MixingMusic.ai.',
            type: 'success',
            metadata: {
              credits_granted: 500,
              reason: 'subscription_cancellation_retention'
            }
          }
        ])

      return new Response(
        JSON.stringify({ 
          success: true,
          message: '¡Perfecto! Tu suscripción ha sido cancelada y se han añadido 500 créditos gratis a tu cuenta.',
          creditsAdded: 500
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )

    } else if (action === 'confirm_cancellation') {
      // Cancelación definitiva sin créditos
      const { data: cancellation, error: cancError } = await supabaseClient
        .from('subscription_cancellations')
        .select('*')
        .eq('user_id', userId)
        .eq('credits_accepted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (cancError || !cancellation) {
        throw new Error('No se encontró una solicitud de cancelación pendiente')
      }

      // Cancelar la suscripción definitivamente
      await supabaseClient
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: cancellation.cancellation_reason
        })
        .eq('user_id', userId)
        .eq('status', 'active')

      // Crear notificación de despedida
      await supabaseClient
        .from('notifications')
        .insert([
          {
            user_id: userId,
            title: '👋 Suscripción Cancelada',
            message: 'Tu suscripción ha sido cancelada exitosamente. Esperamos verte de vuelta pronto. ¡Gracias por usar MixingMusic.ai!',
            type: 'info',
            metadata: {
              reason: 'subscription_cancelled_final'
            }
          }
        ])

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Tu suscripción ha sido cancelada. ¡Esperamos verte pronto!'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

  } catch (error) {
    console.error('Error procesando cancelación:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})