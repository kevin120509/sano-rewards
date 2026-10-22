import type { Coupon, CouponKind, ProgramRules } from './types';
import { TZ } from './card';

/** Reglas por defecto (PDF de la dueña, 12-oct-2026). La BD manda las reales en my_card.rules. */
export const DEFAULT_RULES: ProgramRules = {
  goal: 7, stamp_min: 65, bakery_min: 200, coldfoam_min: 250, drink_days: 30, bakery_days: 15, coldfoam_days: 30,
};

export const COUPON_INFO: Record<CouponKind, { title: string; detail: string; short: string }> = {
  drink: { title: 'Bebida gratis', short: 'Bebida', detail: 'Una bebida de hasta $98, sin compra adicional. Si cuesta más, pagas la diferencia.' },
  bakery: { title: 'Panadería gratis', short: 'Panadería', detail: 'Una galleta de chispas o pieza de panadería, al comprar una bebida a precio regular.' },
  coldfoam: { title: 'Cold foam gratis', short: 'Cold foam', detail: 'Una porción de cold foam en americano frío o latte frío (vainilla, caramelo o mocha).' },
};

/** Fecha local de Progreso en AAAA-MM-DD. */
export const todayLocal = (now: Date = new Date()): string => now.toLocaleDateString('en-CA', { timeZone: TZ });

export const fmtShort = (iso: string): string =>
  new Date(iso).toLocaleDateString('es-MX', { timeZone: TZ, day: 'numeric', month: 'short' }).replace('.', '');

/** El vencimiento se guarda como el instante en que termina; se muestra el último día válido. */
export const lastValidDay = (expiresAt: string): string => fmtShort(new Date(Date.parse(expiresAt) - 60_000).toISOString());

/** "2026-10-14" → "14 oct" sin brincar de día por zona horaria. */
export const fmtLocalDate = (ymd: string): string => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('es-MX', { timeZone: 'UTC', day: 'numeric', month: 'short' }).replace('.', '');
};

export type CouponState = 'ready' | 'soon' | 'redeemed' | 'expired';
export function couponState(c: Coupon, now: Date = new Date()): CouponState {
  if (c.status === 'redeemed') return 'redeemed';
  if (c.status !== 'available' || Date.parse(c.expires_at) <= now.getTime()) return 'expired';
  return c.valid_from > todayLocal(now) ? 'soon' : 'ready';
}

export function couponBadge(c: Coupon, now: Date = new Date()): string {
  const st = couponState(c, now);
  if (st === 'ready') return 'Disponible';
  if (st === 'soon') {
    const tomorrow = todayLocal(new Date(now.getTime() + 864e5));
    return c.valid_from === tomorrow ? 'Desde mañana' : `Desde el ${fmtLocalDate(c.valid_from)}`;
  }
  if (st === 'redeemed') return 'Canjeado';
  return 'Vencido';
}
