import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user from JWT
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader)
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const { method } = req
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)

    // GET /manage-mixes - Get user's mixes
    if (method === 'GET') {
      const { data: mixes, error } = await supabaseClient
        .from('mixes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Error fetching mixes: ${error.message}`)
      }

      return new Response(
        JSON.stringify({ mixes }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // POST /manage-mixes - Check if mix exists or create new mix
    if (method === 'POST') {
      const { action, mixName, format, fileBlob } = await req.json()

      if (action === 'check_mix') {
        // Check if mix with this name already exists
        const { data: existingMix, error } = await supabaseClient
          .from('mixes')
          .select('*')
          .eq('user_id', user.id)
          .eq('name', mixName)
          .single()

        if (error && error.code !== 'PGRST116') {
          throw new Error(`Error checking mix: ${error.message}`)
        }

        return new Response(
          JSON.stringify({ 
            exists: !!existingMix,
            mix: existingMix || null
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      if (action === 'save_mix') {
        // Get current user credits
        const { data: userData, error: userError } = await supabaseClient
          .from('users')
          .select('credits')
          .eq('id', user.id)
          .single()

        if (userError) {
          throw new Error(`Error fetching user: ${userError.message}`)
        }

        // Check if user has enough credits
        if (userData.credits < 500) {
          return new Response(
            JSON.stringify({ 
              error: 'Insufficient credits',
              needed: 500,
              current: userData.credits
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        // Simulate file upload to storage (en producción sería Supabase Storage)
        const fileName = `${user.id}/${mixName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${format}.zip`
        const fileUrl = `https://mixingmusic.ai/downloads/${fileName}`

        // Save mix to database
        const { data: mix, error: mixError } = await supabaseClient
          .from('mixes')
          .insert({
            user_id: user.id,
            name: mixName,
            file_url: fileUrl,
            format: format,
            credits_charged: true
          })
          .select()
          .single()

        if (mixError) {
          throw new Error(`Error saving mix: ${mixError.message}`)
        }

        // Deduct credits from user
        const { error: creditError } = await supabaseClient
          .from('users')
          .update({ credits: userData.credits - 500 })
          .eq('id', user.id)

        if (creditError) {
          throw new Error(`Error updating credits: ${creditError.message}`)
        }

        console.log('✅ Mix saved successfully:', {
          mixId: mix.id,
          userId: user.id,
          mixName,
          format,
          creditsDeducted: 500,
          remainingCredits: userData.credits - 500
        })

        return new Response(
          JSON.stringify({ 
            success: true,
            mix,
            creditsDeducted: 500,
            remainingCredits: userData.credits - 500
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // GET /manage-mixes/{mixId}/download - Download existing mix
    if (method === 'GET' && pathParts.length === 2 && pathParts[1] === 'download') {
      const mixId = url.searchParams.get('mixId')
      
      if (!mixId) {
        throw new Error('Mix ID required')
      }

      const { data: mix, error } = await supabaseClient
        .from('mixes')
        .select('*')
        .eq('id', mixId)
        .eq('user_id', user.id)
        .single()

      if (error) {
        throw new Error(`Mix not found: ${error.message}`)
      }

      console.log('✅ Mix download requested:', {
        mixId: mix.id,
        userId: user.id,
        mixName: mix.name,
        format: mix.format,
        creditsCharged: false
      })

      return new Response(
        JSON.stringify({ 
          success: true,
          downloadUrl: mix.file_url,
          mix
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Manage mixes error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})