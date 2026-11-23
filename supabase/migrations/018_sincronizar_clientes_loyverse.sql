-- 018 · Sincronización de clientes hacia Loyverse (Fase 2)
-- La Edge Function loyverse-sync (con ?clientes=1) pide los clientes aún no vinculados,
-- los crea en Loyverse por API (con su customer_code = prefijo-número) y guarda aquí el id
-- que devuelve Loyverse. Reutiliza el secreto compartido pg_cron <-> función (private.loyverse_sync_ok).

-- Clientes aún no vinculados a Loyverse (lote pequeño para respetar el límite de la API).
create or replace function public.loyverse_customers_pending(p_secret text, p_limit int default 20)
  returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.loyverse_sync_ok(p_secret) then raise exception 'invalid_key' using errcode = '28000'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',   sub.id,
      'code', g.prefix || '-' || sub.code_number,
      'name', coalesce(p.full_name, g.prefix || '-' || sub.code_number)
    ))
    from (
      select cc.id, cc.group_id, cc.profile_id, cc.code_number
        from public.customers cc
       where cc.loyverse_customer_id is null
       order by cc.created_at
       limit greatest(1, least(p_limit, 100))
    ) sub
    join public.groups g on g.id = sub.group_id
    left join public.profiles p on p.id = sub.profile_id
  ), '[]'::jsonb);
end $$;

-- Guarda el id de Loyverse en cada cliente. Ignora un cliente ya vinculado o un id ya tomado.
create or replace function public.loyverse_customers_mark(p_secret text, p_pairs jsonb)
  returns int language plpgsql security definer set search_path = '' as $$
declare r jsonb; n int := 0;
begin
  if not private.loyverse_sync_ok(p_secret) then raise exception 'invalid_key' using errcode = '28000'; end if;
  for r in select value from jsonb_array_elements(coalesce(p_pairs, '[]'::jsonb)) loop
    update public.customers
       set loyverse_customer_id = r ->> 'loyverse_id'
     where id = (r ->> 'customer_id')::uuid
       and loyverse_customer_id is null
       and not exists (select 1 from public.customers x where x.loyverse_customer_id = r ->> 'loyverse_id');
    if found then n := n + 1; end if;
  end loop;
  return n;
end $$;

revoke all on function public.loyverse_customers_pending(text, int) from public, anon, authenticated;
revoke all on function public.loyverse_customers_mark(text, jsonb) from public, anon, authenticated;
grant execute on function public.loyverse_customers_pending(text, int) to service_role;
grant execute on function public.loyverse_customers_mark(text, jsonb) to service_role;
