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

    const { ipAddress, email } = await req.json()

    if (!ipAddress) {
      throw new Error('Dirección IP requerida')
    }

    // Verificar registros existentes desde esta IP
    const { data: existingRegistrations, error: regError } = await supabaseClient
      .from('ip_registrations')
      .select('*')
      .eq('ip_address', ipAddress)
      .eq('is_verified', true)

    if (regError) {
      throw regError
    }

    // Permitir máximo 1 cuenta verificada por IP
    const MAX_ACCOUNTS_PER_IP = 1
    
    if (existingRegistrations && existingRegistrations.length >= MAX_ACCOUNTS_PER_IP) {
      // Verificar si el email ya está registrado desde esta IP
      const emailExists = existingRegistrations.some(reg => reg.email_used === email)
      
      if (!emailExists) {
        return new Response(
          JSON.stringify({ 
            allowed: false,
            message: 'Ya existe una cuenta verificada registrada desde esta dirección IP. Solo se permite una cuenta gratuita por dirección IP.',
            existingAccounts: existingRegistrations.length,
            maxAllowed: MAX_ACCOUNTS_PER_IP
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 429, // Too Many Requests
          }
        )
      }
    }

    // Verificar si el email ya está registrado desde otra IP (prevenir registros múltiples)
    const { data: emailRegistrations, error: emailError } = await supabaseClient
      .from('ip_registrations')
      .select('*')
      .eq('email_used', email)
      .eq('is_verified', true)

    if (emailError) {
      throw emailError
    }

    if (emailRegistrations && emailRegistrations.length > 0) {
      const existingReg = emailRegistrations[0]
      if (existingReg.ip_address !== ipAddress) {
        return new Response(
          JSON.stringify({ 
            allowed: false,
            message: 'Este email ya está registrado y verificado desde otra dirección IP.',
            reason: 'email_already_exists'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 409, // Conflict
          }
        )
      }
    }

    return new Response(
      JSON.stringify({ 
        allowed: true,
        message: 'Registro permitido',
        existingAccounts: existingRegistrations ? existingRegistrations.length : 0,
        maxAllowed: MAX_ACCOUNTS_PER_IP
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error verificando IP:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})