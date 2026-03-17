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

    const { email, firstName, lastName, userId, type = 'registration' } = await req.json()

    if (!email || !userId) {
      throw new Error('Email y userId son requeridos')
    }

    // Generar token de verificación
    const verificationToken = crypto.randomUUID()
    const verificationUrl = `${req.headers.get('origin')}/auth/verify?token=${verificationToken}&type=${type}`

    // Actualizar usuario con token
    const { error: updateError } = await supabaseClient
      .from('users')
      .update({
        verification_token: verificationToken,
        verification_sent_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      throw updateError
    }

    // Preparar contenido del email según el tipo
    let subject, htmlContent

    if (type === 'registration') {
      subject = '🎵 Confirma tu registro en MixingMusic.ai'
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #e879f9, #06b6d4); padding: 40px 20px; text-align: center; }
            .logo { color: white; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .subtitle { color: rgba(255,255,255,0.9); font-size: 16px; }
            .content { padding: 40px 30px; }
            .welcome { font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 20px; }
            .text { color: #6b7280; line-height: 1.6; margin-bottom: 30px; }
            .button { display: inline-block; background: linear-gradient(135deg, #e879f9, #06b6d4); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: bold; font-size: 16px; margin: 20px 0; }
            .credits { background: linear-gradient(135deg, #10b981, #06b6d4); padding: 20px; border-radius: 12px; margin: 20px 0; }
            .credits-title { color: white; font-weight: bold; font-size: 18px; margin-bottom: 10px; }
            .credits-text { color: rgba(255,255,255,0.9); }
            .footer { background: #f8fafc; padding: 30px; text-align: center; color: #9ca3af; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎵 MixingMusic.ai</div>
              <div class="subtitle">Mezcla tu música como un profesional</div>
            </div>
            <div class="content">
              <h1 class="welcome">¡Bienvenido ${firstName}!</h1>
              <p class="text">
                Gracias por registrarte en MixingMusic.ai. Para activar tu cuenta y recibir tus 500 créditos gratuitos, 
                necesitamos confirmar tu dirección de correo electrónico.
              </p>
              
              <div class="credits">
                <div class="credits-title">🎁 ¡500 Créditos Gratis Te Esperan!</div>
                <div class="credits-text">
                  • Perfecto para mezclar tu primera canción<br>
                  • Todas las funciones de IA incluidas<br>
                  • Exportación profesional -14 LUFS<br>
                  • Compatible con todos los formatos de audio
                </div>
              </div>

              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">
                  ✨ Confirmar Email y Activar Cuenta
                </a>
              </div>
              
              <p class="text">
                Este enlace expirará en 24 horas. Si no solicitaste esta cuenta, puedes ignorar este email.
              </p>
            </div>
            <div class="footer">
              <p>© 2024 MixingMusic.ai - Mezcla tu música con inteligencia artificial</p>
              <p>Este email fue enviado porque te registraste en nuestra plataforma.</p>
            </div>
          </div>
        </body>
        </html>
      `
    } else if (type === 'subscription') {
      subject = '🔔 Confirma tu suscripción a MixingMusic.ai'
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #fbbf24, #f59e0b); padding: 40px 20px; text-align: center; }
            .logo { color: white; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .subtitle { color: rgba(255,255,255,0.9); font-size: 16px; }
            .content { padding: 40px 30px; }
            .welcome { font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 20px; }
            .text { color: #6b7280; line-height: 1.6; margin-bottom: 30px; }
            .button { display: inline-block; background: linear-gradient(135deg, #fbbf24, #f59e0b); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: bold; font-size: 16px; margin: 20px 0; }
            .benefits { background: linear-gradient(135deg, #8b5cf6, #06b6d4); padding: 20px; border-radius: 12px; margin: 20px 0; }
            .benefits-title { color: white; font-weight: bold; font-size: 18px; margin-bottom: 10px; }
            .benefits-text { color: rgba(255,255,255,0.9); }
            .footer { background: #f8fafc; padding: 30px; text-align: center; color: #9ca3af; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎵 MixingMusic.ai</div>
              <div class="subtitle">Suscripción Premium Activada</div>
            </div>
            <div class="content">
              <h1 class="welcome">¡Confirma tu Suscripción!</h1>
              <p class="text">
                Hola ${firstName}, tu suscripción premium está lista. Solo necesitamos que confirmes tu email 
                para activar todos los beneficios de tu plan.
              </p>
              
              <div class="benefits">
                <div class="benefits-title">🚀 Beneficios de tu Suscripción:</div>
                <div class="benefits-text">
                  • Créditos ilimitados para mezclas<br>
                  • Acceso prioritario a nuevas funciones<br>
                  • Exportación en múltiples formatos<br>
                  • Soporte técnico premium 24/7
                </div>
              </div>

              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">
                  🔓 Confirmar y Activar Suscripción
                </a>
              </div>
              
              <p class="text">
                Este enlace expirará en 24 horas. Si tienes problemas, contacta nuestro soporte.
              </p>
            </div>
            <div class="footer">
              <p>© 2024 MixingMusic.ai - Tu estudio de mezclas con IA</p>
              <p>Confirma tu suscripción para disfrutar de todos los beneficios.</p>
            </div>
          </div>
        </body>
        </html>
      `
    }

    // Simular envío de email (en producción usarías un servicio como SendGrid, Resend, etc.)
    console.log(`📧 Email de verificación preparado para: ${email}`)
    console.log(`🔗 URL de verificación: ${verificationUrl}`)
    
    // En un entorno real, aquí enviarías el email:
    /*
    const emailService = new EmailService()
    await emailService.send({
      to: email,
      subject: subject,
      html: htmlContent
    })
    */

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email de verificación enviado',
        verificationUrl // Solo para desarrollo - remover en producción
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error enviando email:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})