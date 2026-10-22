-- 015b · Lógica del recorrido de 7 sellos + bebida, y cupones (spec 004).

create or replace function private.program() returns public.program_settings
language sql stable security definer set search_path = '' as $$
  select * from public.program_settings where id = 1 $$;

create or replace function private.local_date(p_at timestamptz default now()) returns date
language sql stable set search_path = '' as $$
  select (p_at at time zone public.business_tz())::date $$;

-- Vence al terminar (hora de Progreso) el día p_issue_date + p_days.
create or replace function private.coupon_expiry(p_issue_date date, p_days int) returns timestamptz
language sql stable set search_path = '' as $$
  select ((p_issue_date + p_days + 1)::timestamp at time zone public.business_tz()) $$;

-- Recorrido actual: el de bebida pendiente o el abierto.
create or replace function private.current_card(p_customer uuid) returns public.loyalty_cards
language sql stable security definer set search_path = '' as $$
  select * from public.loyalty_cards
   where customer_id = p_customer and status in ('open', 'reward_ready')
   order by (status = 'reward_ready') desc, created_at desc limit 1 $$;

create or replace function private.start_new_card(p_customer uuid) returns public.loyalty_cards
language plpgsql security definer set search_path = '' as $$
declare v public.loyalty_cards; v_period date := public.local_period(); v_seq int;
begin
  select * into v from public.loyalty_cards where customer_id = p_customer and status = 'open' for update;
  if found then return v; end if;
  select coalesce(max(sequence), 0) + 1 into v_seq from public.loyalty_cards where customer_id = p_customer and period_month = v_period;
  insert into public.loyalty_cards (customer_id, period_month, sequence, visits_goal)
  values (p_customer, v_period, v_seq, (select goal from public.program_settings where id = 1))
  returning * into v;
  return v;
end $$;

-- Recorrido abierto para sellar. NULL si la bebida está pendiente (el recorrido está completo y no suma).
create or replace function public.ensure_open_card(p_customer uuid, p_period date) returns public.loyalty_cards
language plpgsql set search_path = '' as $$
declare v_card public.loyalty_cards;
begin
  select * into v_card from public.loyalty_cards where customer_id = p_customer and status = 'open' for update;
  if found then return v_card; end if;
  if exists (select 1 from public.loyalty_cards where customer_id = p_customer and status = 'reward_ready') then
    return null;
  end if;
  return private.start_new_card(p_customer);
end $$;

