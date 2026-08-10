import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import './auth-v3.css';
import i18n from '../../../i18n';

const SUPABASE_URL = (import.meta as any).env?.VITE_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_PUBLIC_SUPABASE_ANON_KEY ?? '';

const COUNTRIES = [
  'Colombia','México','Argentina','Chile','Perú','Venezuela','Ecuador',
  'Bolivia','Uruguay','Paraguay','España','Estados Unidos','Otro'
];

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedMode = searchParams.get('mode') === 'checkout' ? 'checkout' : searchParams.get('mode') === 'album' ? 'album' : searchParams.get('mode') === 'master' ? 'master' : 'mix';
  const destination = requestedMode === 'checkout' ? '/checkout-v3' : requestedMode === 'album' ? '/mastering/album' : requestedMode === 'master' ? '/mastering' : '/';
  const loginTarget = requestedMode === 'mix' ? '/auth/login' : `/auth/login?mode=${requestedMode}`;
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', password:'', country:'Colombia' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onChange = (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const saveAndGo = (id: string, email: string, token?: string, refreshToken?: string) => {
    const { firstName, lastName, country } = form;
    localStorage.setItem('audioMixerUser', JSON.stringify({
      id, email, firstName, lastName, country, preferred_locale: i18n.resolvedLanguage || 'es',
      credits: 0, plan: 'free', is_pro: false,
      provider: 'email',
      createdAt: new Date().toISOString(),
      username: `${firstName.toLowerCase().replace(/\s/g,'_')}_${lastName.toLowerCase().replace(/\s/g,'_')}`,
      ...(token ? { accessToken: token } : {}),
      ...(refreshToken ? { refreshToken } : {}),
    }));
    localStorage.removeItem('mixingai_used_free');
    navigate(destination);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const { firstName, lastName, email, password } = form;

    if (!firstName || !lastName || !email || !password) { setError('Por favor completa todos los campos.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Ingresa un email válido.'); return; }
    if (password.length < 6) { setError('La contraseña debe tener mínimo 6 caracteres.'); return; }

    setLoading(true);
    try {
      // ── 1. Intentar registro ──────────────────────────────────
      const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({
          email, password,
          data: { first_name: firstName, last_name: form.lastName, country: form.country, preferred_locale: i18n.resolvedLanguage || 'es', plan: 'free', is_pro: false },
        }),
      });
      const signupData = await signupRes.json();

      // ── 2. Email ya registrado ────────────────────────────────
      const alreadyMsg = signupData?.msg || signupData?.error_description || signupData?.message || '';
      const alreadyExists = !signupRes.ok && (
        alreadyMsg.toLowerCase().includes('already registered') ||
        alreadyMsg.toLowerCase().includes('already in use') ||
        alreadyMsg.toLowerCase().includes('already exists') ||
        alreadyMsg.toLowerCase().includes('user already')
      );
      if (alreadyExists) { setError('Este email ya está registrado.'); setLoading(false); return; }
      if (!signupRes.ok) { setError(alreadyMsg || 'Error al crear la cuenta. Inténtalo de nuevo.'); setLoading(false); return; }

      // ── 3. Insert into users table (so admin panel can see them) ──
      const userId = signupData.user?.id || `usr_${Date.now()}`;
      const accessToken = signupData.access_token;
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            id: userId,
            first_name: firstName,
            last_name: lastName,
            email,
            country,
            preferred_locale: i18n.resolvedLanguage || 'es',
            credits: 0,
            plan: 'free',
            is_pro: false,
            provider: 'email',
            username: `${firstName.toLowerCase().replace(/\s/g,'_')}_${lastName.toLowerCase().replace(/\s/g,'_')}`,
            email_verified: !!signupData.user?.email_confirmed_at,
            created_at: new Date().toISOString(),
          }),
        });
      } catch (dbErr) {
        // Non-critical — user still registered in auth.users
        console.warn('Could not insert into users table:', dbErr);
      }

      // ── 4. Signup OK con session ──────────────────────────────
      if (accessToken && signupData.user) {
        saveAndGo(signupData.user.id, signupData.user.email, accessToken, signupData.refresh_token);
        return;
      }

      // ── 5. Confirm email ON → intentar login ─────────────────
      const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginRes.json();
      if (loginRes.ok && loginData.access_token) {
        saveAndGo(loginData.user.id, loginData.user.email, loginData.access_token, loginData.refresh_token);
        return;
      }

      // ── 6. Fallback — entra de todas formas ──────────────────
      saveAndGo(userId, email);

    } catch (err: any) {
      console.error('Register error:', err);
      setError('Error de conexión. Verifica tu internet e inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-v3-page">
      <style>{`.auth-v3-login{color:#fff;font-weight:800;border-color:rgba(239,74,168,.75);background:linear-gradient(110deg,#ef4aa8,#b557f3);box-shadow:0 10px 25px rgba(239,74,168,.22)}.auth-v3-login-bottom{margin-top:17px;min-height:45px;display:flex;align-items:center;justify-content:center;gap:6px;border:1px solid rgba(239,74,168,.4);border-radius:11px;background:rgba(239,74,168,.08);color:#c5b8cc;font-size:11px;text-decoration:none}.auth-v3-login-bottom strong{color:#ef64b3}`}</style>
      <header className="auth-v3-header">
        <Link to="/" className="auth-v3-brand">
          <img src="/logo-brand.png" alt="MixingMusic.AI" />
          <span>V3</span>
        </Link>
        <Link to={loginTarget} className="auth-v3-login">Ya tengo cuenta</Link>
      </header>

      <div className="auth-v3-shell">
        <section className="auth-v3-story">
          <span className="auth-v3-kicker">TU ESTUDIO IA EN EL NAVEGADOR</span>
          <h1>De tus pistas a un sonido <strong>listo para publicar.</strong></h1>
          <p>Crea mezclas desde stems, mejora una premezcla o masteriza un álbum completo con los presets de MixingMusic.</p>
          <div className="auth-v3-paths">
            <div><i>01</i><strong>Crear una mezcla</strong><span>Hasta 12 stems</span></div>
            <div><i>02</i><strong>Masterizar</strong><span>1 master MP3 gratis</span></div>
            <div><i>03</i><strong>Modo álbum</strong><span>Hasta 12 canciones</span></div>
          </div>
          <div className="auth-v3-proof"><span>GRA</span><p><strong>Global Recognition Award 2026</strong>Innovación en IA aplicada a la producción musical.</p></div>
        </section>

        <section className="auth-v3-card">
          <div className="auth-v3-card-head">
            <span>CUENTA GRATUITA</span>
            <h2>Crea tu cuenta</h2>
            <p>{requestedMode === 'checkout' ? 'Activa Unlimited después de ingresar.' : requestedMode === 'album' ? 'Prepara el master coherente de tu álbum.' : requestedMode === 'master' ? 'Prepara y descarga tu primer master.' : 'Crea tus primeras mezclas desde stems.'}</p>
          </div>

          {error && (
            <div className="auth-v3-error"><span>!</span><p>
                {error}
                {error.includes('registrado') && <>{' '}<Link to={loginTarget}>Iniciar sesión →</Link></>}
            </p></div>
          )}

          <form onSubmit={handleSubmit} className="auth-v3-form">
            <div className="auth-v3-two">
              {[{ label:'Nombre *', name:'firstName', ph:'Tu nombre' }, { label:'Apellido *', name:'lastName', ph:'Tu apellido' }].map(f => (
                <label key={f.name}>{f.label}<input type="text" name={f.name} value={(form as any)[f.name]} onChange={onChange} placeholder={f.ph} disabled={loading} required /></label>
              ))}
            </div>
            <label>Correo electrónico *<input type="email" name="email" value={form.email} onChange={onChange} placeholder="tu@email.com" disabled={loading} required autoComplete="email" /></label>
            <label>Contraseña *<input type="password" name="password" value={form.password} onChange={onChange} placeholder="Mínimo 6 caracteres" disabled={loading} required minLength={6} autoComplete="new-password" /></label>
            <label>País<select name="country" value={form.country} onChange={onChange} disabled={loading}>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select></label>
            <button type="submit" disabled={loading} className="auth-v3-submit">
              {loading ? 'Creando cuenta…' : 'Crear cuenta y continuar →'}
            </button>
          </form>
          <div className="auth-v3-included"><span>✓ 3 mezclas desde stems</span><span>✓ 1 master MP3</span><span>✓ Sin tarjeta</span></div>
          <p className="auth-v3-legal">Al continuar aceptas los <Link to="/terms">Términos</Link> y la <Link to="/privacy">Privacidad</Link>.</p>
          <Link to={loginTarget} className="auth-v3-login-bottom">¿Ya tienes cuenta? <strong>Iniciar sesión →</strong></Link>
        </section>
      </div>
    </main>
  );
};

export default RegisterPage;
