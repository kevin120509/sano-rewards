import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/Layout';
import { StaffShell } from './components/StaffShell';
import { isAdminRole, type Role } from './domain/staff';
import { useApp } from './lib/app-context';
import { Account } from './screens/Account';
import { CardScreen } from './screens/CardScreen';
import { Conditions } from './screens/Conditions';
import { Complete } from './screens/Complete';
import { History } from './screens/History';
import { Join } from './screens/Join';
import { Login } from './screens/Login';
import { NewPassword } from './screens/NewPassword';
import { Privacy } from './screens/Privacy';
import { Welcome } from './screens/Welcome';
import { AdminCustomers } from './screens/staff/AdminCustomers';
import { AdminGroups } from './screens/staff/AdminGroups';
import { AdminProgram } from './screens/staff/AdminProgram';
import { AdminSummary } from './screens/staff/AdminSummary';
import { Mostrador } from './screens/staff/Mostrador';

/** Pantalla de inicio del personal según su rol. */
const staffHome = (r: Role) => (isAdminRole(r) ? '/admin' : '/mostrador');

/** Decide a dónde va cada persona según su estado. */
function Home() {
  const { ready, session, card, profile, role } = useApp();
  if (!ready) return <p className="splash">Cargando…</p>;
  if (!session) return <Welcome />;
  if (role) return <Navigate to={staffHome(role)} replace />;
  if (card && profile?.phone) return <Navigate to="/tarjeta" replace />;
  return <Navigate to="/completar" replace />;
}

function RequireCard({ children }: { children: React.ReactNode }) {
  const { ready, session, card, profile, role } = useApp();
  if (!ready) return <p className="splash">Cargando…</p>;
  if (!session) return <Navigate to="/entrar" replace />;
  if (role) return <Navigate to={staffHome(role)} replace />;
  // Teléfono obligatorio: quien entró con Google o se registró antes sin teléfono lo completa aquí.
  if (!card || !profile?.phone) return <Navigate to="/completar" replace />;
  return <>{children}</>;
}

/** Solo clientes con sesión (completar datos). El personal no saca tarjeta. */
function RequireSession({ children }: { children: React.ReactNode }) {
  const { ready, session, role } = useApp();
  if (!ready) return <p className="splash">Cargando…</p>;
  if (!session) return <Navigate to="/entrar" replace />;
  if (role) return <Navigate to={staffHome(role)} replace />;
  return <>{children}</>;
}

/** Panel del personal. admin=true: solo dueña/encargado/CODIA; la caja va al Mostrador. */
function RequireStaff({ admin = false, children }: { admin?: boolean; children: React.ReactNode }) {
  const { ready, session, role } = useApp();
  if (!ready) return <p className="splash">Cargando…</p>;
  if (!session) return <Navigate to="/entrar" replace />;
  if (!role) return <Navigate to="/" replace />;
  if (admin && !isAdminRole(role)) return <Navigate to="/mostrador" replace />;
  return <>{children}</>;
}

/** Cada pantalla nueva empieza arriba; sin esto, Condiciones se abría a media página. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export function App() {
  return (
    <>
    <ScrollToTop />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/r/:token" element={<Join />} />
      <Route path="/entrar" element={<Login />} />
      <Route path="/privacidad" element={<Privacy />} />
      <Route path="/condiciones" element={<Conditions />} />
      <Route path="/nueva-contrasena" element={<NewPassword />} />
      <Route path="/completar" element={<RequireSession><Complete /></RequireSession>} />
      <Route element={<RequireCard><AppShell /></RequireCard>}>
        <Route path="/tarjeta" element={<CardScreen />} />
        <Route path="/historial" element={<History />} />
        <Route path="/cuenta" element={<Account />} />
      </Route>
      <Route element={<RequireStaff><StaffShell /></RequireStaff>}>
        <Route path="/mostrador" element={<Mostrador />} />
        <Route path="/admin" element={<RequireStaff admin><AdminSummary /></RequireStaff>} />
        <Route path="/admin/clientes" element={<RequireStaff admin><AdminCustomers /></RequireStaff>} />
        <Route path="/admin/grupos" element={<RequireStaff admin><AdminGroups /></RequireStaff>} />
        <Route path="/admin/programa" element={<RequireStaff admin><AdminProgram /></RequireStaff>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
