import { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BRAND } from '../config/brand';
import { useApp } from '../lib/app-context';
import { IconCard, IconClock, IconUser } from './Icons';

const LINKS = [
  { to: '/tarjeta', label: 'Tarjeta', icon: <IconCard /> },
  { to: '/historial', label: 'Historial', icon: <IconClock /> },
  { to: '/cuenta', label: 'Cuenta', icon: <IconUser /> },
];

/**
 * Cascarón de las pantallas con tarjeta.
 * Teléfono/tablet: barra superior compacta + pestañas abajo. Compu: barra superior con navegación.
 */
export function AppShell() {
  const { card, setPreviewGroup } = useApp();
  // Dentro de la app manda la tarjeta del cliente, no el QR que se vio antes.
  useEffect(() => setPreviewGroup(null), [setPreviewGroup]);
  return (
    <div className="shell">
      <header className="appbar">
        <div className="appbar__inner">
          <BrandMark small />
          <nav className="appbar__nav" aria-label="Navegación principal">
            {LINKS.map((l) => <NavLink key={l.to} to={l.to} className="appbar__link">{l.icon}<span>{l.label}</span></NavLink>)}
          </nav>
          {card && <span className="badge appbar__badge">{card.group.name}</span>}
        </div>
      </header>
      <main className="shell__main"><Outlet /></main>
      <nav className="tabbar" aria-label="Navegación">
        {LINKS.map((l) => <NavLink key={l.to} to={l.to} className="tab">{l.icon}<span>{l.label}</span></NavLink>)}
      </nav>
    </div>
  );
}

/**
 * Pantallas sin sesión (bienvenida, QR, login, datos).
 * En compu se parte en dos: contenido a la izquierda y vitrina (tarjeta de muestra) a la derecha.
 */
export function Page({ children, back, showcase }: { children: React.ReactNode; back?: React.ReactNode; showcase?: React.ReactNode }) {
  return (
    <div className={`page ${showcase ? 'page--split' : ''}`}>
      <div className="page__main">
        {back}
        {children}
      </div>
      {showcase && <aside className="page__showcase" aria-hidden="true">{showcase}</aside>}
    </div>
  );
}

export function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <div className={small ? 'brand brand--small' : 'brand'}>
      <img className="brand__img" src="/logo-hojas.svg" alt="" aria-hidden="true" style={{ height: small ? 26 : 32 }} />
      <img className="brand__img" src="/logo-sanobistro.svg" alt={BRAND.businessName} style={{ height: small ? 18 : 22 }} />
    </div>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="note note--error" role="alert">{message}</p>;
}
