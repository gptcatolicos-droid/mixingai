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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? '',
    );

    const { userId, credits, plan, paymentId, source } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId requerido' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    // Determinar créditos a otorgar según el plan
    let creditsToAdd = credits ?? 0;
    let newPlan = plan ?? 'free';
    let isPro = false;

    if (plan === 'pro' || plan === 'unlimited') {
      creditsToAdd = 999999;
      newPlan = 'unlimited';
      isPro = true;
    } else if (plan === 'starter') {
      creditsToAdd = 1000;
      newPlan = 'starter';
    }

    // Actualizar perfil
    const { error } = await supabase.from('profiles')
      .upsert({
        id: userId,
        credits: creditsToAdd,
        plan: newPlan,
        is_pro: isPro,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) throw error;

    // Registrar en ledger de créditos
    await supabase.from('credits_ledger').insert({
      user_id: userId,
      delta: creditsToAdd,
      reason: `payment_${source ?? 'unknown'}_${paymentId ?? 'manual'}`,
      created_at: new Date().toISOString(),
    }).catch(() => {}); // no crítico

    return new Response(JSON.stringify({
      success: true,
      credits: creditsToAdd,
      plan: newPlan,
    }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'Error interno' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
});
