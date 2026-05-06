const SUPABASE_URL = (import.meta as any).env?.VITE_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON = (import.meta as any).env?.VITE_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Obtiene un token válido. Si el access_token expiró, usa el refresh_token para renovarlo.
 */
export async function getValidToken(): Promise<string | null> {
  try {
    // 1. Buscar en audioMixerUser
    const stored = localStorage.getItem('audioMixerUser');
    if (stored) {
      const u = JSON.parse(stored);
      // Super user — no necesita token real
      if (u.id?.startsWith('super_')) return null; // Super users: sin token de Supabase
      if (u.accessToken) {
        // Verificar si el token sigue válido intentando decodificar el JWT
        const valid = isTokenValid(u.accessToken);
        if (valid) return u.accessToken;
        // Token expirado — intentar refresh
        if (u.refreshToken) {
          const newToken = await refreshToken(u.refreshToken, u);
          if (newToken) return newToken;
        }
      }
    }

    // 2. Buscar en claves de Supabase (sb-xxx-auth-token)
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if ((key.includes('sb-') && key.includes('-auth-token')) || key.includes('supabase.auth')) {
        const val = localStorage.getItem(key);
        if (!val) continue;
        try {
          const p = JSON.parse(val);
          const accessToken = p?.access_token || p?.session?.access_token;
          const refreshTk = p?.refresh_token || p?.session?.refresh_token;
          if (accessToken && isTokenValid(accessToken)) return accessToken;
          if (refreshTk) {
            const newToken = await refreshToken(refreshTk, null);
            if (newToken) return newToken;
          }
        } catch {}
      }
    }

    return null;
  } catch {
    return null;
  }
}

function isTokenValid(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    const exp = payload.exp * 1000;
    // Válido si expira en más de 60 segundos
    return Date.now() < exp - 60_000;
  } catch {
    return false; // Si no podemos verificar, asumir expirado y hacer refresh
  }
}

async function refreshToken(refreshTk: string, currentUser: any): Promise<string | null> {
  try {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON },
      body: JSON.stringify({ refresh_token: refreshTk }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.access_token) return null;

    // Actualizar localStorage con el nuevo token
    if (currentUser) {
      const updated = { ...currentUser, accessToken: data.access_token, refreshToken: data.refresh_token };
      localStorage.setItem('audioMixerUser', JSON.stringify(updated));
    }
    return data.access_token;
  } catch {
    return null;
  }
}
