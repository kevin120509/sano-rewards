-- 019 · Identificación híbrida del cliente en el ticket (Fase 3)
-- Primero usa el customer_id que trae el recibo cuando el cajero escaneó el QR y añadió al cliente
-- (lo cruzamos con customers.loyverse_customer_id). Si no viene, cae al método anterior: el código
-- escrito en la nota del ticket o de un renglón. Así migramos al QR sin romper lo que ya funciona.
create or replace function public.find_customer_in_receipt(p_raw jsonb)
returns uuid language plpgsql stable set search_path = '' as $$
declare
  v_lv    text;
  v_text  text;
  v_match text[];
  v_id    uuid;
begin
  -- 1) Cliente vinculado al ticket en Loyverse (QR escaneado -> customer_id del recibo).
  v_lv := nullif(p_raw ->> 'customer_id', '');
  if v_lv is not null then
    select id into v_id
      from public.customers
     where loyverse_customer_id = v_lv
       and status = 'active';
    if v_id is not null then return v_id; end if;
  end if;

  -- 2) Respaldo: código escrito en la nota del ticket o de un renglón (comportamiento anterior).
  select concat_ws(' ', p_raw ->> 'note', string_agg(li ->> 'line_note', ' '))
    into v_text
    from jsonb_array_elements(coalesce(p_raw -> 'line_items', '[]'::jsonb)) li;

  for v_match in
    select regexp_matches(upper(coalesce(v_text, '')), '([A-Z]{1,2})\s*-?\s*([0-9]{4})', 'g')
  loop
    select c.id into v_id
      from public.customers c
      join public.groups g on g.id = c.group_id
     where c.code_number = v_match[2]::smallint
       and g.prefix = v_match[1]
       and c.status = 'active';
    if v_id is not null then return v_id; end if;
  end loop;
  return null;
end $$;
