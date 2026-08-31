import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { createAdminHandler } from './handler.ts';

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false, autoRefreshToken: false } },
);

Deno.serve(createAdminHandler({
  async authenticate(token) {
    // getUser validates with Auth; decoding a JWT or trusting its metadata is insufficient.
    const { data, error } = await admin.auth.getUser(token);
    return error ? null : data.user;
  },
  async listUsers(page) {
    const perPage = 500;
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error('LIST_FAILED');
    const ids = data.users.map(user => user.id);
    const paid = new Set<string>();
    // Keep Data API URLs below proxy limits even when the Auth page is full.
    for (let offset = 0; offset < ids.length; offset += 100) {
      const { data: entitlements, error: entitlementsError } = await admin
        .from('mastering_entitlements').select('user_id,tier').in('user_id', ids.slice(offset, offset + 100));
      if (entitlementsError) throw new Error('LIST_FAILED');
      for (const row of entitlements ?? []) if (row.tier === 'unlimited') paid.add(row.user_id);
    }
    return {
      users: data.users.map(user => {
        const meta = user.user_metadata ?? {};
        const access = user.app_metadata ?? {};
        const isPro = paid.has(user.id) || access.is_pro === true || access.plan === 'unlimited';
        return {
          id: user.id, email: user.email ?? '',
          firstName: typeof meta.first_name === 'string' ? meta.first_name : user.email?.split('@')[0] ?? '',
          lastName: typeof meta.last_name === 'string' ? meta.last_name : '',
          country: typeof meta.country === 'string' ? meta.country : '',
          createdAt: user.created_at, lastLogin: user.last_sign_in_at ?? '',
          confirmed: Boolean(user.email_confirmed_at),
          plan: isPro ? 'unlimited' : 'free', is_pro: isPro,
          paidAccessProtected: paid.has(user.id),
        };
      }),
      nextPage: data.users.length === perPage ? page + 1 : null,
    };
  },
  async updateAccess(userId, enabled) {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data.user) throw new Error('USER_NOT_FOUND');
    // This console manages manual access only. Never revoke a customer's paid
    // entitlement, change an order, refund a payment, or remove an account.
    if (!enabled) {
      const { data: entitlement, error: checkError } = await admin.from('mastering_entitlements')
        .select('tier').eq('user_id', userId).maybeSingle();
      if (checkError) throw new Error('ACCESS_CHECK_FAILED');
      if (entitlement?.tier === 'unlimited') throw new Error('PAID_ACCESS_PROTECTED');
    }
    const flags = { is_pro: enabled, plan: enabled ? 'unlimited' : 'free' };
    // Keep unrelated metadata, existing passwords, sessions, balances and orders.
    const { error: authError } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: { ...data.user.app_metadata, ...flags },
      user_metadata: { ...data.user.user_metadata, ...flags },
    });
    if (authError) throw new Error('UPDATE_FAILED');
    const { error: profileError } = await admin.from('users').update(flags).eq('id', userId);
    if (profileError) throw new Error('UPDATE_FAILED');
  },
}));
