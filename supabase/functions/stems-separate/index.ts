import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ✅ v20: Version hash actual de cjwbw/demucs
const DEMUCS_VERSION = '25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953';

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

    const { audioBase64, mimeType = 'audio/wav', model = 'htdemucs' } = await req.json();
    if (!audioBase64) throw new Error('Se requiere audioBase64');

    // ✅ FIX: limpiar base64 antes de decodificar
    const cleanBase64 = audioBase64.replace(/\s/g, '');
    const binaryStr = atob(cleanBase64);
    const audioBytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) audioBytes[i] = binaryStr.charCodeAt(i);

    // Subir a storage para que Replicate pueda descargarlo
    const fileName = `stems-input-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`;
    const { error: uploadErr } = await supabase.storage
      .from('audio-temp')
      .upload(fileName, audioBytes, { contentType: mimeType, upsert: true });

    if (uploadErr) throw new Error(`Storage upload error: ${uploadErr.message}`);

    const { data: { publicUrl } } = supabase.storage.from('audio-temp').getPublicUrl(fileName);

    // ✅ FIX: Bearer (no Token)
    const replicateResp = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: DEMUCS_VERSION,
        input: {
          audio: publicUrl,
          model: model,
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
      // Limpiar el archivo antes de lanzar error
      await supabase.storage.from('audio-temp').remove([fileName]);
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
        stems = pollData.output;
        break;
      }
      if (pollData.status === 'failed') throw new Error(`Demucs falló: ${pollData.error ?? 'error desconocido'}`);
      if (pollData.status === 'canceled') throw new Error('Predicción cancelada');
    }

    // Limpiar archivo temporal
    await supabase.storage.from('audio-temp').remove([fileName]);

    if (!stems) throw new Error('Timeout en separación de stems (más de 10 minutos)');

    // Descontar créditos
    if (!isPro) {
      await supabase.from('profiles').update({ credits: credits - 3 }).eq('id', user.id);
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
