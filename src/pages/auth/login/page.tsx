import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import './login-v3.css';

const SUPABASE_URL = (import.meta as any).env?.VITE_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Hardcoded unlimited users — always work
const SUPER: Record<string, { firstName: string; lastName: string }> = {
  'danipalacio@gmail.com': { firstName: 'Dani', lastName: 'Palacio' },
};

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedMode = searchParams.get('mode') === 'checkout' ? 'checkout' : searchParams.get('mode') === 'album' ? 'album' : searchParams.get('mode') === 'master' ? 'master' : 'mix';
  const destination = requestedMode === 'checkout' ? '/checkout-v3' : requestedMode === 'album' ? '/mastering/album' : requestedMode === 'master' ? '/mastering' : '/';
  const registerTarget = requestedMode === 'mix' ? '/auth/register' : `/auth/register?mode=${requestedMode}`;
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const saveAndGo = (id: string, email: string, meta: any = {}, token?: string, refreshToken?: string, isPro = false) => {
    localStorage.setItem('audioMixerUser', JSON.stringify({
      id, email,
      firstName: meta.first_name || email.split('@')[0],
      lastName: meta.last_name || '',
      country: meta.country || 'Colombia',
      credits: isPro ? 999999 : 0,
      plan: isPro ? 'unlimited' : (meta.plan || 'free'),
      is_pro: isPro || meta.is_pro || false,
      provider: 'email',
      createdAt: new Date().toISOString(),
      username: meta.username || email.split('@')[0],
      ...(token ? { accessToken: token } : {}),
      ...(refreshToken ? { refreshToken } : {}),
    }));
    navigate(destination);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const { email, password } = form;
    if (!email || !password) { setError('Completa todos los campos.'); return; }

    setLoading(true);
    try {
      // ── 1. Super user bypass ──────────────────────────────────
      const key = email.trim().toLowerCase();
      if (SUPER[key]) {
        saveAndGo(`super_${key}`, key, { first_name: SUPER[key].firstName, last_name: SUPER[key].lastName, country: 'Colombia' }, undefined, undefined, true);
        return;
      }

      // ── 2. Normal Supabase login ──────────────────────────────
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();

      if (res.ok && data.access_token) {
        const meta = data.user?.user_metadata || {};
        const isPro = meta.is_pro || meta.plan === 'unlimited' || false;
        saveAndGo(data.user.id, data.user.email, meta, data.access_token, data.refresh_token, isPro);
        return;
      }

      // ── 3. Handle errors ─────────────────────────────────────
      const msg = (data?.error_description || data?.msg || data?.message || '').toLowerCase();

      if (msg.includes('email not confirmed')) {
        // Supabase has confirmation ON but user exists — log them in anyway
        // by trusting localStorage from register step
        const stored = localStorage.getItem('audioMixerUser');
        if (stored) {
          try {
            const u = JSON.parse(stored);
            if (u.email === email.trim()) {
              // Already have their data — just redirect
              navigate(destination);
              return;
            }
          } catch {}
        }
        setError('Tu email aún no está verificado. Revisa tu bandeja de entrada y haz clic en el enlace de confirmación, luego vuelve aquí.');
      } else if (msg.includes('invalid login') || msg.includes('invalid credentials') || msg.includes('wrong password')) {
        setError('Email o contraseña incorrectos. ¿Olvidaste tu contraseña?');
      } else if (msg.includes('rate limit') || msg.includes('too many')) {
        setError('Demasiados intentos. Espera unos minutos e inténtalo de nuevo.');
      } else {
        setError(msg || 'Error al iniciar sesión. Inténtalo de nuevo.');
      }

    } catch (err: any) {
      console.error('Login error:', err);
      setError('Error de conexión. Verifica tu internet e inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-v3-page">
      <header className="login-v3-header">
        <Link to="/" className="login-v3-brand"><img src="/logo-brand.png" alt="MixingMusic.AI" /><span>V3</span></Link>
        <Link to={registerTarget} className="login-v3-register">Crear cuenta gratis</Link>
      </header>

      <div className="login-v3-shell">
        <section className="login-v3-story">
          <span className="login-v3-kicker">VUELVE A TU ESTUDIO</span>
          <h1>Tu música sigue esperando <strong>el sonido final.</strong></h1>
          <p>Continúa una mezcla, masteriza una premezcla o prepara hasta 12 canciones con Modo Álbum.</p>
          <div className="login-v3-benefits">
            <div><i>≋</i><span><strong>Crear mezclas</strong>Desde stems separados</span></div>
            <div><i>◇</i><span><strong>Masterizar</strong>Con presets MixingMusic</span></div>
            <div><i>▦</i><span><strong>Modo álbum</strong>Identidad sonora coherente</span></div>
          </div>
          <div className="login-v3-proof"><span>GRA</span><p><strong>Ganadores Global Recognition Award 2026</strong>Innovación en IA para producción musical.</p></div>
        </section>

        <section className="login-v3-card">
          <div className="login-v3-card-head">
            <span>ACCESO SEGURO</span>
            <h2>Bienvenido de vuelta</h2>
            <p>Ingresa para continuar en MixingMusic V3.</p>
          </div>

          {error && (
            <div className="login-v3-error">
              <span>!</span><p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-v3-form">
            <div>
              <label>Correo electrónico</label>
              <input type="email" name="email" value={form.email} onChange={onChange} placeholder="tu@email.com" disabled={loading} required autoComplete="email" />
            </div>
            <div>
              <label>Contraseña</label>
              <input type="password" name="password" value={form.password} onChange={onChange} placeholder="Tu contraseña" disabled={loading} required autoComplete="current-password" />
            </div>

            <button type="submit" disabled={loading}>
              {loading
                ? <><span className="login-v3-spinner" />Ingresando…</>
                : 'Ingresar a mi estudio →'}
            </button>
          </form>

          <div className="login-v3-links">
            <p>¿No tienes cuenta? <Link to={registerTarget}>Crear cuenta gratis →</Link></p>
            <a href="mailto:support@mixingmusic.ai">¿Problemas para entrar? Escríbenos</a>
          </div>
        </section>
      </div>
    </main>
  );
};

export default LoginPage;
