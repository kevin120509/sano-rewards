-- 016 · Buscar por código exacto en el mostrador
-- ESTADO: NO APLICADA. Kevin debe aprobarla antes de correrla en Supabase.
--
-- Qué arregla: al escribir un código como "C-0000", staff_search_customers quitaba lo que no es
-- dígito ("0000") y buscaba teléfonos que contuvieran "0000", mostrando clientes con otro código.
--
-- Cambio: si lo escrito tiene forma de código (1-2 letras, guion opcional, 4 dígitos; sin importar
-- mayúsculas ni espacios alrededor; ej. "C-8571", "c8571", "gm-1234") devuelve SOLO el cliente cuyo
-- prefijo de grupo (groups.prefix) y code_number coinciden exactamente. Si no existe -> [].
-- Cualquier otra búsqueda (nombre, correo, 4 dígitos sueltos, teléfono) queda igual que en 012.
-- Misma firma, roles, mínimo de 2 caracteres, orden, limit 25 y grants.

create or replace function public.staff_search_customers(p_q text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare q text := trim(coalesce(p_q, '')); d text := regexp_replace(coalesce(p_q, ''), '\D', '', 'g'); v jsonb;
begin
  perform private.require_role(array['superadmin', 'owner', 'manager', 'cashier']);
  if length(q) < 2 then return '[]'::jsonb; end if;

  -- Forma de código: 1-2 letras A-Z, guion opcional, exactamente 4 dígitos (anclada).
  if q ~* '^[A-Z]{1,2}-?[0-9]{4}$' then
    select coalesce(jsonb_agg(private.customer_summary(x.id) order by x.full_name), '[]'::jsonb) into v from (
      select c.id, p.full_name from public.customers c
        join public.profiles p on p.id = c.profile_id
        join public.groups g on g.id = c.group_id
       where g.prefix = upper(regexp_replace(q, '[^A-Za-z]', '', 'g'))
         and c.code_number = (regexp_replace(q, '\D', '', 'g'))::smallint
       order by p.full_name limit 25) x;
    return v;
  end if;

  -- Cualquier otra búsqueda: igual que en 012.
  select coalesce(jsonb_agg(private.customer_summary(x.id) order by x.full_name), '[]'::jsonb) into v from (
    select c.id, p.full_name from public.customers c join public.profiles p on p.id = c.profile_id
     where p.full_name ilike '%' || q || '%'
        or p.email ilike q || '%'
        or (length(d) = 4 and c.code_number::text = d)
        or (length(d) >= 4 and regexp_replace(coalesce(p.phone, ''), '\D', '', 'g') like '%' || d || '%')
     order by p.full_name limit 25) x;
  return v;
end $$;

-- Permisos (igual que 012 para esta función).
revoke all on function public.staff_search_customers(text) from public, anon;
grant execute on function public.staff_search_customers(text) to authenticated;

-- ===== Consultas de prueba (solo lectura; correr como usuario de caja) =====
-- 1) select public.staff_search_customers('C-0000');   -- esperado: []  (ningún cliente tiene C-0000)
-- 2) select public.staff_search_customers('c-0000');   -- esperado: []  (minúsculas, igual)
-- 3) select public.staff_search_customers('<nombre parcial>');  -- esperado: mismo resultado que antes de 016 (por nombre/correo)
-- 4) select public.staff_search_customers('0000');      -- esperado: igual que antes (sin letras: code_number=0000 no existe; solo teléfonos que contengan 0000)
-- 5) select public.staff_search_customers('ZZ-1234');  -- esperado: []  (prefijo ZZ no existe)
