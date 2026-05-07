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

    const body = await req.json();
    const { action, audioBase64, mimeType = 'audio/wav', fileName = 'audio.wav', model = 'htdemucs', request_id: existingRequestId } = body;

    let { data: profile } = await supabase.from('profiles').select('credits, plan').eq('id', user.id).single();
    const credits = profile?.credits ?? 0;
    const isPro = profile?.plan === 'unlimited' || ['danipalacio@gmail.com'].includes(user.email ?? '');

    // ACCION: poll — verificar estado de request existente
    if (action === 'poll' && existingRequestId) {
      const statusResp = await fetch(
        `https://queue.fal.run/fal-ai/demucs/requests/${existingRequestId}/status`,
        { headers: { 'Authorization': `Key ${FAL_KEY}` } }
      );
      const statusData = await statusResp.json();

      if (statusData.status === 'COMPLETED') {
        const resultResp = await fetch(
          `https://queue.fal.run/fal-ai/demucs/requests/${existingRequestId}`,
          { headers: { 'Authorization': `Key ${FAL_KEY}` } }
        );
        const result = await resultResp.json();
        const output = result.output ?? result;

        // Descontar creditos al completar
        if (!isPro) {
          await supabase.from('profiles').update({ credits: credits - 3 }).eq('id', user.id);
        }

        return new Response(JSON.stringify({
          success: true,
          status: 'COMPLETED',
          stems: {
            vocals: output.vocals?.url ?? output.vocals ?? null,
            drums: output.drums?.url ?? output.drums ?? null,
            bass: output.bass?.url ?? output.bass ?? null,
            other: output.other?.url ?? output.other ?? null,
          },
          creditsRemaining: isPro ? 999999 : credits - 3,
        }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
      }

      if (statusData.status === 'FAILED') {
        return new Response(JSON.stringify({
          success: false, status: 'FAILED',
          error: `Demucs fallo: ${statusData.error ?? 'error desconocido'}`,
        }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
      }

      // IN_QUEUE o IN_PROGRESS
      return new Response(JSON.stringify({
        success: true,
        status: statusData.status ?? 'IN_PROGRESS',
        request_id: existingRequestId,
      }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // ACCION: submit — iniciar nueva separacion
    if (!isPro && credits < 3)
      return new Response(JSON.stringify({ error: 'Creditos insuficientes (necesitas 3)', creditsRemaining: credits }), {
        status: 402, headers: { ...cors, 'Content-Type': 'application/json' },
      });

    if (!audioBase64) throw new Error('Se requiere audioBase64');

    // Decodificar y subir a storage
    const clean = audioBase64.replace(/\s/g, '');
    const binaryStr = atob(clean);
    const audioBytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) audioBytes[i] = binaryStr.charCodeAt(i);

    const ext = fileName.split('.').pop() || 'wav';
    const storageKey = `stems-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('audio-temp')
      .upload(storageKey, audioBytes, { contentType: mimeType, upsert: true });

    if (uploadErr) throw new Error(`Storage error: ${uploadErr.message}`);

    const { data: { publicUrl } } = supabase.storage.from('audio-temp').getPublicUrl(storageKey);

    // Submit a FAL — Demucs (solo submit, no polling)
    const submitResp = await fetch('https://queue.fal.run/fal-ai/demucs', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: { audio_url: publicUrl, model } }),
    });

    if (!submitResp.ok) {
      const errBody = await submitResp.text();
      await supabase.storage.from('audio-temp').remove([storageKey]);
      throw new Error(`FAL submit error ${submitResp.status}: ${errBody}`);
    }

    const submitJson = await submitResp.json();
    const request_id = submitJson.request_id;
    if (!request_id) throw new Error('FAL no devolvio request_id');

    // Devolver request_id al frontend para que haga polling
    return new Response(JSON.stringify({
      success: true,
      status: 'IN_PROGRESS',
      request_id,
      storageKey,
    }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('[stems-separate] ERROR:', err?.message ?? err);
    return new Response(JSON.stringify({ error: err?.message ?? 'Error interno' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
