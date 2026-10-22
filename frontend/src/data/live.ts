import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { LoyaltyApi } from './port';
import { AppError, type CardView, type GroupPublic, type Profile, type Session } from '../domain/types';
import type { AdminDashboard, AdminGroup, CustomerDetail, CustomerSummary, Discount, ProgramData, PromotionRow, ReviewItem, Role } from '../domain/staff';

/** Adaptador REAL: Supabase (proyecto sano_bistro). Solo usa clave pública + RPC con RLS. */
export function createLiveApi(url: string, publishableKey: string): LoyaltyApi {
  const sb: SupabaseClient = createClient(url, publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  const toSession = (s: { user: { id: string; email?: string | null } } | null): Session | null =>
    s ? { userId: s.user.id, email: s.user.email ?? null } : null;

  const fail = (e: { message?: string; code?: string; status?: number } | null): never => {
    const msg = e?.message ?? 'Error desconocido';
    if (e?.code === 'P0002') throw new AppError('invalid_qr', 'Este QR no es válido o ya no está activo');
    if (e?.code === '28000') throw new AppError('not_signed_in', 'Inicia sesión para continuar');
    if (e?.code === '23514') throw new AppError('invalid_phone', 'Revisa tu número de teléfono');
    if (e?.code === '23505' && /phone/i.test(msg)) throw new AppError('invalid_phone', 'Ese teléfono ya está registrado en otra cuenta. Entra con esa cuenta o usa otro número.');
    const wait = msg.match(/after (\d+) seconds?/i);
    if (wait) throw new AppError('rate_limit', `Espera ${wait[1]} segundos para pedir otro código.`);
    if (e?.status === 429 || /rate limit|too many/i.test(msg)) throw new AppError('rate_limit', 'Demasiados intentos. Espera un momento y vuelve a probar.');
    if (/invalid|expired|token/i.test(msg)) throw new AppError('invalid_code', 'El código no es válido o ya venció');
    if (/fetch|network/i.test(msg)) throw new AppError('network', 'Sin conexión. Revisa tu internet.');
    throw new AppError('unknown', msg);
  };

  /** Errores del panel: la BD ya manda el mensaje en español (validaciones y permisos). */
  const staffFail = (e: { message?: string; code?: string } | null): never => {
    if (e?.code === '42501') throw new AppError('unknown', 'Tu cuenta no tiene permiso para esto.');
    if (e?.code && ['22023', '23505', 'P0002'].includes(e.code) && e.message) throw new AppError('unknown', e.message);
    return fail(e);
  };
  const rpc = async <T,>(fn: string, args: Record<string, unknown> = {}): Promise<T> => {
    const { data, error } = await sb.rpc(fn, args);
    if (error) staffFail(error);
    return data as T;
  };

  return {
    async getSession() { const { data } = await sb.auth.getSession(); return toSession(data.session); },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_e, s) => cb(toSession(s)));
      return () => data.subscription.unsubscribe();
    },
    async signInWithGoogle() {
      // prompt=select_account: Google siempre muestra el selector (en el teléfono elegía sola la última cuenta usada).
      const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/entrar`, queryParams: { prompt: 'select_account' } } });
      if (error) fail(error);
    },
    async sendEmailCode(email, meta) {
      const { error } = await sb.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true, data: meta } });
      if (error) fail(error);
    },
    async verifyEmailCode(email, code) {
      const { error } = await sb.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
      if (error) fail(error);
    },
    async signInWithPassword(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new AppError('invalid_code', 'Correo o contraseña incorrectos');
    },
    async signUpWithPassword(email, password, meta) {
      const { data, error } = await sb.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/entrar`, data: meta } });
      if (error) fail(error);
      return { needsEmailConfirm: !data.session };
    },
    async sendPasswordReset(email) {
      const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/nueva-contrasena` });
      if (error) fail(error);
    },
    async updatePassword(password) {
      const { error } = await sb.auth.updateUser({ password });
      if (error) {
        if (/different from the old/i.test(error.message)) throw new AppError('unknown', 'La nueva contraseña debe ser distinta a la anterior.');
        if (/session/i.test(error.message)) throw new AppError('not_signed_in', 'El enlace venció. Pide otro correo para cambiar tu contraseña.');
        fail(error);
      }
    },
    async signOut() { await sb.auth.signOut(); },
    async getGroupByToken(token) {
      // get_group_public (migración 003) trae el diseño; si aún no existe, cae a la versión anterior.
      let res = await sb.rpc('get_group_public', { p_token: token });
      if (res.error && /get_group_public|schema cache|does not exist/i.test(res.error.message)) res = await sb.rpc('get_group_by_token', { p_token: token });
      if (res.error) fail(res.error);
      const row = (Array.isArray(res.data) ? res.data[0] : res.data) as (GroupPublic & { group_name: string }) | undefined;
      return row ? { ...row, name: row.group_name } : null;
    },
    async getProfile(): Promise<Profile | null> {
      const { data: u } = await sb.auth.getUser();
      if (!u.user) return null;
      const { data, error } = await sb.from('profiles').select('id,email,full_name,phone').eq('id', u.user.id).maybeSingle();
      if (error) fail(error);
      return (data as Profile | null) ?? { id: u.user.id, email: u.user.email ?? null, full_name: null, phone: null };
    },
    async updateProfile(p) {
      const { data: u } = await sb.auth.getUser();
      if (!u.user) throw new AppError('not_signed_in', 'Inicia sesión');
      const { error } = await sb.from('profiles').update({ full_name: p.full_name, phone: p.phone }).eq('id', u.user.id);
      if (error) fail(error);
    },
    async registerCustomer(token) {
      const { error } = await sb.rpc('register_customer', token ? { p_token: token } : {});
      if (error) fail(error);
    },
    async myCard() {
      const { data, error } = await sb.rpc('my_card');
      if (error) fail(error);
      return (data as CardView | null) ?? null;
    },
    async savePushSubscription(sub) {
      const { data: u } = await sb.auth.getUser();
      if (!u.user || !sub.endpoint) return;
      const { error } = await sb.from('push_subscriptions').upsert(
        { profile_id: u.user.id, endpoint: sub.endpoint, p256dh: sub.keys?.p256dh, auth_key: sub.keys?.auth, user_agent: navigator.userAgent },
        { onConflict: 'endpoint' },
      );
      if (error) fail(error);
    },
    async removePushSubscription(endpoint) {
      await sb.from('push_subscriptions').delete().eq('endpoint', endpoint);
    },
    async myRole() {
      const { data, error } = await sb.rpc('my_role');
      if (error) return null; // sin la RPC o sin sesión: se trata como cliente
      return (data as Role) ?? null;
    },
    staffSearch: (q) => rpc<CustomerSummary[]>('staff_search_customers', { p_q: q }).then((r) => r ?? []),
    staffDetail: (id) => rpc<CustomerDetail>('staff_customer_detail', { p_customer: id }),
    staffAddVisit: (id) => rpc('staff_add_visit', { p_customer: id }),
    staffRedeem: (id) => rpc('staff_redeem_reward', { p_customer: id }),
    adminDashboard: () => rpc<AdminDashboard>('admin_dashboard'),
    adminListCustomers: (q, g) => rpc<CustomerSummary[]>('admin_list_customers', { p_q: q, p_group: g }).then((r) => r ?? []),
    adminChangeGroup: (c, g) => rpc<CustomerSummary>('admin_change_group', { p_customer: c, p_group: g }),
    adminSetPremium: (c, m) => rpc<CustomerSummary>('admin_set_premium', { p_customer: c, p_months: m }),
    adminVoidVisit: (v, reason) => rpc<{ customer: CustomerSummary }>('admin_void_visit', { p_visit: v, p_reason: reason }).then((r) => r.customer),
    adminListGroups: () => rpc<AdminGroup[]>('admin_list_groups').then((r) => r ?? []),
    adminListDiscounts: () => rpc<Discount[]>('admin_list_discounts').then((r) => r ?? []),
    adminSaveGroup: (g) => rpc<AdminGroup>('admin_save_group', {
      p_id: g.id, p_name: g.name, p_prefix: g.prefix, p_theme: g.theme, p_benefit: g.benefit,
      p_welcome: g.welcome, p_discount_id: g.discount_id, p_reward_text: g.reward_text, p_active: g.active,
    }),
    adminNewGroupToken: (id) => rpc<string>('admin_new_group_token', { p_id: id }),
    staffRedeemCoupon: (id) => rpc('staff_redeem_coupon', { p_coupon: id }),
    adminVoidReceipt: (id, reason) => rpc<{ customer: CustomerSummary }>('admin_void_receipt', { p_receipt: id, p_reason: reason }).then((r) => r.customer),
    adminVoidCoupon: (id, reason) => rpc<{ customer: CustomerSummary }>('admin_void_coupon', { p_coupon: id, p_reason: reason }).then((r) => r.customer),
    adminIssueCoupon: (c, kind, reason) => rpc<{ customer: CustomerSummary }>('admin_issue_coupon', { p_customer: c, p_kind: kind, p_reason: reason }).then((r) => r.customer),
    adminResolveReview: (id, note) => rpc<{ customer: CustomerSummary }>('admin_resolve_review', { p_coupon: id, p_note: note }).then((r) => r.customer),
    adminReviewList: () => rpc<ReviewItem[]>('admin_review_list').then((r) => r ?? []),
    adminGetProgram: () => rpc<ProgramData>('admin_get_program'),
    adminSaveProgram: (p) => rpc<ProgramData>('admin_save_program', { p }),
    adminListPromotions: () => rpc<PromotionRow[]>('admin_list_promotions').then((r) => r ?? []),
    adminSavePromotion: (p) => rpc<PromotionRow[]>('admin_save_promotion', {
      p_id: p.id, p_title: p.title, p_subtitle: p.subtitle, p_image_url: p.image_url, p_sort: p.sort, p_active: p.active,
    }).then((r) => r ?? []),
    async uploadPromoImage(file) {
      if (!/^image\//.test(file.type)) throw new AppError('unknown', 'Elige una imagen (JPG o PNG).');
      if (file.size > 3 * 1024 * 1024) throw new AppError('unknown', 'La imagen pesa más de 3 MB. Usa una más ligera.');
      const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await sb.storage.from('promos').upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw new AppError('unknown', /row-level|policy|unauthorized/i.test(error.message) ? 'Tu cuenta no tiene permiso para subir imágenes.' : 'No se pudo subir la imagen.');
      return sb.storage.from('promos').getPublicUrl(path).data.publicUrl;
    },
  };
}
