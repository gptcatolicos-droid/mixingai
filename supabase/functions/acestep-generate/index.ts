/**
 * supabase/functions/acestep-generate/index.ts
 *
 * Proxy seguro entre el frontend y ACE-Step corriendo en RunPod.
 * - Valida JWT del usuario
 * - Verifica y descuenta créditos en la BD
 * - Reenvía el request al endpoint Gradio de RunPod
 * - Hace polling hasta recibir el audio WAV
 * - Retorna el audio como base64 al frontend
 *
 * Variables de entorno necesarias (supabase secrets set):
 *   RUNPOD_ENDPOINT_URL   → URL del pod activo, ej: https://abc123.gradio.live
 *   RUNPOD_API_KEY        → API key de RunPod (opcional, para serverless)
 *   SUPABASE_URL          → auto-injected
 *   SUPABASE_SERVICE_ROLE_KEY → para leer/escribir créditos
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const CREDITS_PER_GENERATION = 10;

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface GenerateRequest {
  prompt: string;
  lyrics?: string;
  audioDuration?: number;    // segundos, default 180
  bpm?: number;              // default 120
  genres?: string[];
  seed?: number;             // -1 = aleatorio
  referenceAudioB64?: string; // opcional, base64 del audio de referencia
}

interface GradioResponse {
  data: any[];
}

// ─── Helper: llamar al endpoint Gradio de ACE-Step ───────────────────────────
async function callAceStep(
  endpointUrl: string,
  params: GenerateRequest
): Promise<string> {
  // ACE-Step Gradio API: POST /run/predict
  // Parámetros en orden según la interfaz de app.py:
  // [prompt, lyrics, audio_duration, infer_step, guidance_scale,
  //  scheduler_type, cfg_type, omega_scale, seed, output_format,
  //  lm_model_temperature, lm_model_repetition_penalty]
  const gradioUrl = `${endpointUrl.replace(/\/$/, '')}/run/predict`;

  const audioDuration = params.audioDuration ?? 180;
  const prompt = [
    params.prompt,
    ...(params.genres?.length ? [`Genres: ${params.genres.join(', ')}`] : []),
  ].join('. ');

  const body = {
    data: [
      prompt,                          // prompt
      params.lyrics ?? '',             // lyrics (vacío = sin letra fija)
      audioDuration,                   // audio_duration (segundos)
      60,                              // infer_step (60 = calidad estándar)
      15.0,                            // guidance_scale
      'euler',                         // scheduler_type
      'apg',                           // cfg_type
      10.0,                            // omega_scale
      params.seed ?? -1,               // seed (-1 = aleatorio)
      'wav',                           // output_format
      1.0,                             // lm_model_temperature
      1.2,                             // lm_model_repetition_penalty
    ],
  };

  const response = await fetch(gradioUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(300_000), // 5 min timeout
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ACE-Step error ${response.status}: ${text.slice(0, 200)}`);
  }

  const result: GradioResponse = await response.json();

  // La respuesta de Gradio puede ser:
  // { data: [ { name: 'xxx.wav', data: 'data:audio/wav;base64,...', ... } ] }
  // o { data: [ 'path/to/file.wav' ] } dependiendo de la versión
  const audioData = result.data?.[0];

  if (!audioData) {
    throw new Error('ACE-Step no retornó audio');
  }

  // Si es objeto con campo 'data' (base64 dataURL)
  if (typeof audioData === 'object' && audioData.data) {
    const b64 = audioData.data.includes(',')
      ? audioData.data.split(',')[1]
      : audioData.data;
    return b64;
  }

  // Si es string con dataURL directa
  if (typeof audioData === 'string' && audioData.startsWith('data:')) {
    return audioData.split(',')[1];
  }

  // Si es path del archivo en el servidor Gradio
  // necesitamos hacer GET al archivo
  if (typeof audioData === 'string') {
    const fileUrl = audioData.startsWith('http')
      ? audioData
      : `${endpointUrl.replace(/\/$/, '')}/file=${audioData}`;

    const fileResp = await fetch(fileUrl, { signal: AbortSignal.timeout(60_000) });
    if (!fileResp.ok) throw new Error(`Error descargando audio: ${fileResp.status}`);
    const arrayBuf = await fileResp.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuf);
    return btoa(String.fromCharCode(...uint8));
  }

  throw new Error('Formato de respuesta de ACE-Step no reconocido');
}

// ─── Helper: verificar y descontar créditos ───────────────────────────────────
async function checkAndDeductCredits(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  amount: number
): Promise<{ ok: boolean; remaining: number; error?: string }> {
  // Leer créditos actuales
  const { data: profile, error: readErr } = await supabase
    .from('profiles')
    .select('credits, plan')
    .eq('id', userId)
    .single();

  if (readErr || !profile) {
    return { ok: false, remaining: 0, error: 'No se pudo leer el perfil' };
  }

  // Usuarios unlimited no consumen créditos
  if (profile.plan === 'unlimited') {
    return { ok: true, remaining: 999999 };
  }

  if ((profile.credits ?? 0) < amount) {
    return { ok: false, remaining: profile.credits ?? 0, error: 'Créditos insuficientes' };
  }

  const newCredits = profile.credits - amount;
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ credits: newCredits })
    .eq('id', userId);

  if (updateErr) {
    return { ok: false, remaining: profile.credits, error: 'Error actualizando créditos' };
  }

  return { ok: true, remaining: newCredits };
}

// ─── Handler principal ────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. Verificar variables de entorno
    const endpointUrl = Deno.env.get('RUNPOD_ENDPOINT_URL');
    if (!endpointUrl) {
      return new Response(JSON.stringify({ error: 'Servidor de IA no configurado. Configura RUNPOD_ENDPOINT_URL.' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Verificar JWT del usuario
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);

    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Parsear y validar el request
    const params: GenerateRequest = await req.json();

    if (!params.prompt?.trim()) {
      return new Response(JSON.stringify({ error: 'El prompt es requerido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sanitizar duración (máx 5 min)
    params.audioDuration = Math.min(params.audioDuration ?? 180, 300);

    // 4. Verificar y descontar créditos ANTES de generar
    const creditsResult = await checkAndDeductCredits(supabase, user.id, CREDITS_PER_GENERATION);
    if (!creditsResult.ok) {
      return new Response(JSON.stringify({
        error: creditsResult.error ?? 'Sin créditos',
        creditsRemaining: creditsResult.remaining,
      }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Llamar a ACE-Step en RunPod
    let audioB64: string;
    try {
      audioB64 = await callAceStep(endpointUrl, params);
    } catch (genErr: any) {
      // Si falla la generación, devolver los créditos
      await supabase.from('profiles').update({
        credits: creditsResult.remaining + CREDITS_PER_GENERATION,
      }).eq('id', user.id);

      throw genErr;
    }

    // 6. Guardar registro de la generación en BD
    await supabase.from('ai_generations').insert({
      user_id: user.id,
      prompt: params.prompt,
      genres: params.genres ?? [],
      duration_seconds: params.audioDuration,
      credits_used: CREDITS_PER_GENERATION,
      created_at: new Date().toISOString(),
    }).throwOnError();

    // 7. Responder con el audio base64
    return new Response(JSON.stringify({
      success: true,
      audioBase64: audioB64,
      mimeType: 'audio/wav',
      creditsRemaining: creditsResult.remaining,
      creditsUsed: CREDITS_PER_GENERATION,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('acestep-generate error:', err);
    return new Response(JSON.stringify({
      error: err?.message ?? 'Error interno del servidor',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
