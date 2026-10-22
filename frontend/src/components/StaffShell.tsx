import { useEffect, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../data';
import { isAdminRole } from '../domain/staff';
import { useApp } from '../lib/app-context';
import { BrandMark } from './Layout';

const ROLE_NAMES: Record<string, string> = { superadmin: 'CODIA', owner: 'Administración', manager: 'Encargado', cashier: 'Caja' };

const svg = (d: ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const ICONS = {
  resumen: svg(<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>),
  clientes: svg(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.8.7 3 2.5 3.5 5.2" /></>),
  grupos: svg(<><path d="M4 7h16M4 12h16M4 17h10" /></>),
  programa: svg(<><path d="M20 12v8H4v-8M2 8h20v4H2zM12 8v12M12 8C9.5 8 8 5 10 4.5S12 8 12 8zm0 0c2.5 0 4-3 2-3.5S12 8 12 8z" /></>),
  mostrador: svg(<><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>),
} as const;

interface NavItem { to: string; label: string; icon: ReactNode; end?: boolean }

/** Cascarón del personal: Administración (dueña) y Mostrador (mesero/caja). Mismo enlace, el rol lo decide la BD.
 *  Compu/tablet horizontal: menú vertical a la izquierda. Teléfono: barra de pestañas abajo. */
export function StaffShell() {
  const { role, session, setPreviewGroup, refresh } = useApp();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const reduce = useReducedMotion();
  useEffect(() => setPreviewGroup(null), [setPreviewGroup]);
  const admin = isAdminRole(role);
  const links: NavItem[] = admin
    ? [
        { to: '/admin', label: 'Resumen', icon: ICONS.resumen, end: true },
        { to: '/admin/clientes', label: 'Clientes', icon: ICONS.clientes },
        { to: '/admin/grupos', label: 'Grupos', icon: ICONS.grupos },
        { to: '/admin/programa', label: 'Programa', icon: ICONS.programa },
        { to: '/mostrador', label: 'Mostrador', icon: ICONS.mostrador },
      ]
    : [];
  const logout = async () => { await api.signOut(); await refresh(); nav('/', { replace: true }); };
  const roleName = ROLE_NAMES[role ?? ''] ?? 'Personal';
  const email = session?.email ?? '';

  const account = (
    <>
      <span className="sp-user__email" title={email}>{email}</span>
      <Link to="/nueva-contrasena" className="sp-user__action">Contraseña</Link>
      <button className="sp-user__action" onClick={logout}>Salir</button>
    </>
  );

  return (
    <div className={`sp ${links.length ? 'sp--menu' : 'sp--solo'}`}>
      {links.length > 0 && (
        <aside className="sp-aside">
          <div className="sp-aside__brand">
            <BrandMark small />
            <span className="sp-role">{roleName}</span>
          </div>
          <nav className="sp-menu" aria-label="Panel">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className="sp-menu__link">
                {({ isActive }) => (
                  <>
                    {isActive && <motion.span layoutId="sp-menu-pill" className="sp-menu__pill" transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 38 }} />}
                    <span className="sp-menu__icon">{l.icon}</span><span className="sp-menu__label">{l.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="sp-aside__user">{account}</div>
        </aside>
      )}
      <div className="sp-body">
        <header className="sp-top">
          <div className="sp-top__brand">
            <BrandMark small />
            <span className="sp-role">{roleName}</span>
          </div>
          <div className="sp-top__user">{account}</div>
        </header>
        <main className="sp-main">
          <motion.div key={pathname} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
