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

    if (!FAL_KEY) throw new Error('FAL_API_KEY no configurado');

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
    // prompt max 300 chars segun docs
    const stylePrompt = (genreTags + prompt).slice(0, 300);

    // Input exacto segun documentacion de FAL MiniMax v2.6
    const falInput: Record<string, unknown> = {
      prompt: stylePrompt,
      is_instrumental: isInstrumental,
    };

    if (!isInstrumental) {
      // lyrics max 1000 chars, requerido cuando is_instrumental es false
      falInput.lyrics = hasLyrics
        ? lyrics.trim().slice(0, 1000)
        : `[Verse]\nA song about ${prompt.slice(0, 60)}\n[Chorus]\n${prompt.slice(0, 40)}`;
    }

    // Submit a FAL queue — body directo sin wrapper "input"
    const submitResp = await fetch('https://queue.fal.run/fal-ai/minimax-music/v2.6', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(falInput),
    });

    if (!submitResp.ok) {
      const errBody = await submitResp.text();
      throw new Error(`FAL submit ${submitResp.status}: ${errBody}`);
    }

    const submitJson = await submitResp.json();
    const request_id = submitJson.request_id;
    if (!request_id) throw new Error(`FAL no devolvio request_id: ${JSON.stringify(submitJson)}`);

    // Polling — max 4.5 min
    let audioUrl: string | null = null;
    for (let i = 0; i < 54; i++) {
      await new Promise(r => setTimeout(r, 5000));

      const statusResp = await fetch(
        `https://queue.fal.run/fal-ai/minimax-music/v2.6/requests/${request_id}/status`,
        { headers: { 'Authorization': `Key ${FAL_KEY}` } }
      );
      const statusData = await statusResp.json();

      if (statusData.status === 'COMPLETED') {
        const resultResp = await fetch(
          `https://queue.fal.run/fal-ai/minimax-music/v2.6/requests/${request_id}`,
          { headers: { 'Authorization': `Key ${FAL_KEY}` } }
        );
        const result = await resultResp.json();
        // Segun docs: output es { audio: { url: "..." } }
        audioUrl = result.audio?.url ?? null;
        console.log('FAL result:', JSON.stringify(result).slice(0, 200));
        break;
      }

      if (statusData.status === 'FAILED') {
        throw new Error(`MiniMax fallo: ${statusData.error ?? JSON.stringify(statusData)}`);
      }
    }

    if (!audioUrl) throw new Error('Timeout: la generacion tardo mas de 4 minutos.');

    if (!isPro) {
      await supabase.from('profiles').update({ credits: credits - 10 }).eq('id', user.id);
    }

    try {
      await supabase.from('ai_generations').insert({
        user_id: user.id, prompt, genres, status: 'done',
        audio_url: audioUrl, created_at: new Date().toISOString(),
      });
    } catch (_) {}

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
