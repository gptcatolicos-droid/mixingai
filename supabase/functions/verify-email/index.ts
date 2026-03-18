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

    const { token, type = 'registration' } = await req.json()

    if (!token) {
      throw new Error('Token de verificación requerido')
    }

    // Buscar usuario por token
    const { data: user, error: userError } = await supabaseClient
      .from('users')
      .select('*')
      .eq('verification_token', token)
      .single()

    if (userError || !user) {
      throw new Error('Token de verificación inválido o expirado')
    }

    // Verificar que el token no haya expirado (24 horas)
    const sentAt = new Date(user.verification_sent_at)
    const now = new Date()
    const hoursDiff = (now.getTime() - sentAt.getTime()) / (1000 * 60 * 60)

    if (hoursDiff > 24) {
      throw new Error('El token de verificación ha expirado. Solicita uno nuevo.')
    }

    // Marcar email como verificado
    const updateData: any = {
      email_verified: true,
      verification_token: null,
      verification_sent_at: null
    }

    // Si es verificación de registro, otorgar 500 créditos gratis
    if (type === 'registration' && user.credits === 0) {
      updateData.credits = 500
    }

    const { error: updateError } = await supabaseClient
      .from('users')
      .update(updateData)
      .eq('id', user.id)

    if (updateError) {
      throw updateError
    }

    // Actualizar registro de IP como verificado
    await supabaseClient
      .from('ip_registrations')
      .update({ is_verified: true })
      .eq('user_id', user.id)

    // Crear notificación de bienvenida
    let notificationTitle, notificationMessage

    if (type === 'registration') {
      notificationTitle = '🎉 ¡Cuenta Verificada!'
      notificationMessage = `¡Bienvenido ${user.firstName}! Tu email ha sido verificado exitosamente. ${user.credits === 0 ? 'Se han añadido 500 créditos gratis a tu cuenta.' : ''} Ya puedes comenzar a mezclar tu música con IA.`
    } else if (type === 'subscription') {
      notificationTitle = '🚀 ¡Suscripción Activada!'
      notificationMessage = `¡Perfecto ${user.firstName}! Tu suscripción premium ha sido activada. Ahora tienes acceso a todas las funciones avanzadas de MixingMusic.ai.`
    }

    await supabaseClient
      .from('notifications')
      .insert([
        {
          user_id: user.id,
          title: notificationTitle,
          message: notificationMessage,
          type: 'success',
          metadata: {
            verification_type: type,
            credits_granted: type === 'registration' && user.credits === 0 ? 500 : 0
          }
        }
      ])

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email verificado exitosamente',
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          emailVerified: true,
          credits: type === 'registration' && user.credits === 0 ? 500 : user.credits
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error verificando email:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})