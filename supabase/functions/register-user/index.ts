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

    const { user, ipAddress } = await req.json()

    if (!user || !ipAddress) {
      throw new Error('Datos de usuario e IP requeridos')
    }

    // Simplificar verificación - permitir registro sin restricciones estrictas
    const { data: existingUser, error: checkError } = await supabaseClient
      .from('users')
      .select('id, email, email_verified')
      .eq('email', user.email)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.log('Error verificando usuario existente:', checkError)
    }

    if (existingUser && existingUser.email_verified) {
      throw new Error('Este email ya está registrado y verificado')
    }

    // Si el usuario existe pero no está verificado, eliminarlo para permitir re-registro
    if (existingUser && !existingUser.email_verified) {
      await supabaseClient
        .from('users')
        .delete()
        .eq('id', existingUser.id)
    }

    // Crear nuevo usuario con UUID válido
    const { error: userError } = await supabaseClient
      .from('users')
      .insert([
        {
          id: user.id, // Ya viene como UUID válido desde el frontend
          first_name: user.firstName,
          last_name: user.lastName,
          email: user.email,
          country: user.country || 'Argentina',
          phone: user.phone || '',
          credits: 0, // Sin créditos hasta verificar
          provider: user.provider || 'email',
          username: user.username,
          email_verified: false,
          registration_ip: ipAddress,
          last_login_ip: ipAddress,
          created_at: user.createdAt
        }
      ])

    if (userError) {
      console.error('Error creando usuario:', userError)
      throw new Error('Error al crear la cuenta. Inténtalo de nuevo.')
    }

    // Registrar IP (opcional, no bloquear si falla)
    try {
      await supabaseClient
        .from('ip_registrations')
        .insert([
          {
            ip_address: ipAddress,
            user_id: user.id,
            email_used: user.email,
            is_verified: false
          }
        ])
    } catch (ipError) {
      console.log('Error registrando IP (no crítico):', ipError)
    }

    console.log(`Usuario registrado exitosamente: ${user.email}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Usuario registrado exitosamente',
        userId: user.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error registrando usuario:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})