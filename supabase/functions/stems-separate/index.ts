import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const CREDITS_PER_SEPARATION = 3;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const endpointUrl = Deno.env.get('RUNPOD_ENDPOINT_URL');
    if (!endpointUrl) {
      return new Response(JSON.stringify({ error: 'Servidor no configurado', fallbackToClient: true }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Token inválido' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

    const { audioBase64, mimeType = 'audio/wav', quality = 'std' } = await req.json();
    if (!audioBase64) return new Response(JSON.stringify({ error: 'Se requiere audioBase64' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

    const { data: profile } = await supabase.from('profiles').select('credits, plan').eq('id', user.id).single();
    if (!profile) return new Response(JSON.stringify({ error: 'Perfil no encontrado' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

    const credits = profile.credits ?? 0;
    const isPro = profile.plan === 'unlimited';
    if (!isPro && credits < CREDITS_PER_SEPARATION) {
      return new Response(JSON.stringify({ error: 'Creditos insuficientes', creditsRemaining: credits }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const demucsUrl = endpointUrl.replace(/\/$/, '') + '/run/predict';
    const response = await fetch(demucsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fn_index: 1,
        data: [{ name: 'audio.wav', data: 'data:' + mimeType + ';base64,' + audioBase64 }, quality],
      }),
      signal: AbortSignal.timeout(300000),
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Error en servidor RunPod', fallbackToClient: true }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const result = await response.json();
    const stems = result.data;

    if (!isPro) {
      await supabase.from('profiles').update({ credits: credits - CREDITS_PER_SEPARATION }).eq('id', user.id);
    }

    return new Response(JSON.stringify({
      success: true,
      stems: {
        vocals: stems[0]?.data ?? stems[0],
        drums: stems[1]?.data ?? stems[1],
        bass: stems[2]?.data ?? stems[2],
        other: stems[3]?.data ?? stems[3],
      },
      creditsRemaining: isPro ? 999999 : credits - CREDITS_PER_SEPARATION,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('stems-separate error:', err);
    return new Response(JSON.stringify({ error: 'Error interno', fallbackToClient: true }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
