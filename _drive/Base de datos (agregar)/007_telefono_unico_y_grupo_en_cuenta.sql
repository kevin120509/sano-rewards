-- 007 · Una persona = una cuenta (aplicada 2026-10-07)
-- - Teléfono único (se comparan los últimos 10 dígitos; el teléfono sigue siendo opcional).
-- - El grupo y nivel del cliente se copian a auth.users.raw_user_meta_data (sano_group, sano_theme,
--   sano_prefix, sano_tier) para que los correos de acceso salgan con el diseño de su grupo.
-- Nota: una cuenta ya tiene UNA tarjeta (customers.profile_id es único) y Google + correo con el mismo
-- correo verificado se unen en la misma cuenta (Supabase Auth).

create unique index if not exists profiles_phone_unique
  on public.profiles ((right(regexp_replace(phone, '\D', '', 'g'), 10)))
  where phone is not null and phone <> '';

create or replace function private.sync_customer_metadata()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update auth.users u
     set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
           'sano_group',  g.name,
           'sano_theme',  g.theme,
           'sano_prefix', g.prefix,
           'sano_tier',   t.code)
    from public.groups g, public.tiers t
   where u.id = new.profile_id and g.id = new.group_id and t.id = new.tier_id;
  return new;
end $$;

create or replace trigger customers_sync_metadata
  after insert or update of group_id, tier_id on public.customers
  for each row execute function private.sync_customer_metadata();

-- Relleno de clientes existentes (se ejecutó aparte):
-- update public.customers set tier_id = tier_id where profile_id is not null;
