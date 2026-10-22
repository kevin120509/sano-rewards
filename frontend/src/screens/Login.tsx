import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandMark, ErrorNote, Page } from '../components/Layout';
import { Showcase } from '../components/Showcase';
import { GoogleG } from '../components/Icons';
import { OTP_LENGTH } from '../config/brand';
import { api } from '../data';
import { isEmail, resolveTheme } from '../domain/card';
import { AppError } from '../domain/types';
import { useApp } from '../lib/app-context';

type Method = 'code' | 'password';
const OAUTH_FLAG = 'sano_oauth_pending';
const RESEND_SECONDS = 60; // Supabase solo deja pedir otro código cada 60 s

const msg = (e: unknown) => (e instanceof AppError ? e.message : 'Algo salió mal. Inténtalo de nuevo.');

/** Cuenta regresiva para reenviar el código. */
function useCountdown() {
  const [left, setLeft] = useState(0);
  const timer = useRef<number>();
  const start = (s: number) => {
    window.clearInterval(timer.current);
    setLeft(s);
    timer.current = window.setInterval(() => setLeft((v) => { if (v <= 1) { window.clearInterval(timer.current); return 0; } return v - 1; }), 1000);
  };
  useEffect(() => () => window.clearInterval(timer.current), []);
  return { left, start };
}

