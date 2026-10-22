-- 015e · RPC de la tarjeta básica (cliente, Mostrador y Administración) · spec 004.

create or replace function private.coupon_json(c public.coupons) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', c.id, 'kind', c.kind, 'status', c.status, 'issued_at', c.issued_at, 'valid_from', c.valid_from,
    'expires_at', c.expires_at, 'redeemed_at', c.redeemed_at, 'needs_review', c.needs_review, 'review_note', c.review_note, 'note', c.note,
    'redeemed_by', (select coalesce(p.full_name, p.email) from public.profiles p where p.id = c.redeemed_by),
    'source_receipt', (select lr.receipt_number from public.loyverse_receipts lr where lr.id = c.source_receipt_id),
    'redeemed_receipt', (select lr.receipt_number from public.loyverse_receipts lr where lr.id = c.redeemed_receipt_id)) $$;

create or replace function private.customer_summary(p_customer uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', c.id, 'code', g.prefix || '-' || c.code_number, 'full_name', p.full_name, 'phone', p.phone, 'email', p.email,
    'status', c.status, 'created_at', c.created_at,
    'group', jsonb_build_object('id', g.id, 'name', g.name, 'prefix', g.prefix, 'theme', g.theme, 'benefit', g.benefit),
    'tier', jsonb_build_object('code', t.code, 'name', t.name, 'expires_at', case when t.is_default then null else c.tier_expires_at end),
    'visits_count', coalesce(cc.visits_count, 0),
    'visits_goal', coalesce(cc.visits_goal, (select goal from public.program_settings where id = 1)),
    'journey_status', case when cc.status = 'reward_ready' then 'complete' else 'open' end,
    'visited_today', exists (select 1 from public.visits v where v.customer_id = c.id and v.voided_at is null and v.visit_date = private.today_local()),
    'last_visit_at', (select max(v.visited_at) from public.visits v where v.customer_id = c.id and v.voided_at is null),
    'coupons_available', (select count(*) from public.coupons k where k.customer_id = c.id and k.status = 'available'),
    'coupon_redeemed_today', exists (select 1 from public.coupons k where k.customer_id = c.id and k.status = 'redeemed' and k.redeemed_date = private.today_local()),
    'needs_review', (select count(*) from public.coupons k where k.customer_id = c.id and k.needs_review),
    'rewards_ready', (select count(*) from public.coupons k where k.customer_id = c.id and k.status = 'available' and k.kind = 'drink'),
    'reward_name', case when exists (select 1 from public.coupons k where k.customer_id = c.id and k.status = 'available' and k.kind = 'drink') then 'Bebida gratis' end)
  from public.customers c
  join public.profiles p on p.id = c.profile_id
  join public.groups g on g.id = c.group_id
  join public.tiers t on t.id = public.effective_tier_id(c.id)
  left join lateral (select * from private.current_card(c.id)) cc on true
  where c.id = p_customer $$;