create or replace function private.issue_coupon(p_customer uuid, p_card uuid, p_kind public.coupon_kind, p_issue_date date,
  p_receipt uuid, p_visit uuid, p_by uuid, p_note text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare s public.program_settings := private.program(); v_days int; v_id uuid;
begin
  v_days := case p_kind when 'drink' then s.drink_days when 'bakery' then s.bakery_days else s.coldfoam_days end;
  insert into public.coupons (customer_id, card_id, kind, valid_from, expires_at, source_receipt_id, source_visit_id, issued_by, note)
  values (p_customer, p_card, p_kind, case when p_kind = 'drink' then p_issue_date + 1 else p_issue_date end,
          private.coupon_expiry(p_issue_date, v_days), p_receipt, p_visit, p_by, p_note)
  on conflict (card_id, kind) do update
     set status = 'available', issued_at = now(), valid_from = excluded.valid_from, expires_at = excluded.expires_at,
         source_receipt_id = excluded.source_receipt_id, source_visit_id = excluded.source_visit_id,
         issued_by = excluded.issued_by, note = excluded.note,
         redeemed_at = null, redeemed_date = null, redeemed_receipt_id = null, redeemed_by = null
   where public.coupons.status = 'voided'
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.visits_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_card public.loyalty_cards;
begin
  update public.loyalty_cards set visits_count = visits_count + 1 where id = new.card_id returning * into v_card;
  if v_card.status = 'open' and v_card.visits_count >= v_card.visits_goal then
    update public.loyalty_cards set status = 'reward_ready', completed_at = new.visited_at where id = v_card.id;
    perform private.issue_coupon(v_card.customer_id, v_card.id, 'drink', new.visit_date, new.receipt_id, new.id, new.added_by, null);
  end if;
  return new;
end $$;

create or replace function public.visits_after_void() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_card public.loyalty_cards; v_drink public.coupons;
begin
  if old.voided_at is not null or new.voided_at is null then return new; end if;
  update public.loyalty_cards set visits_count = greatest(visits_count - 1, 0) where id = new.card_id returning * into v_card;

  -- Cupones que generó esta visita (panadería): si no se usaron se anulan; si ya se usaron, a revisión.
  update public.coupons set status = 'voided', note = concat_ws(' · ', note, 'Se quitó el sello que lo generó')
   where source_visit_id = new.id and kind <> 'drink' and status = 'available';
  update public.coupons set needs_review = true, review_note = concat_ws(' · ', review_note, 'Se quitó el sello que lo generó, pero ya se había canjeado')
   where source_visit_id = new.id and kind <> 'drink' and status = 'redeemed';

  if v_card.status = 'reward_ready' and v_card.visits_count < v_card.visits_goal then
    select * into v_drink from public.coupons where card_id = v_card.id and kind = 'drink' for update;
    if v_drink.id is null or v_drink.status in ('available', 'voided') then
      update public.coupons set status = 'voided', note = concat_ws(' · ', note, 'Se quitó un sello') where id = v_drink.id and status = 'available';
      if not exists (select 1 from public.loyalty_cards where customer_id = v_card.customer_id and status = 'open') then
        update public.loyalty_cards set status = 'open', completed_at = null where id = v_card.id;
      end if;
    end if;
  elsif v_card.status in ('redeemed', 'expired') and v_card.visits_count < v_card.visits_goal then
    update public.coupons set needs_review = true,
           review_note = concat_ws(' · ', review_note, 'Se quitó un sello de un recorrido cuya bebida ya se canjeó o venció')
     where card_id = v_card.id and kind = 'drink';
  end if;
  return new;
end $$;

create or replace function private.redeem_coupon(p_coupon uuid, p_receipt uuid, p_by uuid, p_at timestamptz) returns text
language plpgsql security definer set search_path = '' as $$
declare c public.coupons; v_date date := private.local_date(p_at);
begin
  select * into c from public.coupons where id = p_coupon for update;
  if not found or c.status <> 'available' then return 'not_available'; end if;
  if c.expires_at <= p_at then return 'expired'; end if;
  if c.valid_from > v_date then return 'not_yet'; end if;
  if exists (select 1 from public.coupons where customer_id = c.customer_id and status = 'redeemed' and redeemed_date = v_date) then
    return 'daily_limit';
  end if;
  update public.coupons set status = 'redeemed', redeemed_at = p_at, redeemed_date = v_date, redeemed_receipt_id = p_receipt, redeemed_by = p_by
   where id = c.id;
  if c.kind = 'drink' then
    update public.loyalty_cards set status = 'redeemed', redeemed_at = p_at, redeemed_receipt_id = p_receipt
     where id = c.card_id and status = 'reward_ready';
    perform private.start_new_card(c.customer_id);
  end if;
  return 'redeemed';
end $$;

-- Deshace un canje (se anuló el ticket con el que se canjeó).
create or replace function private.unredeem_coupon(p_coupon uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.coupons; v_new public.loyalty_cards;
begin
  select * into c from public.coupons where id = p_coupon for update;
  if not found or c.status <> 'redeemed' then return; end if;
  if c.kind = 'drink' then
    select * into v_new from public.loyalty_cards where customer_id = c.customer_id and status = 'open' for update;
    if v_new.id is not null and v_new.visits_count > 0 then
      update public.coupons set needs_review = true,
             review_note = concat_ws(' · ', review_note, p_reason || ': se anuló el ticket del canje de la bebida, pero ya empezó otro recorrido')
       where id = c.id;
      return;
    end if;
    if v_new.id is not null then
      update public.loyalty_cards set status = 'expired', expired_at = now() where id = v_new.id;
    end if;
    update public.loyalty_cards set status = 'reward_ready', redeemed_at = null, redeemed_receipt_id = null where id = c.card_id;
  end if;
  update public.coupons
     set status = case when expires_at > now() then 'available'::public.coupon_status else 'expired'::public.coupon_status end,
         redeemed_at = null, redeemed_date = null, redeemed_receipt_id = null, redeemed_by = null,
         note = concat_ws(' · ', note, p_reason || ': se deshizo el canje')
   where id = c.id;
end $$;

-- Anula todo lo que generó un ticket (sello y cupones) y deshace sus canjes.
create or replace function private.reverse_receipt(p_target uuid, p_reason text, p_by uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  update public.coupons set status = 'voided', note = concat_ws(' · ', note, 'Ticket anulado: ' || p_reason)
   where source_receipt_id = p_target and status = 'available';
  update public.coupons set needs_review = true,
         review_note = concat_ws(' · ', review_note, 'Se anuló el ticket que lo generó (' || p_reason || '), pero ya se había canjeado')
   where source_receipt_id = p_target and status = 'redeemed';
  update public.visits set voided_at = now(), void_reason = p_reason where receipt_id = p_target and voided_at is null;
  for c in select id from public.coupons where redeemed_receipt_id = p_target and status = 'redeemed' loop
    perform private.unredeem_coupon(c.id, p_reason);
  end loop;
  update public.loyverse_receipts set reversed_at = now(), reversed_by = p_by, reverse_reason = p_reason where id = p_target;
end $$;

create or replace function private.expire_coupons() returns int
language plpgsql security definer set search_path = '' as $$
declare c record; n int := 0;
begin
  for c in select * from public.coupons where status = 'available' and expires_at <= now() for update loop
    update public.coupons set status = 'expired' where id = c.id;
    if c.kind = 'drink' then
      update public.loyalty_cards set status = 'expired', expired_at = now() where id = c.card_id and status = 'reward_ready';
      perform private.start_new_card(c.customer_id);
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;
