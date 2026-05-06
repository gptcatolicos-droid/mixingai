import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const REPLICATE_TOKEN = Deno.env.get('REPLICATE_API_TOKEN') ?? '';
const DEMUCS_MODEL = 'cjwbw/demucs:25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953';

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

    // Obtener o crear perfil con créditos por defecto
    let { data: profile } = await supabase.from('profiles').select('credits, plan').eq('id', user.id).single();
    if (!profile) {
      // Primera vez — crear perfil con 10 créditos de bienvenida
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
    if (!isPro && credits < 3)
      return new Response(JSON.stringify({ error: 'Créditos insuficientes', creditsRemaining: credits }), { status: 402, headers: { ...cors, 'Content-Type': 'application/json' } });

    const { audioBase64, mimeType = 'audio/wav', model = 'htdemucs' } = await req.json();
    if (!audioBase64)
      return new Response(JSON.stringify({ error: 'Se requiere audioBase64' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });

    // Subir audio a Supabase Storage temporalmente para que Replicate lo descargue
    const audioBytes = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
    const ext = mimeType.includes('mp3') ? 'mp3' : mimeType.includes('flac') ? 'flac' : 'wav';
    const fileName = `sep_${user.id}_${Date.now()}.${ext}`;

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('audio-temp')
      .upload(fileName, audioBytes, { contentType: mimeType, upsert: true });

    if (uploadErr) throw new Error(`Storage upload error: ${uploadErr.message}`);

    const { data: { publicUrl } } = supabase.storage.from('audio-temp').getPublicUrl(fileName);

    // Llamar a Replicate — Demucs
    const replicateResp = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: DEMUCS_MODEL,
        input: {
          audio: publicUrl,
          model: model,
          stem: null, // todos los stems
          mp3: true,
          mp3_bitrate: 320,
          float32: false,
          jobs: 0,
        },
      }),
    });

    if (!replicateResp.ok) {
      const err = await replicateResp.json();
      throw new Error(`Replicate error: ${err.detail ?? JSON.stringify(err)}`);
    }

    const prediction = await replicateResp.json();
    let predId = prediction.id;

    // Polling hasta que termine (máx 5 min)
    let result: any = null;
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const poll = await fetch(`https://api.replicate.com/v1/predictions/${predId}`, {
        headers: { 'Authorization': `Token ${REPLICATE_TOKEN}` },
      });
      const pollData = await poll.json();
      if (pollData.status === 'succeeded') { result = pollData.output; break; }
      if (pollData.status === 'failed') throw new Error(`Demucs falló: ${pollData.error}`);
    }

    if (!result) throw new Error('Timeout: la separación tardó más de 5 minutos');

    // result es { vocals: url, drums: url, bass: url, other: url, ... }
    // Descargar cada stem y convertir a base64
    const stems: Record<string, string> = {};
    const stemNames: string[] = [];

    for (const [key, url] of Object.entries(result as Record<string, string>)) {
      if (!url || key === 'original') continue;
      const audioResp = await fetch(url as string);
      const buf = await audioResp.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      stems[key] = b64;
      stemNames.push(key);
    }

    // Limpiar archivo temporal
    await supabase.storage.from('audio-temp').remove([fileName]);

    // Descontar créditos
    if (!isPro) {
      await supabase.from('profiles').update({ credits: credits - 3 }).eq('id', user.id);
    }

    return new Response(JSON.stringify({
      success: true,
      stems,
      stemNames,
      creditsRemaining: isPro ? 999999 : credits - 3,
    }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('stems-separate error:', err);
    return new Response(JSON.stringify({ error: err?.message ?? 'Error interno' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
});
