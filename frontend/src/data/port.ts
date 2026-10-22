import type { CardView, GroupPublic, Profile, Session } from '../domain/types';
import type { AdminDashboard, AdminGroup, CustomerDetail, CustomerSummary, Discount, GroupInput, ProgramData, ProgramInput, PromotionRow, RedeemResult, ReviewItem, Role } from '../domain/staff';

/** Puerto: lo único que la UI conoce del backend (adaptador: Supabase, live.ts). */
export interface LoyaltyApi {
  getSession(): Promise<Session | null>;
  onAuthChange(cb: (s: Session | null) => void): () => void;
  signInWithGoogle(): Promise<void>;
  /** meta: grupo del QR (sano_theme, sano_group…) para que el correo de una cuenta NUEVA salga con su diseño. */
  sendEmailCode(email: string, meta?: Record<string, string>): Promise<void>;
  verifyEmailCode(email: string, code: string): Promise<void>;
  signInWithPassword(email: string, password: string): Promise<void>;
  signUpWithPassword(email: string, password: string, meta?: Record<string, string>): Promise<{ needsEmailConfirm: boolean }>;
  /** Manda el correo para restablecer la contraseña (olvidé mi contraseña). */
  sendPasswordReset(email: string): Promise<void>;
  /** Crea o cambia la contraseña de la sesión actual (también sirve a quien entró con Google o código). */
  updatePassword(password: string): Promise<void>;
  signOut(): Promise<void>;
  getGroupByToken(token: string): Promise<GroupPublic | null>;
  getProfile(): Promise<Profile | null>;
  updateProfile(p: { full_name: string; phone: string | null }): Promise<void>;
  registerCustomer(token: string | null): Promise<void>;
  myCard(): Promise<CardView | null>;
  savePushSubscription(sub: PushSubscriptionJSON): Promise<void>;
  removePushSubscription(endpoint: string): Promise<void>;

  // ── Personal del negocio (rol lo decide la BD; los clientes reciben null) ──
  myRole(): Promise<Role>;
  staffSearch(q: string): Promise<CustomerSummary[]>;
  staffDetail(customerId: string): Promise<CustomerDetail>;
  /** +1 sello manual (1 por día). */
  staffAddVisit(customerId: string): Promise<{ result: 'visit' | 'already_visited_today'; customer: CustomerSummary }>;
  staffRedeem(customerId: string): Promise<{ result: 'redeemed' | 'no_reward'; reward_name: string | null; customer: CustomerSummary }>;
  // ── Solo dueña / encargado ──
  adminDashboard(): Promise<AdminDashboard>;
  adminListCustomers(q: string, groupId: string | null): Promise<CustomerSummary[]>;
  adminChangeGroup(customerId: string, groupId: string): Promise<CustomerSummary>;
  /** months: 1, 3 o 6; 0 = quitar Premium. */
  adminSetPremium(customerId: string, months: 0 | 1 | 3 | 6): Promise<CustomerSummary>;
  adminVoidVisit(visitId: string, reason: string): Promise<CustomerSummary>;
  adminListGroups(): Promise<AdminGroup[]>;
  adminListDiscounts(): Promise<Discount[]>;
  adminSaveGroup(g: GroupInput): Promise<AdminGroup>;
  adminNewGroupToken(groupId: string): Promise<string>;
  // ── Tarjeta básica (spec 004) ──
  staffRedeemCoupon(couponId: string): Promise<{ result: RedeemResult; kind: string; customer: CustomerSummary }>;
  adminVoidReceipt(receiptId: string, reason: string): Promise<CustomerSummary>;
  adminVoidCoupon(couponId: string, reason: string): Promise<CustomerSummary>;
  adminIssueCoupon(customerId: string, kind: 'bakery' | 'coldfoam', reason: string): Promise<CustomerSummary>;
  adminResolveReview(couponId: string, note: string): Promise<CustomerSummary>;
  adminReviewList(): Promise<ReviewItem[]>;
  adminGetProgram(): Promise<ProgramData>;
  adminSaveProgram(p: ProgramInput): Promise<ProgramData>;
  adminListPromotions(): Promise<PromotionRow[]>;
  adminSavePromotion(p: Omit<PromotionRow, 'id'> & { id: string | null }): Promise<PromotionRow[]>;
  /** Sube la foto de una promoción y regresa su URL pública. */
  uploadPromoImage(file: File): Promise<string>;
}
