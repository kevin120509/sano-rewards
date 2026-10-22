import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BrandMark, ErrorNote, Page } from '../components/Layout';
import { PreviewCard } from '../components/PreviewCard';
import { Showcase } from '../components/Showcase';
import { api } from '../data';
import { pendingToken, useApp } from '../lib/app-context';
import type { GroupPublic } from '../domain/types';
import { resolveTheme } from '../domain/card';
import { GROUP_COPY } from '../domain/groupCopy';

/** Aterrizaje del QR de un grupo: muestra su diseño y guarda el token para el registro. */
export function Join() {
  const { token = '' } = useParams();
  const nav = useNavigate();
  const { setPreviewGroup, session, card } = useApp();
  const [group, setGroup] = useState<GroupPublic | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'invalid' | 'error'>('loading');

  useEffect(() => {
    let alive = true;
    api.getGroupByToken(token)
      .then((g) => { if (!alive) return; if (!g) { setState('invalid'); return; } setGroup(g); setPreviewGroup(g); pendingToken.set(token); setState('ok'); })
      .catch(() => alive && setState('error'));
    return () => { alive = false; };
  }, [token, setPreviewGroup]);

  if (state === 'loading') return <Page><p className="center muted splash">Cargando tu invitación…</p></Page>;
  if (state !== 'ok' || !group) {
    return (
      <Page>
        <div className="hero">
          <BrandMark />
          <h1 className="hero__title">Este QR no funciona</h1>
          <ErrorNote message={state === 'invalid' ? 'El código no es válido o ya no está activo. Pide al personal que te muestre el QR correcto.' : 'No pudimos conectar. Revisa tu internet e inténtalo de nuevo.'} />
          <Link className="btn btn--ghost btn--block" to="/">Volver al inicio</Link>
        </div>
      </Page>
    );
  }

  const already = !!session && !!card;
  const g = { name: group.group_name, prefix: group.prefix, theme: group.theme ?? null };
  const copy = GROUP_COPY[resolveTheme(g)];
  // En el grupo de empresa el resaltado lleva el nombre del grupo ("el equipo OZON").
  const highlight = resolveTheme(g) === 'waves' ? `${copy.highlight} ${group.group_name}` : copy.highlight;
  return (
    <Page showcase={<Showcase group={g} />}>
      <div className="hero join">
        <div className="auth__top"><BrandMark /><span className="badge">{group.group_name}</span></div>
        <p className="join__eyebrow">{copy.eyebrow}</p>
        <h1 className="hero__title">{copy.title} <em>{highlight}</em></h1>
        <p className="lede">Crea tu tarjeta gratis en menos de un minuto: entra con <b>Google</b> o con tu <b>correo</b>.</p>
        <div className="only-compact" aria-hidden="true"><PreviewCard group={g} /></div>
        <ul className="perks">
          {copy.perks.map((p) => <li key={p}>{p}</li>)}
        </ul>
        {already && card && card.group.name !== group.group_name && (
          <p className="note note--info" role="status">
            Ya tienes tu tarjeta de <b>{card.group.name}</b> ({card.code}). Cada cuenta tiene un solo grupo, así que sigues en ese grupo con tus visitas.
          </p>
        )}
        {already
          ? <button className="btn btn--primary btn--block" onClick={() => nav('/tarjeta')}>Ver mi tarjeta</button>
          : <button className="btn btn--primary btn--block" onClick={() => nav(session ? '/completar' : '/entrar')}>{copy.cta}</button>}
        {!session && <p className="muted center">¿Ya tienes tarjeta? <Link to="/entrar">Entra aquí</Link></p>}
      </div>
    </Page>
  );
}
