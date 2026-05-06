import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const REPLICATE_TOKEN = Deno.env.get('REPLICATE_API_TOKEN') ?? '';
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? '';

    if (!REPLICATE_TOKEN) throw new Error('REPLICATE_API_TOKEN no configurado');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer '))
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      });

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user)
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      });

    let { data: profile } = await supabase.from('profiles').select('credits, plan').eq('id', user.id).single();
    const credits = profile?.credits ?? 0;
    const isPro = profile?.plan === 'unlimited' || ['danipalacio@gmail.com'].includes(user.email ?? '');

    if (!isPro && credits < 3)
      return new Response(JSON.stringify({ error: 'Créditos insuficientes (necesitas 3)', creditsRemaining: credits }), {
        status: 402, headers: { ...cors, 'Content-Type': 'application/json' },
      });

    const { audioUrl } = await req.json();
    if (!audioUrl) throw new Error('Se requiere audioUrl');

    // ✅ Demucs via Replicate — endpoint de modelo (sin version hash)
    const replicateResp = await fetch('https://api.replicate.com/v1/models/cjwbw/demucs/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          audio: audioUrl,
          model: 'htdemucs',
          stem: null,
          clip_mode: 'rescale',
          shifts: 1,
          overlap: 0.25,
          mp3_bitrate: 320,
          float32: false,
          output_format: 'mp3',
        },
      }),
    });

    if (!replicateResp.ok) {
      const errBody = await replicateResp.text();
      throw new Error(`Replicate ${replicateResp.status}: ${errBody}`);
    }

    const prediction = await replicateResp.json();
    const predId = prediction.id;

    // Polling máx 10 min (Demucs es más lento)
    let stems: Record<string, string> | null = null;
    for (let i = 0; i < 120; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const poll = await fetch(`https://api.replicate.com/v1/predictions/${predId}`, {
        headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}` },
      });
      const pollData = await poll.json();

      if (pollData.status === 'succeeded') {
        stems = pollData.output; // { bass, drums, vocals, other }
        break;
      }
      if (pollData.status === 'failed') throw new Error(`Demucs falló: ${pollData.error}`);
    }

    if (!stems) throw new Error('Timeout en separación de stems');

    // Descontar créditos
    if (!isPro) {
      await supabase.from('profiles').update({ credits: credits - 3 }).eq('id', user.id);
      await supabase.from('credits_ledger').insert({
        user_id: user.id, delta: -3, reason: 'stems_separation', created_at: new Date().toISOString(),
      }).catch(() => {});
    }

    return new Response(JSON.stringify({
      success: true,
      stems,
      creditsRemaining: isPro ? 999999 : credits - 3,
    }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('[stems-separate] ERROR:', err?.message ?? err);
    return new Response(JSON.stringify({ error: err?.message ?? 'Error interno' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
