import type { CardView, GroupInfo, ThemeKey } from './types';

export const TZ = 'America/Merida';

export function isPremium(card: Pick<CardView, 'tier'>): boolean {
  return card.tier.code === 'premium';
}

export interface Stamp { index: number; filled: boolean; isGift: boolean }

/** Casillas de la tarjeta: N visitas; la última es el regalo. */
export function stampsFor(card: Pick<CardView, 'visits_count' | 'visits_goal'>): Stamp[] {
  const goal = Math.max(1, card.visits_goal);
  const count = Math.min(Math.max(0, card.visits_count), goal);
  return Array.from({ length: goal }, (_, i) => ({ index: i + 1, filled: i < count, isGift: i === goal - 1 }));
}

export function visitsRemaining(card: Pick<CardView, 'visits_count' | 'visits_goal'>): number {
  return Math.max(0, card.visits_goal - card.visits_count);
}

export function progressPercent(card: Pick<CardView, 'visits_count' | 'visits_goal'>): number {
  if (card.visits_goal <= 0) return 0;
  return Math.min(100, Math.round((card.visits_count / card.visits_goal) * 100));
}

/** Fecha local (Mérida) como AAAA-MM-DD, para comparar "el mismo día". */
export function localDay(iso: string | Date, tz: string = TZ): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** El sistema cuenta máximo 1 visita al día. */
export function visitedToday(card: Pick<CardView, 'recent_visits'>, now: Date = new Date()): boolean {
  const last = card.recent_visits[0];
  return !!last && localDay(last) === localDay(now);
}

export function daysLeft(endsAtIso: string, now: Date = new Date()): number {
  const ms = new Date(endsAtIso).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }): string {
  return new Intl.DateTimeFormat('es-MX', { timeZone: TZ, ...opts }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

/** "9 oct" (para debajo de cada sello). */
export function formatDayMonth(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', { timeZone: TZ, day: 'numeric', month: 'short' }).format(new Date(iso)).replace('.', '');
}

/** "10:40 a.m." */
export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

/** "jueves 9 de octubre" */
export function formatLongDate(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso));
}

/** "octubre de 2026" (para agrupar el historial por mes). */
export function formatMonth(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', { timeZone: TZ, month: 'long', year: 'numeric' }).format(new Date(iso));
}

export function firstName(fullName: string | null | undefined): string {
  return (fullName ?? '').trim().split(/\s+/)[0] ?? '';
}

/** Mismo patrón que la BD: ^\+?[0-9]{10,15}$ */
export function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-().]/g, '');
  return /^\+?[0-9]{10,15}$/.test(cleaned) ? cleaned : null;
}

export function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

/** Deduce el diseño del grupo mientras la BD no tenga la columna theme. */
export function resolveTheme(group: Pick<GroupInfo, 'name' | 'theme'>): ThemeKey {
  if (group.theme) return group.theme;
  const n = group.name.toLowerCase();
  if (/gym|gimnas|fit|sport/.test(n)) return 'sport';
  if (/estudiant|escuel|univers/.test(n)) return 'notebook';
  if (/oso|ozo|empresa|corporat/.test(n)) return 'waves';
  return 'classic';
}

/** Lee el token del QR desde "…/r/<token>" o desde el token pelado. */
export function tokenFromInput(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  const m = t.match(/\/r\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : /^[A-Za-z0-9_-]{6,}$/.test(t) ? t : null;
}

/** Inclinación fija por casilla para que los sellos parezcan puestos a mano (mismo valor en cada render). */
export function stampTilt(index: number): number {
  const angles = [-14, 9, -6, 12, -10, 5, -12, 8];
  return angles[(index - 1) % angles.length];
}

/** Nombre del premio a mostrar: el configurado en la BD, si no, el genérico. */
export function rewardLabel(card: Pick<CardView, 'next_reward' | 'rewards_ready'>, fallback: string): string {
  return card.rewards_ready[0]?.discount_name || card.next_reward?.name || fallback;
}

/** Mensaje motivador según lo que falta. */
export function motivation(remaining: number): string {
  if (remaining <= 0) return '¡Lo lograste!';
  if (remaining === 1) return '¡En tu próxima visita es tuyo!';
  if (remaining <= 3) return '¡Ya casi lo tienes!';
  return 'Cada visita te acerca a tu premio';
}

/** "Octubre 2026" para la vigencia mensual de la tarjeta (el periodo termina el día 1 del mes siguiente). */
export function validityLabel(periodEndsAt: string): string {
  const end = new Date(new Date(periodEndsAt).getTime() - 60_000);
  const s = new Intl.DateTimeFormat('es-MX', { timeZone: TZ, month: 'long', year: 'numeric' }).format(end);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
