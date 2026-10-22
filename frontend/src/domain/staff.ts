import type { CouponKind, CouponStatus, ThemeKey } from './types';

/** Rol de quien entra. null = cliente (no está en staff). Lo decide la BD (my_role). */
export type StaffRole = 'superadmin' | 'owner' | 'manager' | 'cashier';
export type Role = StaffRole | null;

export const isAdminRole = (r: Role): boolean => r === 'superadmin' || r === 'owner' || r === 'manager';
export const isStaffRole = (r: Role): boolean => r !== null;

/** Resumen de un cliente tal como lo regresan las RPC del panel (private.customer_summary). */
export interface CustomerSummary {
  id: string;
  code: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  created_at: string;
  group: { id: string; name: string; prefix: string; theme: ThemeKey | null; benefit: string | null };
  tier: { code: string; name: string; expires_at: string | null };
  visits_count: number;
  visits_goal: number;
  visited_today: boolean;
  last_visit_at: string | null;
  rewards_ready: number;
  reward_name: string | null;
  // spec 004
  journey_status?: 'open' | 'complete';
  coupons_available?: number;
  coupon_redeemed_today?: boolean;
  needs_review?: number;
}

export interface StaffVisit { id: string; visited_at: string; source: 'loyverse' | 'manual'; added_by: string | null; receipt?: string | null; current?: boolean }
export interface StaffCoupon {
  id: string; kind: CouponKind; status: CouponStatus; issued_at: string; valid_from: string; expires_at: string;
  redeemed_at: string | null; redeemed_by: string | null; needs_review: boolean; review_note: string | null; note: string | null;
  source_receipt: string | null; redeemed_receipt: string | null;
}
export interface StaffReceipt {
  id: string; number: string; at: string; paid: number | null; regular: number | null; dining: string | null;
  status: string; reason: string | null; reversed_at: string | null; reverse_reason: string | null;
}
export interface ReviewItem extends StaffCoupon { customer: CustomerSummary }
export interface ProgramSettings {
  goal: number; stamp_min: number; bakery_min: number; coldfoam_min: number; drink_days: number; bakery_days: number; coldfoam_days: number;
  drink_discount_id: string | null; bakery_discount_id: string | null; coldfoam_discount_id: string | null;
  promo_category_ids: string[]; dining_options_counted: string[] | null; updated_at: string;
}
export interface ProgramData {
  settings: ProgramSettings;
  categories: { id: string; name: string }[];
  dining_options: string[];
  discounts: Discount[];
}
export interface ProgramInput {
  drink_discount_id: string; bakery_discount_id: string; coldfoam_discount_id: string;
  promo_category_ids: string[]; dining_options_counted: string[] | null;
}
export interface PromotionRow { id: string; title: string; subtitle: string | null; image_url: string | null; sort: number; active: boolean }
export type RedeemResult = 'redeemed' | 'not_available' | 'expired' | 'not_yet' | 'daily_limit';
export interface CustomerDetail extends CustomerSummary { visits: StaffVisit[]; coupons?: StaffCoupon[]; receipts?: StaffReceipt[] }

export interface AdminDashboard {
  customers_total: number;
  new_this_month: number;
  visits_today: number;
  visits_month: number;
  rewards_earned_month: number;
  rewards_redeemed_month: number;
  rewards_pending: number;
  premium_active: number;
  coupons?: Record<CouponKind, { issued_month: number; redeemed_month: number; available: number }>;
  needs_review?: number;
  journeys_complete?: number;
  groups: { id: string; name: string; prefix: string; theme: ThemeKey | null; customers: number }[];
}

export interface AdminGroup {
  id: string;
  name: string;
  prefix: string;
  theme: ThemeKey | null;
  benefit: string | null;
  welcome_message: string | null;
  active: boolean;
  is_default: boolean;
  registration_token: string;
  customers: number;
  reward: { discount_id: string | null; description: string | null; discount_name: string | null } | null;
}

export interface Discount { id: string; name: string; type: string; value: number | null }

export interface GroupInput {
  id: string | null;
  name: string;
  prefix: string;
  theme: ThemeKey;
  benefit: string;
  welcome: string;
  discount_id: string;
  reward_text: string;
  active: boolean;
}

export const THEME_LABELS: Record<ThemeKey, string> = {
  classic: 'Clásico (verde)',
  sport: 'Deportivo (negro)',
  notebook: 'Cuaderno (naranja)',
  waves: 'Olas (azul)',
};
