-- 004 · Entrada del webhook de Loyverse + reporte de descuentos de premio mal usados (aplicada 2026-10-06)
create table if not exists private.webhook_keys (
  name       text primary key,
  key_hash   text not null,          -- SHA-256 en hex; la clave en claro vive solo en prueba-loyverse/.env
  created_at timestamptz not null default now()
);
alter table private.webhook_keys enable row level security;
revoke all on private.webhook_keys from public, anon, authenticated;

insert into private.webhook_keys (name, key_hash)
values ('loyverse', 'cc6ca86d8f90a84e805905e9214de28271bc3c8c827beeb82bf7b9bcad00900e')
on conflict (name) do update set key_hash = excluded.key_hash;

create or replace function public.loyverse_ingest(p_key text, p_payload jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_hash text;
  r      jsonb;
  v_id   uuid;
  v_res  text;
  v_out  jsonb := '[]'::jsonb;
begin
  select key_hash into v_hash from private.webhook_keys where name = 'loyverse';
  if v_hash is null or p_key is null
     or encode(sha256(convert_to(p_key, 'UTF8')), 'hex') <> v_hash then
    raise exception 'invalid_key' using errcode = '28000';
  end if;

  for r in select value from jsonb_array_elements(coalesce(p_payload -> 'receipts', '[]'::jsonb)) loop
    v_id  := public.upsert_loyverse_receipt(r);
    v_res := public.process_receipt(v_id);
    v_out := v_out || jsonb_build_object('receipt_number', r ->> 'receipt_number', 'result', v_res);
  end loop;
  return v_out;
end $$;
revoke all on function public.loyverse_ingest(text, jsonb) from public, anon, authenticated;
grant execute on function public.loyverse_ingest(text, jsonb) to service_role;

create or replace function public.reward_misuse_report(p_since timestamptz default now() - interval '30 days')
returns table (receipt_number text, receipt_at timestamptz, discount_name text, customer_code text)
language sql stable security definer set search_path = ''
as $$
  select r.receipt_number, r.receipt_at, d.name, g.prefix || '-' || c.code_number
    from public.receipt_discounts rd
    join public.loyverse_receipts r on r.id = rd.receipt_id
    left join public.loyverse_discounts d on d.loyverse_id = rd.loyverse_discount_id
    left join public.customers c on c.id = r.customer_id
    left join public.groups g on g.id = c.group_id
   where r.receipt_type = 'SALE' and r.cancelled_at is null and r.receipt_at >= p_since
     and exists (select 1 from public.rewards rw where rw.loyverse_discount_id = rd.loyverse_discount_id)
     and not exists (select 1 from public.loyalty_cards lc where lc.redeemed_receipt_id = r.id)
   order by r.receipt_at desc;
$$;
revoke all on function public.reward_misuse_report(timestamptz) from public, anon, authenticated;
grant execute on function public.reward_misuse_report(timestamptz) to service_role;
