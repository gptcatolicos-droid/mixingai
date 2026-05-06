import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ✅ v20: Version hash actual de lucataco/ace-step (mayo 2026)
const ACESTEP_VERSION = '280fc4f9ee507577f880a167f639c02622421d8fecf492454320311217b688f1';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const REPLICATE_TOKEN = Deno.env.get('REPLICATE_API_TOKEN') ?? '';
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? '';

    if (!REPLICATE_TOKEN) throw new Error('REPLICATE_API_TOKEN no configurado en Supabase secrets');
    if (!SUPABASE_URL) throw new Error('SUPABASE_URL no configurado');
    if (!SERVICE_ROLE_KEY) throw new Error('SERVICE_ROLE_KEY no configurado');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer '))
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      });

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user)
      return new Response(JSON.stringify({ error: 'Token inválido', detail: authErr?.message }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      });

    let { data: profile } = await supabase.from('profiles').select('credits, plan').eq('id', user.id).single();
    if (!profile) {
      await supabase.from('profiles').upsert({
        id: user.id, email: user.email, credits: 10, plan: 'free',
        is_pro: false, created_at: new Date().toISOString(),
      });
      profile = { credits: 10, plan: 'free' };
    }

    const credits = profile?.credits ?? 10;
    const isPro = profile?.plan === 'unlimited' || ['danipalacio@gmail.com'].includes(user.email ?? '');

    if (!isPro && credits < 10)
      return new Response(JSON.stringify({ error: 'Créditos insuficientes', creditsRemaining: credits }), {
        status: 402, headers: { ...cors, 'Content-Type': 'application/json' },
      });

    const body = await req.json();
    const { prompt, lyrics, audioDuration = 180, bpm = 120, genres, seed = -1 } = body;
    if (!prompt)
      return new Response(JSON.stringify({ error: 'Se requiere prompt' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });

    const genreTags = genres?.length ? genres.join(', ') : '';
    const fullPrompt = genreTags ? `${genreTags}, ${prompt}` : prompt;
    const resolvedSeed = seed === -1 ? Math.floor(Math.random() * 999999) : seed;

    // ✅ FIX: Bearer (no Token), version hash actual
    const replicateResp = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: ACESTEP_VERSION,
        input: {
          tags: fullPrompt,
          lyrics: lyrics || '[verse]\nVerse lyrics here\n[chorus]\nChorus lyrics here',
          audio_duration: Math.min(Number(audioDuration), 240),
          scheduler: 'euler',
          guidance_scale: 15,
          guidance_rescale: 0.7,
          num_inference_steps: 60,
          seed: resolvedSeed,
        },
      }),
    });

    if (!replicateResp.ok) {
      const errBody = await replicateResp.text();
      throw new Error(`Replicate ${replicateResp.status}: ${errBody}`);
    }

    const prediction = await replicateResp.json();
    const predId = prediction.id;
    if (!predId) throw new Error(`Replicate no devolvió ID: ${JSON.stringify(prediction)}`);

    // Polling hasta completar (máx 7 min)
    let audioUrl: string | null = null;
    for (let i = 0; i < 84; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const poll = await fetch(`https://api.replicate.com/v1/predictions/${predId}`, {
        headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}` },
      });
      const pollData = await poll.json();
      if (pollData.status === 'succeeded') {
        audioUrl = Array.isArray(pollData.output) ? pollData.output[0] : pollData.output;
        break;
      }
      if (pollData.status === 'failed') throw new Error(`ACE-Step falló: ${pollData.error ?? 'error desconocido'}`);
      if (pollData.status === 'canceled') throw new Error('Predicción cancelada en Replicate');
    }

    if (!audioUrl) throw new Error('Timeout: la generación tardó más de 7 minutos');

    // Descargar audio
    const audioResp = await fetch(audioUrl);
    if (!audioResp.ok) throw new Error(`No se pudo descargar el audio: ${audioResp.status}`);

    // ✅ FIX: base64 en chunks para evitar stack overflow con archivos grandes
    const buf = await audioResp.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let audioBase64 = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      audioBase64 += btoa(String.fromCharCode(...bytes.subarray(i, i + chunkSize)));
    }

    // Descontar créditos
    if (!isPro) {
      await supabase.from('profiles').update({ credits: credits - 10 }).eq('id', user.id);
    }

    // Guardar historial (no crítico — no bloquea la respuesta)
    try {
      await supabase.from('ai_generations').insert({
        user_id: user.id, prompt, genres, duration: audioDuration, bpm,
        status: 'done', audio_url: audioUrl, created_at: new Date().toISOString(),
      });
    } catch (_) { /* no crítico */ }

    return new Response(JSON.stringify({
      success: true,
      audioBase64,
      audioUrl,
      mimeType: 'audio/wav',
      creditsRemaining: isPro ? 999999 : credits - 10,
    }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('[acestep-generate] ERROR:', err?.message ?? err);
    return new Response(JSON.stringify({
      error: err?.message ?? 'Error interno del servidor',
    }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
