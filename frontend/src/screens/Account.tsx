import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ErrorNote } from '../components/Layout';
import { api } from '../data';
import { PUSH_ENABLED } from '../config/brand';
import { normalizePhone } from '../domain/card';
import { AppError } from '../domain/types';
import { disablePush, enablePush, pushEnabled, pushSupported } from '../lib/notifications';
import { useApp } from '../lib/app-context';

export function Account() {
  const nav = useNavigate();
  const { profile, card, session, refresh } = useApp();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [push, setPush] = useState(false);
  const [pushMsg, setPushMsg] = useState<string | null>(null);

  useEffect(() => { setName(profile?.full_name ?? ''); setPhone(profile?.phone ?? ''); }, [profile]);
  useEffect(() => { void pushEnabled().then(setPush); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null); setSaved(false);
    const n = normalizePhone(phone);
    if (name.trim().length < 2) { setErr('Escribe tu nombre.'); return; }
    if (!n) { setErr('Escribe un teléfono de 10 a 15 dígitos.'); return; }
    try { await api.updateProfile({ full_name: name.trim(), phone: n }); await refresh(); setSaved(true); }
    catch (ex) { setErr(ex instanceof AppError ? ex.message : 'No se pudo guardar.'); }
  };

  const togglePush = async () => {
    setPushMsg(null);
    if (push) { await disablePush(); setPush(false); return; }
    const r = await enablePush();
    if (r === 'ok') setPush(true);
    else setPushMsg({ denied: 'Bloqueaste las notificaciones en el navegador. Actívalas desde los permisos del sitio.', unsupported: 'Este navegador no admite notificaciones. En iPhone, agrega la app a tu pantalla de inicio primero.', 'no-key': 'Las notificaciones aún no están configuradas en el servidor.' }[r] ?? null);
  };

  const logout = async () => { await api.signOut(); await refresh(); nav('/', { replace: true }); };

  return (
    <div className="screen">
      <h1 className="h2">Mi cuenta</h1>
      {card && (
        <section className="tile account-card">
          <h3>Mi tarjeta</h3>
          <dl className="kv">
            <div><dt>Código</dt><dd><b>{card.code}</b></dd></div>
            <div><dt>Grupo</dt><dd>{card.group.name}</dd></div>
            <div><dt>Sellos</dt><dd>{card.journey_status === 'complete' ? 'Tarjeta completa · bebida gratis pendiente' : `${card.visits_count} de ${card.visits_goal}`}</dd></div>
            <div><dt>Cupones vigentes</dt><dd>{(card.coupons ?? []).filter((c) => c.status === 'available').length}</dd></div>
          </dl>
        </section>
      )}
      <form className="tile stack" onSubmit={save}>
        <h3>Mis datos</h3>
        <label className="field"><span>Nombre</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="field"><span>Teléfono celular</span><input type="tel" inputMode="tel" autoComplete="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="999 123 4567" /></label>
        <label className="field"><span>Correo</span><input value={session?.email ?? ''} disabled /></label>
        <ErrorNote message={err} />
        <button className="btn btn--primary">Guardar cambios</button>
        {saved && <p className="note" role="status">Cambios guardados.</p>}
      </form>

      <section className="tile stack">
        <h3>Contraseña</h3>
        <p className="muted">Crea o cambia la contraseña para entrar con tu correo.</p>
        <Link to="/nueva-contrasena" className="btn btn--ghost">Cambiar contraseña</Link>
      </section>

      {PUSH_ENABLED && (
        <section className="tile">
          <h3>Avisos</h3>
          <p className="muted">Te avisamos cuando te falte poco para tu premio y cuando un cupón esté por vencer.</p>
          {pushSupported() || pushMsg
            ? <button className={`btn ${push ? 'btn--ghost' : 'btn--primary'}`} onClick={togglePush}>{push ? 'Desactivar notificaciones' : 'Activar notificaciones'}</button>
            : <p className="note">Tu navegador no admite notificaciones; te avisaremos por correo.</p>}
          {pushMsg && <p className="note">{pushMsg}</p>}
        </section>
      )}


      <button className="btn btn--ghost btn--block" onClick={logout}>Cerrar sesión</button>
    </div>
  );
}
