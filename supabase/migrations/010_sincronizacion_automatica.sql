-- 010 · "El sistema pregunta a Loyverse" cada minuto (respaldo del webhook, que a veces no llega).
-- pg_cron llama a la Edge Function loyverse-sync con un secreto guardado en Vault (se genera aquí; nadie lo ve).
-- La función trae de Loyverse los tickets actualizados y los procesa igual que el webhook (idempotente).
create extension if not exists pg_net;
create extension if not exists pg_cron;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'loyverse_sync_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'loyverse_sync_secret', 'Secreto entre pg_cron y la Edge Function loyverse-sync');
  end if;
end $$;

create or replace function private.loyverse_sync_ok(p_secret text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_secret is not null and p_secret = (select decrypted_secret from vault.decrypted_secrets where name = 'loyverse_sync_secret');
$$;

-- Configuración para la función: token de Loyverse (Vault, nombre 'loyverse_token', se carga aparte, nunca en archivos)
-- y desde cuándo pedir tickets (el updated_at más reciente que ya tenemos, sin las ventas de la cuenta anterior).
create or replace function public.loyverse_sync_config(p_secret text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.loyverse_sync_ok(p_secret) then raise exception 'invalid_key' using errcode = '28000'; end if;
  return jsonb_build_object(
    'token', (select decrypted_secret from vault.decrypted_secrets where name = 'loyverse_token'),
    'since', (select max((raw ->> 'updated_at')::timestamptz) from public.loyverse_receipts where receipt_number not like 'ANT-%'));
end $$;

create or replace function public.loyverse_sync_ingest(p_secret text, p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb; v_id uuid; v_res text; v_out jsonb := '[]'::jsonb;
begin
  if not private.loyverse_sync_ok(p_secret) then raise exception 'invalid_key' using errcode = '28000'; end if;
  for r in select value from jsonb_array_elements(coalesce(p_payload -> 'receipts', '[]'::jsonb)) loop
    v_id  := public.upsert_loyverse_receipt(r);
    v_res := public.process_receipt(v_id);
    v_out := v_out || jsonb_build_object('receipt_number', r ->> 'receipt_number', 'result', v_res);
  end loop;
  return v_out;
end $$;

revoke all on function private.loyverse_sync_ok(text) from public, anon, authenticated;
revoke all on function public.loyverse_sync_config(text) from public, anon, authenticated;
revoke all on function public.loyverse_sync_ingest(text, jsonb) from public, anon, authenticated;
grant execute on function public.loyverse_sync_config(text) to service_role;
grant execute on function public.loyverse_sync_ingest(text, jsonb) to service_role;

-- El token de Loyverse se carga en Vault por separado (nunca en archivos):
--   select vault.create_secret('<TOKEN>', 'loyverse_token', 'Token API de Loyverse');   -- o vault.update_secret(id, '<TOKEN>')

-- Tarea cada minuto + limpieza diaria del historial de cron.
select cron.schedule('loyverse-sync', '* * * * *', $job$
  select net.http_post(
    url := 'https://xddzafjkmtxgwqmrcdwg.supabase.co/functions/v1/loyverse-sync',
    headers := jsonb_build_object('Content-Type','application/json','x-sync-secret',(select decrypted_secret from vault.decrypted_secrets where name='loyverse_sync_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 20000);
$job$);
select cron.schedule('limpiar-historial-cron', '15 9 * * *', $job$ delete from cron.job_run_details where end_time < now() - interval '3 days' $job$);
