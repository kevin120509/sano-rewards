-- 013 · La tarea de cada minuto también trae los descuentos de Loyverse (cada 5 min) para que la dueña
-- pueda elegir como premio de un grupo cualquier descuento que cree en Loyverse.
create or replace function public.loyverse_sync_discounts(p_secret text, p_discounts jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb; n int := 0; ids text[] := '{}';
begin
  if not private.loyverse_sync_ok(p_secret) then raise exception 'invalid_key' using errcode = '28000'; end if;
  for r in select value from jsonb_array_elements(coalesce(p_discounts, '[]'::jsonb)) loop
    -- Se omiten los borrados y el "descuento por puntos" propio de Loyverse (no sirve como premio).
    if r ->> 'deleted_at' is not null or r ->> 'type' = 'DISCOUNT_BY_POINTS' then continue; end if;
    ids := ids || (r ->> 'id');
    insert into public.loyverse_discounts (loyverse_id, name, discount_type, value, synced_at, deleted_at)
    values (r ->> 'id', r ->> 'name', r ->> 'type', coalesce((r ->> 'discount_percent')::numeric, (r ->> 'discount_amount')::numeric), now(), null)
    on conflict (loyverse_id) do update set name = excluded.name, discount_type = excluded.discount_type, value = excluded.value,
                                            synced_at = now(), deleted_at = null;
    n := n + 1;
  end loop;
  -- Los que ya no vienen de Loyverse se marcan como borrados (no se eliminan: hay premios que los referencian).
  update public.loyverse_discounts set deleted_at = now() where deleted_at is null and not (loyverse_id = any (ids));
  return jsonb_build_object('synced', n);
end $$;
revoke all on function public.loyverse_sync_discounts(text, jsonb) from public, anon, authenticated;
grant execute on function public.loyverse_sync_discounts(text, jsonb) to service_role;
