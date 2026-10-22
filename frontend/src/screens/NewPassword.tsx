import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandMark, ErrorNote, Page } from '../components/Layout';
import { api } from '../data';
import { AppError } from '../domain/types';
import { useApp } from '../lib/app-context';

/** Llega aquí desde el correo "Restablecer contraseña": Supabase abre una sesión temporal y aquí se pone la nueva. */
export function NewPassword() {
  const nav = useNavigate();
  const { ready, session, refresh } = useApp();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [waited, setWaited] = useState(false);

  // El enlace tarda un instante en convertirse en sesión; damos 3 s antes de decir que venció.
  useEffect(() => { const t = window.setTimeout(() => setWaited(true), 3000); return () => window.clearTimeout(t); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    if (pw.length < 6) { setErr('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (pw !== pw2) { setErr('Las contraseñas no coinciden.'); return; }
    setBusy(true);
    try { await api.updatePassword(pw); await refresh(); nav('/', { replace: true }); }
    catch (ex) { setErr(ex instanceof AppError ? ex.message : 'No se pudo cambiar la contraseña.'); }
    finally { setBusy(false); }
  };

  const expired = ready && !session && waited;

  return (
    <Page back={<Link to={session ? '/cuenta' : '/entrar'} className="back">← Volver</Link>}>
      <div className="hero hero--tight">
        <BrandMark small />
        <h1 className="h2">Nueva contraseña</h1>
        {expired ? (
          <>
            <p className="lede">El enlace ya venció o ya se usó.</p>
            <Link to="/entrar" className="btn btn--primary btn--block">Pedir otro enlace</Link>
          </>
        ) : !session ? (
          <p className="lede">Verificando tu enlace…</p>
        ) : (
          <form onSubmit={submit} className="stack">
            <p className="lede">Escribe tu nueva contraseña para {session.email}.</p>
            <input type="email" autoComplete="username" value={session.email ?? ''} readOnly hidden />
            <label className="field"><span>Nueva contraseña</span><input type="password" autoComplete="new-password" minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} required autoFocus /></label>
            <label className="field"><span>Repite la contraseña</span><input type="password" autoComplete="new-password" minLength={6} value={pw2} onChange={(e) => setPw2(e.target.value)} required /></label>
            <ErrorNote message={err} />
            <button className="btn btn--primary btn--block" disabled={busy}>{busy ? 'Guardando…' : 'Guardar y entrar'}</button>
          </form>
        )}
      </div>
    </Page>
  );
}
