-- 015c · Procesar cada ticket con las reglas de la tarjeta básica (spec 004) + mantenimiento diario.
create or replace function public.process_receipt(p_receipt_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  r public.loyverse_receipts; v_orig public.loyverse_receipts; s public.program_settings := private.program();
  v_customer uuid; v_date date; v_paid numeric; v_regular numeric; v_dining text;
  v_card public.loyalty_cards; v_card_id uuid; v_visit uuid; v_res text; v_notes text[] := '{}';
  v_redeemed boolean := false; v_kind public.coupon_kind; v_disc text; v_coupon uuid; v_new uuid;
begin
  select * into r from public.loyverse_receipts where id = p_receipt_id for update;
  if not found then return 'not_found'; end if;
  -- 'error' se reintenta (p. ej. tras corregir un fallo); lo ya procesado o ignorado no se repite
  if r.status not in ('pending', 'error') then return r.status::text; end if;
  update public.loyverse_receipts set attempts = attempts + 1 where id = r.id;

  -- Venta cancelada: se revierte lo que generó y sus canjes
  if r.cancelled_at is not null then
    perform private.reverse_receipt(r.id, 'Venta cancelada en Loyverse', null);
    update public.loyverse_receipts set status = 'processed', status_reason = 'cancelled', processed_at = now() where id = r.id;
    return 'cancelled';
  end if;

  -- Devolución: revierte la venta original
  if r.receipt_type = 'REFUND' then
    select * into v_orig from public.loyverse_receipts where receipt_number = r.refund_for;
    if found then perform private.reverse_receipt(v_orig.id, 'Devolución ' || r.receipt_number, null); end if;
    update public.loyverse_receipts set status = 'processed', status_reason = 'refund', processed_at = now(), customer_id = v_orig.customer_id
     where id = r.id;
    return 'refund';
  end if;

  -- Descuentos aplicados (de la venta y de cada producto)
  insert into public.receipt_discounts (receipt_id, loyverse_discount_id, amount)
  select r.id, d ->> 'id', sum(coalesce((d ->> 'money_amount')::numeric, 0))
    from (select jsonb_array_elements(coalesce(r.raw -> 'total_discounts', '[]'::jsonb)) as d
          union all
          select jsonb_array_elements(coalesce(li -> 'line_discounts', '[]'::jsonb))
            from jsonb_array_elements(coalesce(r.raw -> 'line_items', '[]'::jsonb)) li) x
   where d ->> 'id' is not null
   group by d ->> 'id'
  on conflict do nothing;

  -- Montos: pagado = total − propina; precio regular = renglones sin descuento y fuera de paquetes/promos
  v_dining := r.raw ->> 'dining_option';
  v_paid := coalesce((r.raw ->> 'total_money')::numeric, 0) - coalesce((r.raw ->> 'tip')::numeric, 0);
  select coalesce(sum((li ->> 'total_money')::numeric), 0) into v_regular
    from jsonb_array_elements(coalesce(r.raw -> 'line_items', '[]'::jsonb)) li
    left join public.loyverse_items it on it.loyverse_id = li ->> 'item_id'
   where coalesce((li ->> 'total_discount')::numeric, 0) = 0
     and jsonb_array_length(coalesce(li -> 'line_discounts', '[]'::jsonb)) = 0
     and (it.category_id is null or not (it.category_id = any (s.promo_category_ids)));
  update public.loyverse_receipts set paid_amount = v_paid, regular_amount = v_regular, dining_option = v_dining where id = r.id;

  v_customer := public.find_customer_in_receipt(r.raw);
  if v_customer is null then
    update public.loyverse_receipts set status = 'ignored', status_reason = 'no_customer_code', processed_at = now() where id = r.id;
    return 'no_customer_code';
  end if;
  if s.dining_options_counted is not null and not (coalesce(v_dining, '') = any (s.dining_options_counted)) then
    update public.loyverse_receipts set status = 'ignored', status_reason = 'Tipo de pedido que no participa: ' || coalesce(v_dining, '—'),
           customer_id = v_customer, processed_at = now() where id = r.id;
    return 'dining_option_excluded';
  end if;

  v_date := private.local_date(r.receipt_at);

  -- 1) Canje de la bebida (antes del sello: así esta compra puede dar el sello 1 del recorrido nuevo)
  if s.drink_discount_id is not null
     and exists (select 1 from public.receipt_discounts where receipt_id = r.id and loyverse_discount_id = s.drink_discount_id) then
    select id into v_coupon from public.coupons where customer_id = v_customer and kind = 'drink' and status = 'available' order by issued_at limit 1;
    if v_coupon is null then
      v_notes := array_append(v_notes, 'bebida: no tenía cupón');
    else
      v_res := private.redeem_coupon(v_coupon, r.id, null, r.receipt_at);
      v_notes := array_append(v_notes, ('bebida: ' || v_res));
      v_redeemed := v_res = 'redeemed';
    end if;
  end if;

  -- 2) Sello: pagó el mínimo, recorrido abierto, uno por día
  if v_paid >= s.stamp_min then
    v_card := public.ensure_open_card(v_customer, public.local_period());
    if v_card.id is null then
      v_notes := array_append(v_notes, 'sin sello: recorrido completo, bebida pendiente');
    else
      insert into public.visits (customer_id, card_id, receipt_id, visit_date, visited_at, source)
      values (v_customer, v_card.id, r.id, v_date, r.receipt_at, 'loyverse')
      on conflict do nothing
      returning id into v_visit;
      if v_visit is null then
        v_notes := array_append(v_notes, 'sin sello: ya tenía sello hoy');
      else
        v_notes := array_append(v_notes, 'sello');
        select * into v_card from public.loyalty_cards where id = v_card.id;
        v_card_id := v_card.id;
        -- 3) Panadería: solo en la compra del sello 1 del recorrido
        if v_card.visits_count = 1 and v_regular >= s.bakery_min then
          v_new := private.issue_coupon(v_customer, v_card.id, 'bakery', v_date, r.id, v_visit, null, null);
          if v_new is not null then v_notes := array_append(v_notes, 'cupón panadería'; end if);
        end if;
      end if;
    end if;
  else
    v_notes := array_append(v_notes, ('sin sello: pagó ' || v_paid || ' (mínimo ' || s.stamp_min || ')'));
  end if;

  -- 4) Cold foam: una vez por recorrido (el que selló este ticket o el abierto)
  if v_regular >= s.coldfoam_min then
    if v_card_id is null then
      select id into v_card_id from public.loyalty_cards where customer_id = v_customer and status = 'open';
    end if;
    if v_card_id is not null then
      v_new := private.issue_coupon(v_customer, v_card_id, 'coldfoam', v_date, r.id, v_visit, null, null);
      if v_new is not null then v_notes := array_append(v_notes, 'cupón cold foam'; end if);
    end if;
  end if;

  -- 5) Canje de panadería / cold foam (puede ser en la misma compra que lo generó)
  foreach v_kind in array array['bakery', 'coldfoam']::public.coupon_kind[] loop
    v_disc := case v_kind when 'bakery' then s.bakery_discount_id else s.coldfoam_discount_id end;
    continue when v_disc is null
      or not exists (select 1 from public.receipt_discounts where receipt_id = r.id and loyverse_discount_id = v_disc);
    if v_redeemed then
      v_notes := array_append(v_notes, (v_kind::text || ': no se canjeó, ya hubo otro cupón en este ticket'));
      continue;
    end if;
    v_coupon := null;
    select id into v_coupon from public.coupons where customer_id = v_customer and kind = v_kind and status = 'available' order by expires_at limit 1;
    if v_coupon is null then
      v_notes := array_append(v_notes, (v_kind::text || ': no tenía cupón'));
    else
      v_res := private.redeem_coupon(v_coupon, r.id, null, r.receipt_at);
      v_notes := array_append(v_notes, (v_kind::text || ': ' || v_res));
      v_redeemed := v_res = 'redeemed';
    end if;
  end loop;

  update public.loyverse_receipts
     set status = 'processed', status_reason = array_to_string(v_notes, ' · '), customer_id = v_customer, processed_at = now()
   where id = r.id;
  return case when v_visit is not null then 'visit' else 'processed' end;
exception when others then
  update public.loyverse_receipts set status = 'error', status_reason = left(sqlerrm, 300) where id = p_receipt_id;
  return 'error';
end $$;

-- Mantenimiento diario (reemplaza close_month): vence cupones; los sellos ya no vencen.
create or replace function public.daily_maintenance() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  n := private.expire_coupons();
  -- Reintenta tickets que fallaron (máx. 5 intentos)
  perform public.process_receipt(id) from public.loyverse_receipts where status = 'error' and attempts < 5;
  return jsonb_build_object('coupons_expired', n, 'at', now());
end $$;
revoke all on function public.daily_maintenance() from public, anon, authenticated;

select cron.schedule('cerrar-mes', '10 6 * * *', $$ select public.daily_maintenance() $$);