create or replace function public.my_card() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'code', g.prefix || '-' || c.code_number,
    'full_name', p.full_name, 'phone', p.phone, 'email', p.email,
    'group', jsonb_build_object('name', g.name, 'prefix', g.prefix, 'primary_color', g.primary_color, 'accent_color', g.accent_color,
                                'welcome_message', g.welcome_message, 'theme', g.theme),
    'tier', jsonb_build_object('code', t.code, 'name', t.name, 'expires_at', null),
    'visits_count', coalesce(cc.visits_count, 0),
    'visits_goal', coalesce(cc.visits_goal, s.goal),
    'journey_status', case when cc.status = 'reward_ready' then 'complete' else 'open' end,
    'period_ends_at', null,
    'card_visits', coalesce((select jsonb_agg(v.visited_at order by v.visited_at) from public.visits v
                              where v.card_id = cc.id and v.voided_at is null), '[]'::jsonb),
    'recent_visits', coalesce((select jsonb_agg(x.visited_at order by x.visited_at desc)
                                 from (select visited_at from public.visits where customer_id = c.id and voided_at is null
                                        order by visited_at desc limit 60) x), '[]'::jsonb),
    'coupons', coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'kind', k.kind, 'status', k.status, 'issued_at', k.issued_at,
                                   'valid_from', k.valid_from, 'expires_at', k.expires_at, 'redeemed_at', k.redeemed_at)
                                 order by (k.status = 'available') desc, k.expires_at)
                           from public.coupons k
                          where k.customer_id = c.id and k.status <> 'voided'
                            and (k.status = 'available' or coalesce(k.redeemed_at, k.expires_at) > now() - interval '30 days')), '[]'::jsonb),
    'coupon_redeemed_today', exists (select 1 from public.coupons k where k.customer_id = c.id and k.status = 'redeemed'
                                       and k.redeemed_date = private.local_date()),
    'rewards_ready', coalesce((select jsonb_agg(jsonb_build_object('card_id', k.card_id, 'completed_at', k.issued_at,
                                   'discount_name', 'Bebida gratis', 'description', null))
                                 from public.coupons k where k.customer_id = c.id and k.kind = 'drink' and k.status = 'available'), '[]'::jsonb),
    'promotions', coalesce((select jsonb_agg(jsonb_build_object('id', pr.id, 'title', pr.title, 'subtitle', pr.subtitle, 'image_url', pr.image_url)
                                     order by pr.sort, pr.created_at)
                              from public.promotions pr where pr.active), '[]'::jsonb),
    'rules', jsonb_build_object('goal', s.goal, 'stamp_min', s.stamp_min, 'bakery_min', s.bakery_min, 'coldfoam_min', s.coldfoam_min,
                                'drink_days', s.drink_days, 'bakery_days', s.bakery_days, 'coldfoam_days', s.coldfoam_days),
    'next_reward', jsonb_build_object('name', 'Bebida gratis', 'description', 'Hasta $98 en tu bebida'))
  from public.customers c
  join public.profiles p on p.id = c.profile_id
  join public.groups g on g.id = c.group_id
  join public.tiers t on t.id = public.effective_tier_id(c.id)
  cross join (select * from public.program_settings where id = 1) s
  left join lateral (select * from private.current_card(c.id)) cc on true
  where c.profile_id = auth.uid() $$;

-- ───────── Mostrador ─────────
create or replace function public.staff_customer_detail(p_customer uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_role(array['superadmin', 'owner', 'manager', 'cashier']);
  return private.customer_summary(p_customer) || jsonb_build_object(
    'visits', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'visited_at', v.visited_at, 'source', v.source,
                          'receipt', (select lr.receipt_number from public.loyverse_receipts lr where lr.id = v.receipt_id),
                          'added_by', (select coalesce(pp.full_name, pp.email) from public.profiles pp where pp.id = v.added_by),
                          'current', v.card_id = (select id from private.current_card(p_customer))) order by v.visited_at desc)
                        from (select * from public.visits where customer_id = p_customer and voided_at is null order by visited_at desc limit 31) v), '[]'::jsonb),
    'coupons', coalesce((select jsonb_agg(private.coupon_json(k) order by (k.status = 'available') desc, k.issued_at desc)
                         from (select * from public.coupons where customer_id = p_customer
                                and (status = 'available' or needs_review or issued_at > now() - interval '120 days')
                                order by issued_at desc limit 30) k), '[]'::jsonb),
    'receipts', coalesce((select jsonb_agg(jsonb_build_object('id', lr.id, 'number', lr.receipt_number, 'at', lr.receipt_at,
                            'paid', lr.paid_amount, 'regular', lr.regular_amount, 'dining', lr.dining_option, 'status', lr.status,
                            'reason', lr.status_reason, 'reversed_at', lr.reversed_at, 'reverse_reason', lr.reverse_reason) order by lr.receipt_at desc)
                          from (select * from public.loyverse_receipts where customer_id = p_customer and receipt_type is distinct from 'REFUND'
                                 order by receipt_at desc limit 15) lr), '[]'::jsonb));
end $$;

create or replace function public.staff_add_visit(p_customer uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_card public.loyalty_cards; v_id uuid; v_today date := private.today_local();
begin
  perform private.require_role(array['superadmin', 'owner', 'manager', 'cashier']);
  if not exists (select 1 from public.customers where id = p_customer and status = 'active') then
    raise exception 'Cliente no encontrado o bloqueado' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.visits where customer_id = p_customer and visit_date = v_today and voided_at is null) then
    return jsonb_build_object('result', 'already_visited_today', 'customer', private.customer_summary(p_customer));
  end if;
  v_card := public.ensure_open_card(p_customer, public.local_period());
  if v_card.id is null then
    return jsonb_build_object('result', 'card_complete', 'customer', private.customer_summary(p_customer));
  end if;
  insert into public.visits (customer_id, card_id, receipt_id, visit_date, visited_at, source, added_by)
  values (p_customer, v_card.id, null, v_today, now(), 'manual', auth.uid()) returning id into v_id;
  insert into public.audit_log (actor_id, action, entity, entity_id, after)
  values (auth.uid(), 'manual_visit', 'visits', v_id, jsonb_build_object('customer_id', p_customer));
  return jsonb_build_object('result', 'visit', 'customer', private.customer_summary(p_customer));
