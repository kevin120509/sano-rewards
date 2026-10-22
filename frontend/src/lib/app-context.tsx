import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../data';
import type { CardView, GroupPublic, Profile, Session } from '../domain/types';
import { applyTheme, buildTheme } from '../domain/themes';
import type { Role } from '../domain/staff';

const PENDING_KEY = 'sano.pendingToken';

export const pendingToken = {
  get(): string | null { try { return localStorage.getItem(PENDING_KEY); } catch { return null; } },
  set(t: string) { try { localStorage.setItem(PENDING_KEY, t); } catch { /* ignore */ } },
  clear() { try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ } },
};

interface Ctx {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  card: CardView | null;
  /** Rol del personal (null = cliente). Personal nunca ve el flujo de cliente. */
  role: Role;
  /** Grupo visible antes de tener tarjeta (landing del QR). */
  previewGroup: GroupPublic | null;
  setPreviewGroup(g: GroupPublic | null): void;
  refresh(): Promise<void>;
}

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [card, setCard] = useState<CardView | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [previewGroup, setPreviewGroup] = useState<GroupPublic | null>(null);

  const load = useCallback(async (s: Session | null) => {
    if (!s) { setSession(null); setProfile(null); setCard(null); setRole(null); return; }
    // my_role va primero: si es personal, también reclama su invitación y no se le busca tarjeta.
    // La sesión se publica al final, junto con el rol, para que nadie del personal pase ni un instante por el flujo de cliente.
    const r = await api.myRole().catch(() => null);
    const [p, c] = await Promise.all([api.getProfile().catch(() => null), r ? Promise.resolve(null) : api.myCard().catch(() => null)]);
    setRole(r); setProfile(p); setCard(c); setSession(s);
  }, []);

  const refresh = useCallback(async () => { await load(await api.getSession()); }, [load]);

  useEffect(() => {
    let alive = true;
    api.getSession().then((s) => load(s)).finally(() => alive && setReady(true));
    const off = api.onAuthChange((s) => { void load(s); });
    return () => { alive = false; off(); };
  }, [load]);

  // Piel: en la página de un QR manda el grupo de ese QR; si no, la tarjeta del cliente; si no, clásico.
  useEffect(() => {
    applyTheme(previewGroup ? buildTheme(previewGroup, null) : buildTheme(card?.group, card));
  }, [card, previewGroup]);

  const value = useMemo(() => ({ ready, session, profile, card, role, previewGroup, setPreviewGroup, refresh }), [ready, session, profile, card, role, previewGroup, refresh]);
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp fuera de AppProvider');
  return c;
}
