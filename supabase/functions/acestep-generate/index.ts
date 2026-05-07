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
    const FAL_KEY = Deno.env.get('FAL_API_KEY') ?? '';
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? '';

    if (!FAL_KEY) throw new Error('FAL_API_KEY no configurado en Supabase secrets');
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
      return new Response(JSON.stringify({ error: 'Token invalido' }), {
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
      return new Response(JSON.stringify({ error: 'Creditos insuficientes', creditsRemaining: credits }), {
        status: 402, headers: { ...cors, 'Content-Type': 'application/json' },
      });

    const body = await req.json();
    const { prompt, lyrics, genres, selectedStyle } = body;
    if (!prompt)
      return new Response(JSON.stringify({ error: 'Se requiere prompt' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });

    const isInstrumental = selectedStyle === 'instrumental';
    const hasLyrics = !isInstrumental && !!lyrics?.trim();
    const genreTags = genres?.length ? genres.join(', ') + ', ' : '';
    const stylePrompt = (genreTags + prompt).slice(0, 2000);
    const songLyrics = hasLyrics
      ? lyrics.trim()
      : `[Verse]\nA song about ${prompt.slice(0, 80)}\n\n[Chorus]\n${prompt.slice(0, 40)}`;

    // Submit a FAL — MiniMax Music 2.5
    const submitResp = await fetch('https://queue.fal.run/fal-ai/minimax-music/v2.5', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: stylePrompt,
        lyrics: isInstrumental ? '' : songLyrics,
        is_instrumental: isInstrumental,
        lyrics_optimizer: !hasLyrics && !isInstrumental,
      }),
    });

    if (!submitResp.ok) {
      const errBody = await submitResp.text();
      throw new Error(`FAL error ${submitResp.status}: ${errBody}`);
    }

    const submitJson = await submitResp.json();
    const request_id = submitJson.request_id;
    if (!request_id) throw new Error(`FAL no devolvio request_id: ${JSON.stringify(submitJson)}`);

    // Polling max 5 min
    let audioUrl: string | null = null;
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 5000));

      const statusResp = await fetch(
        `https://queue.fal.run/fal-ai/minimax-music/v2.5/requests/${request_id}/status`,
        { headers: { 'Authorization': `Key ${FAL_KEY}` } }
      );
      const statusData = await statusResp.json();

      if (statusData.status === 'COMPLETED') {
        const resultResp = await fetch(
          `https://queue.fal.run/fal-ai/minimax-music/v2.5/requests/${request_id}`,
          { headers: { 'Authorization': `Key ${FAL_KEY}` } }
        );
        const result = await resultResp.json();
        audioUrl = result.audio?.url ?? result.output?.audio?.url ?? null;
        break;
      }
      if (statusData.status === 'FAILED') {
        throw new Error(`MiniMax fallo: ${statusData.error ?? 'error desconocido'}`);
      }
    }

    if (!audioUrl) throw new Error('Timeout: mas de 5 minutos');

    if (!isPro) {
      await supabase.from('profiles').update({ credits: credits - 10 }).eq('id', user.id);
    }

    try {
      await supabase.from('ai_generations').insert({
        user_id: user.id, prompt, genres, status: 'done',
        audio_url: audioUrl, created_at: new Date().toISOString(),
      });
    } catch (_) { /* no critico */ }

    return new Response(JSON.stringify({
      success: true,
      audioUrl,
      mimeType: 'audio/mp3',
      creditsRemaining: isPro ? 999999 : credits - 10,
    }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('[minimax-generate] ERROR:', err?.message ?? err);
    return new Response(JSON.stringify({
      error: err?.message ?? 'Error interno',
    }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
