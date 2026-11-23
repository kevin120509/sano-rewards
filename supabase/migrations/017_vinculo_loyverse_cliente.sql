-- 017 · Vínculo con el cliente de Loyverse
-- Objetivo: poder identificar al cliente por el customer_id que trae el recibo
-- (cuando el cajero escanea su QR y lo añade al ticket), además del método actual
-- de leer el código en la nota. El customer_code en Loyverse será el mismo código
-- que ya ve el cliente: prefijo-número (ej. "C-8571").

-- Guarda el id del cliente equivalente en Loyverse (lo devuelve la API al crearlo/sincronizarlo).
alter table public.customers
  add column if not exists loyverse_customer_id text;

-- Un cliente de Loyverse no puede estar vinculado a dos clientes nuestros.
create unique index if not exists customers_loyverse_customer_id_key
  on public.customers (loyverse_customer_id)
  where loyverse_customer_id is not null;

comment on column public.customers.loyverse_customer_id is
  'id del cliente equivalente en Loyverse (sincronizado por API). El customer_code en Loyverse = prefix-code_number.';

-- Helper reutilizable: el código completo del cliente (= customer_code en Loyverse).
create or replace function public.customer_code(p_customer uuid)
  returns text language sql stable as $$
  select g.prefix || '-' || c.code_number
    from public.customers c
    join public.groups g on g.id = c.group_id
   where c.id = p_customer;
$$;
