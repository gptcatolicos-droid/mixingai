import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PLAN_CREDITS: Record<string, number> = {
  starter: 1000,
  unlimited: 999999,
  pro: 999999,
};

const PLAN_AMOUNTS: Record<string, number> = {
  starter: 5.99,
  unlimited: 0, // suscripción
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Esta función se llama desde webhook de pago O manualmente (admin)
    // Verificar que viene de server-side (no requiere JWT de usuario)
    const body = await req.json();
    const { userId, plan, adminKey } = body;

    // Protección básica: clave admin o service role
    const authHeader = req.headers.get('Authorization') ?? '';
    const isServiceRole = authHeader.includes(SERVICE_ROLE_KEY.slice(-10));
    const isAdminKey = adminKey === Deno.env.get('ADMIN_KEY');

    if (!isServiceRole && !isAdminKey) {
      // Intentar validar como admin user
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user || !['danipalacio@gmail.com'].includes(user.email ?? '')) {
        return new Response(JSON.stringify({ error: 'No autorizado para grant-credits' }), {
          status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
    }

    if (!userId || !plan) throw new Error('Se requieren userId y plan');

    const creditsToGrant = PLAN_CREDITS[plan];
    if (!creditsToGrant) throw new Error(`Plan desconocido: ${plan}`);

    const isPro = plan === 'unlimited' || plan === 'pro';

    // Actualizar perfil
    const { error } = await supabase.from('profiles').update({
      credits: creditsToGrant,
      plan: plan,
      is_pro: isPro,
    }).eq('id', userId);

    if (error) throw new Error(`Error actualizando perfil: ${error.message}`);

    // Registrar en ledger
    await supabase.from('credits_ledger').insert({
      user_id: userId,
      delta: creditsToGrant,
      reason: `plan_${plan}_purchase`,
      created_at: new Date().toISOString(),
    }).catch(() => {});

    return new Response(JSON.stringify({
      success: true,
      userId,
      plan,
      creditsGranted: creditsToGrant,
    }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('[grant-credits] ERROR:', err?.message ?? err);
    return new Response(JSON.stringify({ error: err?.message ?? 'Error interno' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