export function Login() {
  const nav = useNavigate();
  const { refresh, previewGroup, session, ready } = useApp();
  // Al volver de Google (OAuth) la sesión llega sola: mandamos a la tarjeta o a completar datos.
  // Si NO venimos de Google y ya hay sesión abierta, no redirigimos: mostramos "Usar otra cuenta".
  const fromOAuth = useRef(sessionStorage.getItem(OAUTH_FLAG) === '1' || /[?&#](code|access_token)=/.test(window.location.href));
  useEffect(() => {
    if (ready && session && fromOAuth.current) { sessionStorage.removeItem(OAUTH_FLAG); nav('/', { replace: true }); }
  }, [ready, session, nav]);
  const [method, setMethod] = useState<Method>('code');
  const [email, setEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const { left, start } = useCountdown();

  // Grupo del QR: se guarda en la cuenta nueva para que su correo salga con el diseño de su grupo.
  const meta = previewGroup
    ? { sano_group: previewGroup.group_name, sano_theme: resolveTheme({ name: previewGroup.group_name, theme: previewGroup.theme }), sano_prefix: previewGroup.prefix, sano_tier: 'consentido' }
    : undefined;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setErr(null); setInfo(null);
    try { await fn(); } catch (e) {
      setErr(msg(e));
      // Si Supabase dice "espera N segundos", arrancamos el contador con esos segundos.
      const n = e instanceof AppError && e.code === 'rate_limit' ? Number(e.message.match(/(\d+) segundos/)?.[1]) : NaN;
      if (n > 0) { start(n); setCodeSent(true); }
    } finally { setBusy(false); }
  };
  const done = async () => { await refresh(); nav('/', { replace: true }); };

  const google = () => run(async () => {
    sessionStorage.setItem(OAUTH_FLAG, '1');
    if (session) await api.signOut(); // cambiar de cuenta: cerramos la actual antes de ir a Google
    await api.signInWithGoogle();
  });
  const switchAccount = () => run(async () => { await api.signOut(); await refresh(); });
  const send = () => run(async () => {
    await api.sendEmailCode(email, meta);
    setCodeSent(true); setCode('');
    setInfo(`Te enviamos un código a ${email}. Revisa también la carpeta de spam.`);
    start(RESEND_SECONDS);
  });
  const sendCode = (e: React.FormEvent) => { e.preventDefault(); if (!isEmail(email)) { setErr('Escribe un correo válido.'); return; } void send(); };
  const verify = (e: React.FormEvent) => { e.preventDefault(); void run(async () => { await api.verifyEmailCode(email, code); await done(); }); };
  const pass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmail(email)) { setErr('Escribe un correo válido.'); return; }
    void run(async () => {
      if (creating) {
        const r = await api.signUpWithPassword(email, password, meta);
        if (r.needsEmailConfirm) { setInfo('Te enviamos un correo para confirmar tu cuenta. Ábrelo y luego entra aquí.'); return; }
      } else await api.signInWithPassword(email, password);
      await done();
    });
  };

  const forgot = () => {
    if (!isEmail(email)) { setErr('Escribe tu correo arriba y vuelve a tocar "¿Olvidaste tu contraseña?".'); return; }
    void run(async () => {
      await api.sendPasswordReset(email);
      setInfo(`Te enviamos un enlace a ${email} para crear una contraseña nueva. Revisa también spam.`);
      start(RESEND_SECONDS);
    });
  };

  const pct = left > 0 ? (left / RESEND_SECONDS) * 100 : 0;
  const mmss = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;

  return (
    <Page showcase={<Showcase group={previewGroup ? { name: previewGroup.group_name, prefix: previewGroup.prefix, theme: previewGroup.theme ?? null } : null} />} back={<Link to="/" className="back" aria-label="Volver">← Volver</Link>}>
      <div className="hero hero--tight auth">
        <div className="auth__top"><BrandMark small />{previewGroup && <span className="badge">{previewGroup.group_name}</span>}</div>
        <h1 className="h2">Entra a tu tarjeta</h1>
        {session && !fromOAuth.current && (
          <div className="note note--info stack" role="status">
            <span>Ya tienes la sesión abierta con <b>{session.email}</b>.</span>
            <div className="auth__links">
              <Link to="/" className="link">Ir a mi tarjeta</Link>
              <button type="button" className="link" onClick={switchAccount} disabled={busy}>Usar otra cuenta</button>
            </div>
          </div>
        )}
        <button className="btn btn--google btn--block" onClick={google} disabled={busy}><GoogleG /> Continuar con Google</button>
        <div className="divider"><span>o con tu correo</span></div>

        <div className="seg" role="tablist">
          <button role="tab" aria-selected={method === 'code'} className={method === 'code' ? 'on' : ''} onClick={() => { setMethod('code'); setErr(null); setInfo(null); }}>Código por correo</button>
          <button role="tab" aria-selected={method === 'password'} className={method === 'password' ? 'on' : ''} onClick={() => { setMethod('password'); setErr(null); setInfo(null); }}>Contraseña</button>
        </div>

        {method === 'code' && !codeSent && (
          <form onSubmit={sendCode} className="stack">
            <label className="field"><span>Correo electrónico</span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" required /></label>
            <button className="btn btn--primary btn--block" disabled={busy}>{busy ? 'Enviando…' : 'Enviarme un código'}</button>
          </form>
        )}
        {method === 'code' && codeSent && (
          <form onSubmit={verify} className="stack">
            {info && (
              <div className="sent" role="status">
                <span className="sent__icon" aria-hidden="true">✉️</span>
                <p>{info}</p>
              </div>
            )}
            <label className="field"><span>Código de {OTP_LENGTH} dígitos</span><input inputMode="numeric" autoComplete="one-time-code" maxLength={OTP_LENGTH} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))} placeholder={'•'.repeat(OTP_LENGTH)} className="otp" required autoFocus /></label>
            <button className="btn btn--primary btn--block" disabled={busy || code.length < OTP_LENGTH}>Entrar</button>

            <div className="resend">
              <button type="button" className="resend__btn" disabled={left > 0 || busy} onClick={() => void send()} style={{ ['--pct' as string]: `${pct}%` }}>
                <span className="resend__fill" aria-hidden="true" />
                <span className="resend__label">{left > 0 ? `Reenviar código en ${mmss}` : 'Reenviar código'}</span>
              </button>
              {left > 0 && <p className="resend__hint">Por seguridad, solo puedes pedir un código nuevo cada 60 segundos.</p>}
            </div>
            <button type="button" className="link" onClick={() => { setCodeSent(false); setCode(''); setInfo(null); setErr(null); }}>Usar otro correo</button>
          </form>
        )}
        {method === 'password' && (
          <form onSubmit={pass} className="stack">
            <label className="field"><span>Correo electrónico</span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
            <label className="field"><span>Contraseña</span><input type="password" autoComplete={creating ? 'new-password' : 'current-password'} minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
            <button className="btn btn--primary btn--block" disabled={busy}>{creating ? 'Crear cuenta' : 'Entrar'}</button>
            <div className="auth__links">
              <button type="button" className="link" onClick={() => setCreating(!creating)}>{creating ? 'Ya tengo cuenta' : 'Crear cuenta'}</button>
              {!creating && (
                <button type="button" className="link" disabled={busy || left > 0} onClick={forgot}>
                  {left > 0 ? `Otro enlace en ${mmss}` : '¿Olvidaste tu contraseña?'}
                </button>
              )}
            </div>
            {info && <p className="note" role="status">{info}</p>}
          </form>
        )}
        <ErrorNote message={err} />
        <p className="muted small center">Usa siempre el mismo correo: con Google, código o contraseña entras a la misma tarjeta.</p>
      </div>
    </Page>
  );
}
