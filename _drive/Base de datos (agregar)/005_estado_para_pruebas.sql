-- 005 (+006) · Estado para el script de pruebas, protegido con la misma clave del webhook (aplicadas 2026-10-06)
-- 006 cambió la ventana de la alerta de descuento de 1 a 60 días; aquí ya va la versión final.
create or replace function public.loyverse_check(p_key text, p_numbers text[], p_code text default null)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_hash text;
  v_customer uuid;
begin
  select key_hash into v_hash from private.webhook_keys where name = 'loyverse';
  if v_hash is null or p_key is null
     or encode(sha256(convert_to(p_key, 'UTF8')), 'hex') <> v_hash then
    raise exception 'invalid_key' using errcode = '28000';
  end if;

  if p_code is not null then
    select c.id into v_customer
      from public.customers c join public.groups g on g.id = c.group_id
     where upper(g.prefix || '-' || c.code_number) = upper(p_code);
  end if;

  return jsonb_build_object(
    'receipts', coalesce((
      select jsonb_object_agg(r.receipt_number, jsonb_build_object('status', r.status, 'reason', r.status_reason))
        from public.loyverse_receipts r where r.receipt_number = any(p_numbers)), '{}'::jsonb),
    'card', (
      select jsonb_build_object('visits', oc.visits_count, 'goal', oc.visits_goal, 'tier', t.code,
               'ready', (select count(*) from public.loyalty_cards x where x.customer_id = v_customer and x.status = 'reward_ready'),
               'redeemed', (select count(*) from public.loyalty_cards x where x.customer_id = v_customer and x.status = 'redeemed'))
        from public.customers c
        join public.tiers t on t.id = public.effective_tier_id(c.id)
        left join public.loyalty_cards oc on oc.customer_id = c.id and oc.status = 'open'
       where c.id = v_customer),
    'misuse', coalesce((select jsonb_agg(m.receipt_number) from public.reward_misuse_report(now() - interval '60 days') m
                         where m.receipt_number = any(p_numbers)), '[]'::jsonb)
  );
end $$;
revoke all on function public.loyverse_check(text, text[], text) from public, anon, authenticated;
grant execute on function public.loyverse_check(text, text[], text) to service_role;
