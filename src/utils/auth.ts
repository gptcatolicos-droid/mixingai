const SUPABASE_URL = (import.meta as any).env?.VITE_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON = (import.meta as any).env?.VITE_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Obtiene un token válido.
 * - Super users: retorna su accessToken directamente (no es JWT de Supabase)
 * - Usuarios normales: valida JWT, refresca si expiró
 */
export async function getValidToken(): Promise<string | null> {
  try {
    const stored = localStorage.getItem('audioMixerUser');
    if (stored) {
      const u = JSON.parse(stored);

      // Super user — retornar el token guardado directamente (puede ser undefined)
      // Las Edge Functions verifican el token con Supabase, los super users
      // no tienen token real → las Edge Functions van a fallar de todas formas
      // Solución: super users usan créditos ilimitados localmente, no llaman Edge Functions
      if (u.id?.startsWith('super_')) {
        // Retornar el accessToken si existe, sino null
        // FlowCreate/StemSeparator deben manejar null como "super user sin token"
        return u.accessToken ?? '__SUPER_USER__';
      }

      if (u.accessToken) {
        // Si el token es válido, retornarlo directamente
        if (isTokenValid(u.accessToken)) return u.accessToken;

        // Expirado: intentar refresh con refreshToken
        if (u.refreshToken) {
          const newToken = await doRefresh(u.refreshToken, u);
          if (newToken) return newToken;
        }

        // Si no hay refresh, retornar el token igual (las Edge Functions dirán si expiró)
        // Mejor dar el token viejo que decir "sesión expirada" inmediatamente
        return u.accessToken;
      }
    }

    // Buscar en claves de Supabase SDK (sb-xxx-auth-token)
    for (const key of Object.keys(localStorage)) {
      if ((key.includes('sb-') && key.includes('-auth-token')) || key.includes('supabase.auth')) {
        try {
          const p = JSON.parse(localStorage.getItem(key) ?? '');
          const accessToken = p?.access_token || p?.session?.access_token;
          const refreshTk = p?.refresh_token || p?.session?.refresh_token;
          if (accessToken && isTokenValid(accessToken)) return accessToken;
          if (refreshTk) {
            const newToken = await doRefresh(refreshTk, null);
            if (newToken) return newToken;
          }
          if (accessToken) return accessToken; // retornar aunque esté expirado
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
    if (!payload.exp) return true; // sin exp = asumimos válido
    return Date.now() < payload.exp * 1000 - 30_000; // 30s de margen
  } catch {
    return true; // si no se puede parsear, asumir válido y dejar que el servidor decida
  }
}

async function doRefresh(refreshTk: string, currentUser: any): Promise<string | null> {
  try {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON },
      body: JSON.stringify({ refresh_token: refreshTk }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.access_token) return null;

    // Actualizar localStorage
    if (currentUser) {
      const updated = { ...currentUser, accessToken: data.access_token, refreshToken: data.refresh_token };
      localStorage.setItem('audioMixerUser', JSON.stringify(updated));
    }
    return data.access_token;
  } catch {
    return null;
  }
}
