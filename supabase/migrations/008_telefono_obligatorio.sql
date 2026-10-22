-- 008 · Teléfono obligatorio para crear tarjeta (los 3 accesos: código, contraseña y Google).
-- El frontend lo pide en "Casi listo"; aquí se refuerza en el servidor. Las tarjetas ya creadas no se tocan:
-- a quien no tenga teléfono la app lo manda a /completar antes de ver su tarjeta.
create or replace function public.register_customer(p_token text default null)
returns uuid
language plpgsql security definer set search_path = ''
as $function$
declare
  v_uid   uuid := auth.uid();
  v_group uuid;
  v_tier  uuid;
  v_id    uuid;
begin
  if v_uid is null then
    raise exception 'Necesitas iniciar sesión' using errcode = '28000';
  end if;

  select id into v_id from public.customers where profile_id = v_uid;
  if v_id is not null then
    return v_id;
  end if;

  if not exists (select 1 from public.profiles p
                  where p.id = v_uid
                    and length(regexp_replace(coalesce(p.phone, ''), '\D', '', 'g')) >= 10) then
    raise exception 'Necesitamos tu número de teléfono para crear tu tarjeta' using errcode = '22023';
  end if;

  if p_token is null then
    select id into v_group from public.groups where is_default and active;
  else
    select id into v_group from public.groups where registration_token = p_token and active;
  end if;
  if v_group is null then
    raise exception 'El código QR no es válido' using errcode = 'P0002';
  end if;

  select id into v_tier from public.tiers where is_default;

  insert into public.customers (profile_id, group_id, tier_id, code_number)
  values (v_uid, v_group, v_tier, public.generate_code_number())
  returning id into v_id;

  perform public.ensure_open_card(v_id, public.local_period());
  return v_id;
end $function$;
