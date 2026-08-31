// Authorization is tied to the existing owner's immutable Auth ID, never a
// browser flag, editable profile, email address, or user_metadata.
export const OWNER_ID = 'f0a4b517-54a9-426e-90c4-076aca534a9c';

type VerifiedUser = { id: string; email_confirmed_at?: string };
type Dependencies = {
  authenticate: (token: string) => Promise<VerifiedUser | null>;
  listUsers: (page: number) => Promise<unknown>;
  updateAccess: (id: string, enabled: boolean) => Promise<void>;
};

export function createAdminHandler(deps: Dependencies) {
  return async (req: Request) => {
    const origin = req.headers.get('Origin');
    const allowed = ['https://mixingmusic.ai', 'https://www.mixingmusic.ai'];
    const headers: Record<string, string> = {
      'Content-Type': 'application/json', 'Cache-Control': 'no-store',
      'Vary': 'Origin', 'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    };
    if (origin && allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
    if (origin && !allowed.includes(origin)) return json({ error: 'ORIGIN_NOT_ALLOWED' }, 403);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (!['GET', 'PUT'].includes(req.method)) return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
    const match = /^Bearer\s+(\S+)$/i.exec(req.headers.get('Authorization') ?? '');
    if (!match) return json({ error: 'SESSION_REQUIRED' }, 401);
    try {
      const user = await deps.authenticate(match[1]);
      if (!user) return json({ error: 'SESSION_REQUIRED' }, 401);
      if (user.id !== OWNER_ID || !user.email_confirmed_at) return json({ error: 'ADMIN_REQUIRED' }, 403);
      if (req.method === 'GET') {
        const page = Number(new URL(req.url).searchParams.get('page') ?? 1);
        if (!Number.isInteger(page) || page < 1 || page > 1000) return json({ error: 'INVALID_PAGE' }, 400);
        return json(await deps.listUsers(page));
      }
      if (Number(req.headers.get('Content-Length') ?? 0) > 2048) return json({ error: 'INVALID_REQUEST' }, 413);
      const raw = await req.text();
      if (raw.length > 2048) return json({ error: 'INVALID_REQUEST' }, 413);
      let body;
      try { body = JSON.parse(raw); } catch { return json({ error: 'INVALID_REQUEST' }, 400); }
      if (!body || typeof body !== 'object' || Array.isArray(body) ||
          Object.keys(body).some(key => !['userId', 'isPro'].includes(key)) ||
          typeof body.userId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.userId) ||
          typeof body.isPro !== 'boolean') return json({ error: 'INVALID_REQUEST' }, 400);
      if (body.userId === OWNER_ID && !body.isPro) return json({ error: 'OWNER_ACCESS_PROTECTED' }, 409);
      await deps.updateAccess(body.userId, body.isPro);
      return json({ success: true });
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      if (code === 'PAID_ACCESS_PROTECTED') return json({ error: code }, 409);
      if (code === 'USER_NOT_FOUND') return json({ error: code }, 404);
      // Never include provider responses, tokens, or user data in errors/logs.
      return json({ error: 'ADMIN_OPERATION_FAILED' }, 503);
    }
  };
}
