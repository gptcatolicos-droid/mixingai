import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const REPLICATE_TOKEN = Deno.env.get('REPLICATE_API_TOKEN') ?? '';

// ✅ FIX: Usando endpoint de modelo sin version hash fijo
// En lugar de /v1/predictions con version hash, usamos /v1/models/{owner}/{model}/predictions
// Esto siempre apunta al latest del modelo y nunca queda desactualizado.

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer '))
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? '',
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user)
      return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });

    let { data: profile } = await supabase.from('profiles').select('credits, plan').eq('id', user.id).single();
    if (!profile) {
      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        credits: 10,
        plan: 'free',
        is_pro: false,
        created_at: new Date().toISOString(),
      });
      profile = { credits: 10, plan: 'free' };
    }
    const credits = profile?.credits ?? 10;
    const isPro = profile?.plan === 'unlimited' || (user.email && ['danipalacio@gmail.com'].includes(user.email));
    if (!isPro && credits < 10)
      return new Response(JSON.stringify({ error: 'Créditos insuficientes', creditsRemaining: credits }), { status: 402, headers: { ...cors, 'Content-Type': 'application/json' } });

    const { prompt, lyrics, audioDuration = 180, bpm = 120, genres, seed = -1 } = await req.json();
    if (!prompt)
      return new Response(JSON.stringify({ error: 'Se requiere prompt' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });

    const genreTags = genres?.length ? genres.join(', ') : '';
    const fullPrompt = genreTags ? `${genreTags}, ${prompt}` : prompt;

    // ✅ FIX: /v1/models/lucataco/ace-step/predictions (sin version hash)
    //    Header cambia de "Token xxx" a "Bearer xxx" (formato moderno de Replicate)
    const replicateResp = await fetch('https://api.replicate.com/v1/models/lucataco/ace-step/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          tags: fullPrompt,
          lyrics: lyrics ?? '[verse]\n[chorus]',
          audio_duration: Math.min(audioDuration, 240),
          scheduler: 'euler',
          guidance_scale: 15,
          guidance_rescale: 0.7,
          num_inference_steps: 60,
          seed: seed === -1 ? Math.floor(Math.random() * 999999) : seed,
        },
      }),
    });

    if (!replicateResp.ok) {
      const err = await replicateResp.json();
      throw new Error(`Replicate error: ${err.detail ?? JSON.stringify(err)}`);
    }

    const prediction = await replicateResp.json();
    const predId = prediction.id;

    // Polling hasta que termine (máx 6 min)
    let audioUrl: string | null = null;
    for (let i = 0; i < 72; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const poll = await fetch(`https://api.replicate.com/v1/predictions/${predId}`, {
        headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}` },
      });
      const pollData = await poll.json();
      if (pollData.status === 'succeeded') {
        audioUrl = pollData.output;
        break;
      }
      if (pollData.status === 'failed') throw new Error(`ACE-Step falló: ${pollData.error}`);
    }

    if (!audioUrl) throw new Error('Timeout: la generación tardó demasiado');

    // Descargar audio y convertir a base64
    const audioResp = await fetch(audioUrl);
    const buf = await audioResp.arrayBuffer();
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(buf)));

    // Descontar créditos
    if (!isPro) {
      await supabase.from('profiles').update({ credits: credits - 10 }).eq('id', user.id);
    }

    // Guardar en historial
    try {
      await supabase.from('ai_generations').insert({
        user_id: user.id, prompt, genres, duration: audioDuration, bpm,
        status: 'done', audio_url: audioUrl, created_at: new Date().toISOString(),
      });
    } catch (e) { /* no crítico */ }

    return new Response(JSON.stringify({
      success: true,
      audioBase64,
      mimeType: 'audio/wav',
      creditsRemaining: isPro ? 999999 : credits - 10,
    }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('acestep-generate error:', err);
    return new Response(JSON.stringify({ error: err?.message ?? 'Error interno' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
});