exception when unique_violation then
  return jsonb_build_object('result', 'already_visited_today', 'customer', private.customer_summary(p_customer));
end $$;

create or replace function public.staff_redeem_coupon(p_coupon uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_customer uuid; v_kind public.coupon_kind; v_res text;
begin
  perform private.require_role(array['superadmin', 'owner', 'manager', 'cashier']);
  select customer_id, kind into v_customer, v_kind from public.coupons where id = p_coupon;
  if v_customer is null then raise exception 'Cupón no encontrado' using errcode = 'P0002'; end if;
  v_res := private.redeem_coupon(p_coupon, null, auth.uid(), now());
  if v_res = 'redeemed' then
    insert into public.audit_log (actor_id, action, entity, entity_id, after)
    values (auth.uid(), 'manual_redeem_coupon', 'coupons', p_coupon, jsonb_build_object('customer_id', v_customer, 'kind', v_kind));
  end if;
  return jsonb_build_object('result', v_res, 'kind', v_kind, 'customer', private.customer_summary(v_customer));
end $$;

-- Compatibilidad: canjear premio = canjear la bebida disponible más antigua.
create or replace function public.staff_redeem_reward(p_customer uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_coupon uuid; r jsonb;
begin
  perform private.require_role(array['superadmin', 'owner', 'manager', 'cashier']);
  select id into v_coupon from public.coupons where customer_id = p_customer and kind = 'drink' and status = 'available' order by issued_at limit 1;
  if v_coupon is null then return jsonb_build_object('result', 'no_reward', 'customer', private.customer_summary(p_customer)); end if;
  r := public.staff_redeem_coupon(v_coupon);
  return r || jsonb_build_object('reward_name', 'Bebida gratis');
end $$;

-- ───────── Administración ─────────
create or replace function public.admin_void_receipt(p_receipt uuid, p_reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.loyverse_receipts;
begin
  perform private.require_role(array['superadmin', 'owner', 'manager']);
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Escribe el motivo' using errcode = '22023'; end if;
  select * into r from public.loyverse_receipts where id = p_receipt for update;
  if not found then raise exception 'Ticket no encontrado' using errcode = 'P0002'; end if;
  if r.reversed_at is not null then raise exception 'Ese ticket ya se anuló' using errcode = '22023'; end if;
  perform private.reverse_receipt(r.id, 'Anulado en el panel: ' || trim(p_reason), auth.uid());
  insert into public.audit_log (actor_id, action, entity, entity_id, before, after)
  values (auth.uid(), 'void_receipt', 'loyverse_receipts', r.id, jsonb_build_object('number', r.receipt_number), jsonb_build_object('reason', trim(p_reason)));
  return jsonb_build_object('result', 'voided', 'customer', private.customer_summary(r.customer_id));
end $$;

create or replace function public.admin_void_coupon(p_coupon uuid, p_reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.coupons;
begin
  perform private.require_role(array['superadmin', 'owner', 'manager']);
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Escribe el motivo' using errcode = '22023'; end if;
  select * into c from public.coupons where id = p_coupon for update;
  if not found then raise exception 'Cupón no encontrado' using errcode = 'P0002'; end if;
  if c.status <> 'available' then raise exception 'Solo se puede quitar un cupón disponible' using errcode = '22023'; end if;
  if c.kind = 'drink' then raise exception 'La bebida se quita quitando un sello (−1)' using errcode = '22023'; end if;
  update public.coupons set status = 'voided', note = concat_ws(' · ', note, 'Quitado en el panel: ' || trim(p_reason)) where id = c.id;
  insert into public.audit_log (actor_id, action, entity, entity_id, before, after)
  values (auth.uid(), 'void_coupon', 'coupons', c.id, to_jsonb(c), jsonb_build_object('reason', trim(p_reason)));
  return jsonb_build_object('result', 'voided', 'customer', private.customer_summary(c.customer_id));
end $$;

create or replace function public.admin_issue_coupon(p_customer uuid, p_kind text, p_reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_card public.loyalty_cards; v_id uuid;
begin
  perform private.require_role(array['superadmin', 'owner', 'manager']);
  if p_kind not in ('bakery', 'coldfoam') then raise exception 'Solo se pueden dar a mano panadería o cold foam' using errcode = '22023'; end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Escribe el motivo' using errcode = '22023'; end if;
  select * into v_card from private.current_card(p_customer);
  if v_card.id is null then v_card := public.ensure_open_card(p_customer, public.local_period()); end if;
  v_id := private.issue_coupon(p_customer, v_card.id, p_kind::public.coupon_kind, private.today_local(), null, null, auth.uid(),
                               'Dado en el panel: ' || trim(p_reason));
  if v_id is null then raise exception 'Ya tiene ese cupón en este recorrido' using errcode = '23505'; end if;
  insert into public.audit_log (actor_id, action, entity, entity_id, after)
  values (auth.uid(), 'issue_coupon', 'coupons', v_id, jsonb_build_object('customer_id', p_customer, 'kind', p_kind, 'reason', trim(p_reason)));
  return jsonb_build_object('result', 'issued', 'customer', private.customer_summary(p_customer));
end $$;

create or replace function public.admin_resolve_review(p_coupon uuid, p_note text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.coupons;
begin
  perform private.require_role(array['superadmin', 'owner', 'manager']);
  update public.coupons set needs_review = false, review_note = concat_ws(' · ', review_note, 'Revisado: ' || coalesce(nullif(trim(p_note), ''), 'sin nota'))
   where id = p_coupon and needs_review returning * into c;
  if not found then raise exception 'No hay nada que revisar en ese cupón' using errcode = 'P0002'; end if;
  insert into public.audit_log (actor_id, action, entity, entity_id, after)
  values (auth.uid(), 'resolve_review', 'coupons', c.id, jsonb_build_object('note', p_note));
  return jsonb_build_object('result', 'resolved', 'customer', private.customer_summary(c.customer_id));
end $$;

create or replace function public.admin_review_list() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_role(array['superadmin', 'owner', 'manager']);
  return coalesce((select jsonb_agg(private.coupon_json(k) || jsonb_build_object('customer', private.customer_summary(k.customer_id)) order by k.issued_at desc)
                     from public.coupons k where k.needs_review), '[]'::jsonb);
end $$;

create or replace function public.admin_get_program() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_role(array['superadmin', 'owner', 'manager']);
  return jsonb_build_object(
    'settings', (select to_jsonb(s) - 'id' from public.program_settings s where id = 1),
    'categories', coalesce((select jsonb_agg(jsonb_build_object('id', loyverse_id, 'name', name) order by name)
                              from public.loyverse_categories where deleted_at is null), '[]'::jsonb),
    'dining_options', coalesce((select jsonb_agg(x.d order by x.d) from (
                         select distinct raw ->> 'dining_option' d from public.loyverse_receipts
                          where raw ->> 'dining_option' is not null
                         union
                         select unnest(coalesce((select dining_options_counted from public.program_settings where id = 1), '{}'))) x), '[]'::jsonb),
    'discounts', public.admin_list_discounts());
end $$;

create or replace function public.admin_save_program(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_before jsonb;
begin
  perform private.require_role(array['superadmin', 'owner', 'manager']);
  select to_jsonb(s) into v_before from public.program_settings s where id = 1;
  update public.program_settings set
    drink_discount_id = nullif(p ->> 'drink_discount_id', ''),
    bakery_discount_id = nullif(p ->> 'bakery_discount_id', ''),
    coldfoam_discount_id = nullif(p ->> 'coldfoam_discount_id', ''),
    promo_category_ids = coalesce((select array_agg(x) from jsonb_array_elements_text(p -> 'promo_category_ids') x), '{}'),
    dining_options_counted = case when p -> 'dining_options_counted' is null or jsonb_typeof(p -> 'dining_options_counted') = 'null' then null
                                  else coalesce((select array_agg(x) from jsonb_array_elements_text(p -> 'dining_options_counted') x), '{}') end,
    updated_at = now(), updated_by = auth.uid()
   where id = 1;
  insert into public.audit_log (actor_id, action, entity, before, after)
  values (auth.uid(), 'save_program', 'program_settings', v_before, (select to_jsonb(s) from public.program_settings s where id = 1));
  return public.admin_get_program();
end $$;

create or replace function public.admin_list_promotions() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_role(array['superadmin', 'owner', 'manager']);
  return coalesce((select jsonb_agg(to_jsonb(pr) order by pr.sort, pr.created_at) from public.promotions pr), '[]'::jsonb);
end $$;

create or replace function public.admin_save_promotion(p_id uuid, p_title text, p_subtitle text, p_image_url text, p_sort int, p_active boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := p_id;
begin
  perform private.require_role(array['superadmin', 'owner', 'manager']);
  if length(trim(coalesce(p_title, ''))) < 3 then raise exception 'Escribe el título de la promoción' using errcode = '22023'; end if;
  if v_id is null then
    insert into public.promotions (title, subtitle, image_url, sort, active)
    values (trim(p_title), nullif(trim(p_subtitle), ''), nullif(p_image_url, ''), coalesce(p_sort, 0), coalesce(p_active, true)) returning id into v_id;
  else
    update public.promotions set title = trim(p_title), subtitle = nullif(trim(p_subtitle), ''), image_url = nullif(p_image_url, ''),
           sort = coalesce(p_sort, 0), active = coalesce(p_active, true), updated_at = now() where id = v_id;
    if not found then raise exception 'Promoción no encontrada' using errcode = 'P0002'; end if;
  end if;
  insert into public.audit_log (actor_id, action, entity, entity_id, after)
  values (auth.uid(), case when p_id is null then 'create_promotion' else 'update_promotion' end, 'promotions', v_id,
          (select to_jsonb(pr) from public.promotions pr where pr.id = v_id));
  return public.admin_list_promotions();
end $$;

create or replace function public.admin_dashboard() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_start timestamptz := (public.local_period()::timestamp at time zone public.business_tz());
begin
  perform private.require_role(array['superadmin', 'owner', 'manager']);
  return jsonb_build_object(
    'customers_total', (select count(*) from public.customers),
    'new_this_month', (select count(*) from public.customers where created_at >= v_start),
    'visits_today', (select count(*) from public.visits where voided_at is null and visit_date = private.today_local()),
    'visits_month', (select count(*) from public.visits where voided_at is null and visit_date >= public.local_period()),
    'coupons', (select jsonb_object_agg(k, jsonb_build_object(
                  'issued_month', (select count(*) from public.coupons c where c.kind::text = k and c.status <> 'voided' and c.issued_at >= v_start),
                  'redeemed_month', (select count(*) from public.coupons c where c.kind::text = k and c.status = 'redeemed' and c.redeemed_at >= v_start),
                  'available', (select count(*) from public.coupons c where c.kind::text = k and c.status = 'available')))
                from unnest(array['drink', 'bakery', 'coldfoam']) k),
    'needs_review', (select count(*) from public.coupons where needs_review),
    'journeys_complete', (select count(*) from public.loyalty_cards where status = 'reward_ready'),
    'rewards_earned_month', (select count(*) from public.coupons where kind = 'drink' and status <> 'voided' and issued_at >= v_start),
    'rewards_redeemed_month', (select count(*) from public.coupons where kind = 'drink' and status = 'redeemed' and redeemed_at >= v_start),
    'rewards_pending', (select count(*) from public.coupons where kind = 'drink' and status = 'available'),
    'premium_active', 0,
    'groups', (select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name, 'prefix', g.prefix, 'theme', g.theme, 'active', g.active,
                 'customers', (select count(*) from public.customers c where c.group_id = g.id)) order by g.is_default desc, g.name), '[]'::jsonb)
               from public.groups g));
end $$;

grant execute on function public.staff_redeem_coupon(uuid), public.admin_void_receipt(uuid, text), public.admin_void_coupon(uuid, text),
  public.admin_issue_coupon(uuid, text, text), public.admin_resolve_review(uuid, text), public.admin_review_list(),
  public.admin_get_program(), public.admin_save_program(jsonb), public.admin_list_promotions(),
  public.admin_save_promotion(uuid, text, text, text, int, boolean) to authenticated;
