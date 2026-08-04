import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const presetIds = new Set([
  'pop', 'rock', 'hiphop', 'reggaeton', 'dance', 'clasica', 'balada', 'acustico', 'gospel',
])
const loudnessProfiles = new Set(['streaming', 'balanced', 'competitive'])

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const authorization = req.headers.get('Authorization') ?? ''
    const token = authorization.replace(/^Bearer\s+/i, '')

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !token) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    })
    const { data: authData, error: authError } = await authClient.auth.getUser(token)
    if (authError || !authData.user) return json({ error: 'Unauthorized' }, 401)

    const user = authData.user
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const { data: entitlement } = await admin
      .from('mastering_entitlements')
      .select('tier')
      .eq('user_id', user.id)
      .maybeSingle()
    const { data: adminUser } = await admin.auth.admin.getUserById(user.id)
    const metadata = adminUser?.user?.app_metadata ?? {}
    const unlimited = Boolean(
      entitlement?.tier === 'unlimited' || metadata.is_pro || metadata.plan === 'unlimited'
    )

    const body = await req.json()
    const action = body?.action

    if (action === 'entitlements') {
      const { data: freeDownload } = await admin
        .from('mastering_free_downloads')
        .select('claimed_at')
        .eq('user_id', user.id)
        .maybeSingle()
      return json({
        unlimited,
        freeMasterAvailable: unlimited || !freeDownload,
        freeMasterClaimedAt: freeDownload?.claimed_at ?? null,
      })
    }

    if (action === 'claim_free_master') {
      if (unlimited) return json({ success: true, unlimited: true })
      const { error } = await admin
        .from('mastering_free_downloads')
        .insert({ user_id: user.id })
      if (error?.code === '23505') {
        return json({ error: 'FREE_MASTER_LIMIT_REACHED' }, 409)
      }
      if (error) throw error
      return json({ success: true, unlimited: false })
    }

    if (action === 'list_configurations') {
      if (!unlimited) return json({ error: 'UNLIMITED_REQUIRED' }, 403)
      const { data, error } = await admin
        .from('mastering_configurations')
        .select('id,name,preset_id,strength,stereo,loudness,created_at,updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return json({ configurations: data ?? [] })
    }

    if (action === 'save_configuration') {
      if (!unlimited) return json({ error: 'UNLIMITED_REQUIRED' }, 403)
      const configuration = body?.configuration ?? {}
      const name = String(configuration.name ?? '').trim().slice(0, 80)
      const presetId = String(configuration.presetId ?? '')
      const strength = Number(configuration.strength)
      const stereo = Number(configuration.stereo)
      const loudness = String(configuration.loudness ?? '')

      if (
        !name || !presetIds.has(presetId) || !Number.isInteger(strength) || strength < 0 || strength > 100 ||
        !Number.isInteger(stereo) || stereo < 0 || stereo > 60 || !loudnessProfiles.has(loudness)
      ) {
        return json({ error: 'INVALID_CONFIGURATION' }, 400)
      }

      const { count } = await admin
        .from('mastering_configurations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
      if ((count ?? 0) >= 20) {
        const { data: oldest } = await admin
          .from('mastering_configurations')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit((count ?? 0) - 19)
        const ids = (oldest ?? []).map((item) => item.id)
        if (ids.length) await admin.from('mastering_configurations').delete().in('id', ids)
      }

      const { data, error } = await admin
        .from('mastering_configurations')
        .insert({
          user_id: user.id,
          name,
          preset_id: presetId,
          strength,
          stereo,
          loudness,
        })
        .select('id,name,preset_id,strength,stereo,loudness,created_at,updated_at')
        .single()
      if (error) throw error
      return json({ configuration: data }, 201)
    }

    if (action === 'delete_configuration') {
      if (!unlimited) return json({ error: 'UNLIMITED_REQUIRED' }, 403)
      const configurationId = String(body?.configurationId ?? '')
      if (!configurationId) return json({ error: 'CONFIGURATION_ID_REQUIRED' }, 400)
      const { error } = await admin
        .from('mastering_configurations')
        .delete()
        .eq('id', configurationId)
        .eq('user_id', user.id)
      if (error) throw error
      return json({ success: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (error) {
    console.error('Mastering access error:', error)
    return json({ error: 'Internal server error' }, 500)
  }
})
