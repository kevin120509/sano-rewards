import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BrandMark, ErrorNote, Page } from '../components/Layout';
import { Showcase } from '../components/Showcase';
import { api } from '../data';
import { normalizePhone } from '../domain/card';
import { AppError } from '../domain/types';
import { pendingToken, useApp } from '../lib/app-context';

/** Último paso: nombre + teléfono (obligatorio) y creación de la tarjeta en el grupo del QR.
 *  Aplica a los tres accesos (código, contraseña y Google): Google no entrega el teléfono. */
export function Complete() {
  const nav = useNavigate();
  const { profile, card, previewGroup, refresh } = useApp();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const full = name.trim().replace(/\s+/g, ' ');
    if (full.length < 2) { setErr('Escribe tu nombre.'); return; }
    if (!phone.trim()) { setErr('Escribe tu número de teléfono.'); return; }
    const normalized = normalizePhone(phone);
    if (!normalized) { setErr('El teléfono debe tener entre 10 y 15 dígitos.'); return; }
    setBusy(true); setErr(null);
    try {
      await api.updateProfile({ full_name: full, phone: normalized });
      if (!card) await api.registerCustomer(pendingToken.get());
      pendingToken.clear();
      await refresh();
      nav('/tarjeta', { replace: true });
    } catch (ex) {
      setErr(ex instanceof AppError ? ex.message : 'No pudimos crear tu tarjeta. Inténtalo de nuevo.');
      if (ex instanceof AppError && ex.code === 'invalid_qr') pendingToken.clear();
    } finally { setBusy(false); }
  };

  if (card && profile?.phone) return <Navigate to="/tarjeta" replace />;

  return (
    <Page showcase={<Showcase group={previewGroup ? { name: previewGroup.group_name, prefix: previewGroup.prefix, theme: previewGroup.theme ?? null } : null} />}>
      <div className="hero hero--tight">
        <BrandMark small />
        {previewGroup && <span className="badge">{previewGroup.group_name}</span>}
        <h1 className="h2">Casi listo</h1>
        <p className="lede">{card ? 'Solo falta tu teléfono para tener tu tarjeta completa.' : 'Dinos tu nombre y teléfono para armar tu tarjeta.'}</p>
        <form onSubmit={submit} className="stack">
          <label className="field"><span>Nombre completo</span><input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required /></label>
          <label className="field"><span>Teléfono celular</span><input type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="999 123 4567" required /></label>
          <ErrorNote message={err} />
          <button className="btn btn--primary btn--block" disabled={busy}>{busy ? 'Guardando…' : card ? 'Guardar' : 'Crear mi tarjeta'}</button>
        </form>
        <p className="muted small center">Usamos tus datos solo para tu tarjeta de lealtad. <a href="/privacidad">Aviso de privacidad</a>.</p>
      </div>
    </Page>
  );
}
