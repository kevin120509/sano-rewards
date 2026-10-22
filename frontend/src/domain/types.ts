export type ThemeKey = 'classic' | 'sport' | 'notebook' | 'waves';
/** Diseño del cliente (spec 004): por ahora uno solo para todos los grupos. */
export type AppSkin = 'sano';
export type TierCode = 'consentido' | 'premium';

export interface GroupInfo {
  name: string;
  prefix: string;
  primary_color: string;
  accent_color: string;
  welcome_message?: string | null;
  /** Aún no existe en la BD (migración 003). Si falta, se deduce por nombre. */
  theme?: ThemeKey | null;
}

export interface GroupPublic extends GroupInfo {
  business_name: string;
  group_name: string;
}

export interface RewardReady {
  card_id: string;
  completed_at: string;
  discount_name: string | null;
  description: string | null;
}

export interface CardView {
  code: string;
  full_name: string;
  group: GroupInfo;
  tier: { code: TierCode; name: string; expires_at: string | null };
  visits_count: number;
  visits_goal: number;
  /** Ya no hay cierre mensual (spec 004): llega null. */
  period_ends_at: string | null;
  rewards_ready: RewardReady[];
  recent_visits: string[];
  /** Fecha y hora de cada visita de la tarjeta actual, en orden (migración 011). */
  card_visits?: string[];
  /** Aún no existe en la BD (migración 003). */
  next_reward?: { name: string; description?: string | null } | null;
  // ── Tarjeta básica (spec 004) ──
  phone?: string | null;
  email?: string | null;
  /** 'complete' = juntó los 7 sellos y la bebida está pendiente (no suma sellos). */
  journey_status?: 'open' | 'complete';
  coupons?: Coupon[];
  coupon_redeemed_today?: boolean;
  promotions?: Promotion[];
  rules?: ProgramRules;
}

export type CouponKind = 'drink' | 'bakery' | 'coldfoam';
export type CouponStatus = 'available' | 'redeemed' | 'expired' | 'voided';
export interface Coupon {
  id: string;
  kind: CouponKind;
  status: CouponStatus;
  issued_at: string;
  /** Fecha (AAAA-MM-DD, hora de Progreso) desde la que se puede canjear. */
  valid_from: string;
  expires_at: string;
  redeemed_at: string | null;
}
export interface Promotion { id: string; title: string; subtitle: string | null; image_url: string | null }
export interface ProgramRules {
  goal: number; stamp_min: number; bakery_min: number; coldfoam_min: number;
  drink_days: number; bakery_days: number; coldfoam_days: number;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
}

export interface Session {
  userId: string;
  email: string | null;
}

export class AppError extends Error {
  constructor(public code: 'invalid_qr' | 'not_signed_in' | 'invalid_phone' | 'rate_limit' | 'invalid_code' | 'network' | 'unknown', message: string) {
    super(message);
  }
}
