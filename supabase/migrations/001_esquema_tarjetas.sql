-- =====================================================================
-- Sano Rewards · Tarjetas de lealtad (Cliente Consentido)
-- Esquema completo para Supabase (pegar en SQL Editor y ejecutar)
-- Un proyecto de Supabase por negocio. Hora local: America/Mexico_City.
-- Requisitos: Postgres 15+ (Supabase). pg_cron es opcional (sección 9).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Tipos
-- ---------------------------------------------------------------------
create type public.card_status    as enum ('open', 'reward_ready', 'redeemed', 'expired');
create type public.receipt_status as enum ('pending', 'processed', 'ignored', 'error');
create type public.staff_role     as enum ('superadmin', 'owner', 'manager');
create type public.notify_channel as enum ('push', 'email');
create type public.notify_kind    as enum ('visit_added', 'reward_ready', 'expiry_reminder');

-- ---------------------------------------------------------------------
-- 2. Configuración (filas únicas)
-- ---------------------------------------------------------------------
create table public.business_settings (
  id              boolean primary key default true check (id),
  name            text        not null,
  timezone        text        not null default 'America/Mexico_City',
  loyalty_enabled boolean     not null default true,
  updated_at      timestamptz not null default now()
);
comment on table public.business_settings is 'Configuración única del negocio (una sola fila).';

create table public.loyverse_connection (
  id                   boolean primary key default true check (id),
  store_id             text,
  token_secret_id      uuid,   -- id en vault.secrets (token de API cifrado)
  webhook_secret_id    uuid,   -- id en vault.secrets (secreto para validar avisos)
  webhook_id           text,
  last_receipt_sync_at timestamptz,
  updated_at           timestamptz not null default now()
);
comment on table public.loyverse_connection is 'Conexión única con Loyverse; los secretos viven cifrados en Supabase Vault.';

create table public.staff (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  role       public.staff_role not null,
  created_at timestamptz not null default now()
);
comment on table public.staff is 'Personal con acceso al panel: superadmin (CODIA) y, a futuro, dueño/gerente.';

-- ---------------------------------------------------------------------
-- 3. Catálogos: niveles, grupos, descuentos, recompensas
-- ---------------------------------------------------------------------
create table public.tiers (
  id          uuid primary key default gen_random_uuid(),
  code        text     not null unique check (code ~ '^[a-z_]{3,20}$'),
  name        text     not null,
  visits_goal smallint not null check (visits_goal between 1 and 31),
  is_default  boolean  not null default false,
  sort_order  smallint not null default 0,
  created_at  timestamptz not null default now()
);
create unique index tiers_one_default on public.tiers (is_default) where is_default;

create table public.groups (
  id                 uuid primary key default gen_random_uuid(),
  name               text    not null unique,
  prefix             varchar(2) not null unique check (prefix ~ '^[A-Z]{1,2}$'),
  registration_token text    not null unique default replace(gen_random_uuid()::text, '-', ''),
  primary_color      char(7) not null default '#2F7A22' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color       char(7) not null default '#FFFFFF' check (accent_color  ~ '^#[0-9A-Fa-f]{6}$'),
  welcome_message    text,
  is_default         boolean not null default false,
  active             boolean not null default true,
  created_at         timestamptz not null default now()
);
create unique index groups_one_default on public.groups (is_default) where is_default;

create table public.loyverse_discounts (
  loyverse_id   text primary key,
  name          text not null,
  discount_type text not null,
  value         numeric(12, 2),
  deleted_at    timestamptz,
  synced_at     timestamptz not null default now()
);
comment on table public.loyverse_discounts is 'Copia de los descuentos creados en Loyverse.';

create table public.rewards (
  id                   uuid primary key default gen_random_uuid(),
  tier_id              uuid not null references public.tiers (id),
  group_id             uuid references public.groups (id),   -- null = todos los grupos
  loyverse_discount_id text not null references public.loyverse_discounts (loyverse_id),
  description          text,
  active               boolean not null default true,
  created_at           timestamptz not null default now()
);
create unique index rewards_one_active
  on public.rewards (tier_id, coalesce(group_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where active;
create index rewards_group_idx    on public.rewards (group_id);
create index rewards_discount_idx on public.rewards (loyverse_discount_id);

-- ---------------------------------------------------------------------
-- 4. Personas y clientes
-- ---------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  email      text,
  phone      text check (phone is null or phone ~ '^\+?[0-9]{10,15}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null unique references public.profiles (id) on delete cascade,
  group_id        uuid not null references public.groups (id),
  tier_id         uuid not null references public.tiers (id),
  code_number     smallint not null unique check (code_number between 1000 and 9999),
  tier_expires_at timestamptz,
  status          text not null default 'active' check (status in ('active', 'blocked')),
  created_at      timestamptz not null default now()
);
create index customers_group_idx on public.customers (group_id);
create index customers_tier_idx  on public.customers (tier_id);
create index customers_tier_expiry_idx on public.customers (tier_expires_at) where tier_expires_at is not null;

-- ---------------------------------------------------------------------
-- 5. Ventas de Loyverse
-- ---------------------------------------------------------------------
create table public.loyverse_receipts (
  id             uuid primary key default gen_random_uuid(),
  receipt_number text not null unique,
  receipt_type   text not null check (receipt_type in ('SALE', 'REFUND')),
  refund_for     text,
  receipt_at     timestamptz not null,
  total          numeric(12, 2) not null default 0,
  cancelled_at   timestamptz,
  customer_id    uuid references public.customers (id),
  status         public.receipt_status not null default 'pending',
  status_reason  text,
  attempts       smallint not null default 0,
  raw            jsonb not null,
  received_at    timestamptz not null default now(),
  processed_at   timestamptz
);
create index receipts_pending_idx  on public.loyverse_receipts (received_at) where status = 'pending';
create index receipts_customer_idx on public.loyverse_receipts (customer_id, receipt_at desc);
create index receipts_at_idx       on public.loyverse_receipts (receipt_at desc);

create table public.receipt_discounts (
  receipt_id           uuid not null references public.loyverse_receipts (id) on delete cascade,
  loyverse_discount_id text not null,
  amount               numeric(12, 2) not null default 0,
  primary key (receipt_id, loyverse_discount_id)
);
create index receipt_discounts_discount_idx on public.receipt_discounts (loyverse_discount_id);

-- ---------------------------------------------------------------------
-- 6. Tarjetas y visitas
-- ---------------------------------------------------------------------
create table public.loyalty_cards (
  id                  uuid primary key default gen_random_uuid(),
  customer_id         uuid not null references public.customers (id) on delete cascade,
  period_month        date not null check (extract(day from period_month) = 1),
  sequence            smallint not null default 1 check (sequence >= 1),
  visits_goal         smallint not null check (visits_goal between 1 and 31),
  visits_count        smallint not null default 0,
  status              public.card_status not null default 'open',
  reward_id           uuid references public.rewards (id),
  completed_at        timestamptz,
  redeemed_at         timestamptz,
  redeemed_receipt_id uuid references public.loyverse_receipts (id),
  expired_at          timestamptz,
  created_at          timestamptz not null default now(),
  unique (customer_id, period_month, sequence),
  unique (id, customer_id),
  check (visits_count between 0 and visits_goal),
  check (status <> 'redeemed' or redeemed_at is not null)
);
create unique index cards_one_open on public.loyalty_cards (customer_id) where status = 'open';
create index cards_customer_period_idx on public.loyalty_cards (customer_id, period_month);
create index cards_active_period_idx   on public.loyalty_cards (period_month) where status in ('open', 'reward_ready');
create index cards_reward_idx          on public.loyalty_cards (reward_id);
create index cards_redeemed_receipt_idx on public.loyalty_cards (redeemed_receipt_id);

create table public.visits (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  card_id     uuid not null,
  receipt_id  uuid not null unique references public.loyverse_receipts (id),
  visit_date  date not null,
  visited_at  timestamptz not null,
  voided_at   timestamptz,
  void_reason text,
  created_at  timestamptz not null default now(),
  foreign key (card_id, customer_id) references public.loyalty_cards (id, customer_id) on delete cascade
);
create unique index visits_one_per_day on public.visits (customer_id, visit_date) where voided_at is null;
create index visits_card_idx on public.visits (card_id);

-- ---------------------------------------------------------------------
-- 7. Avisos, auditoría y reportes
-- ---------------------------------------------------------------------
create table public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth_key     text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);
create index push_profile_idx on public.push_subscriptions (profile_id);

create table public.notifications_sent (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  kind        public.notify_kind not null,
  channel     public.notify_channel not null,
  dedupe_key  text not null unique,
  status      text not null default 'sent' check (status in ('sent', 'failed')),
  error       text,
  sent_at     timestamptz not null default now()
);
create index notifications_customer_idx on public.notifications_sent (customer_id, sent_at desc);

create table public.audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid references auth.users (id) on delete set null,
  action     text not null,
  entity     text not null,
  entity_id  uuid,
  before     jsonb,
  after      jsonb,
  created_at timestamptz not null default now()
);
create index audit_entity_idx on public.audit_log (entity, entity_id);

create table public.monthly_group_stats (
  period_month          date not null check (extract(day from period_month) = 1),
  group_id              uuid not null references public.groups (id),
  customers_total       integer not null default 0,
  customers_new         integer not null default 0,
  customers_with_visits integer not null default 0,
  customers_multi_visit integer not null default 0,
  visits_total          integer not null default 0,
  rewards_completed     integer not null default 0,
  rewards_redeemed      integer not null default 0,
  computed_at           timestamptz not null default now(),
  primary key (period_month, group_id)
);
create index monthly_stats_group_idx on public.monthly_group_stats (group_id);

-- ---------------------------------------------------------------------
-- 8. Funciones
-- ---------------------------------------------------------------------

-- 8.1 Utilidades de rol y fecha local
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff s where s.user_id = auth.uid());
$$;

create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff s where s.user_id = auth.uid() and s.role = 'superadmin');
$$;

create or replace function public.business_tz()
returns text language sql stable set search_path = '' as $$
  select coalesce((select timezone from public.business_settings where id), 'America/Mexico_City');
$$;

create or replace function public.local_period(p_at timestamptz default now())
returns date language sql stable set search_path = '' as $$
  select date_trunc('month', (p_at at time zone public.business_tz()))::date;
$$;

-- Fin del mes local (instante exacto en que termina el periodo)
create or replace function public.period_end(p_period date)
returns timestamptz language sql stable set search_path = '' as $$
  select ((p_period + interval '1 month')::timestamp at time zone public.business_tz());
$$;

-- 8.2 updated_at automático
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.business_settings
  for each row execute function public.touch_updated_at();
create trigger loyverse_connection_touch before update on public.loyverse_connection
  for each row execute function public.touch_updated_at();

-- 8.3 Perfil automático al crear la cuenta (Google, correo o contraseña)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 8.4 Nivel vigente de un cliente (si Premium venció, regresa al nivel por defecto)
create or replace function public.effective_tier_id(p_customer uuid)
returns uuid language sql stable set search_path = '' as $$
  select case
           when c.tier_expires_at is not null and c.tier_expires_at <= now()
             then (select t.id from public.tiers t where t.is_default)
           else c.tier_id
         end
  from public.customers c
  where c.id = p_customer;
$$;

-- 8.5 Recompensa que corresponde (nivel + grupo; si no hay, nivel + todos los grupos)
create or replace function public.resolve_reward(p_customer uuid)
returns uuid language sql stable set search_path = '' as $$
  select r.id
  from public.customers c
  join public.rewards r
    on r.tier_id = public.effective_tier_id(c.id)
   and r.active
   and (r.group_id = c.group_id or r.group_id is null)
  where c.id = p_customer
  order by (r.group_id is null)  -- primero la del grupo específico
  limit 1;
$$;

-- 8.6 Número de código único (1000-9999)
create or replace function public.generate_code_number()
returns smallint language plpgsql volatile set search_path = '' as $$
declare
  v_code smallint;
  v_try  int := 0;
begin
  loop
    v_code := (1000 + floor(random() * 9000))::smallint;
    exit when not exists (select 1 from public.customers where code_number = v_code);
    v_try := v_try + 1;
    if v_try > 200 then
      raise exception 'No hay códigos disponibles' using errcode = 'P0001';
    end if;
  end loop;
  return v_code;
end $$;

-- 8.7 Tarjeta abierta del periodo (la crea si no existe; vence la de un mes anterior)
create or replace function public.ensure_open_card(p_customer uuid, p_period date)
returns public.loyalty_cards language plpgsql set search_path = '' as $$
declare
  v_card public.loyalty_cards;
  v_goal smallint;
  v_seq  smallint;
begin
  select * into v_card from public.loyalty_cards
   where customer_id = p_customer and status = 'open'
   for update;

  if found and v_card.period_month = p_period then
    return v_card;
  end if;

  if found and v_card.period_month < p_period then
    update public.loyalty_cards set status = 'expired', expired_at = now() where id = v_card.id;
  elsif found then
    -- La tarjeta abierta es de un mes posterior: no se crea otra
    return v_card;
  end if;

  select t.visits_goal into v_goal from public.tiers t where t.id = public.effective_tier_id(p_customer);
  select coalesce(max(sequence), 0) + 1 into v_seq
    from public.loyalty_cards where customer_id = p_customer and period_month = p_period;

  insert into public.loyalty_cards (customer_id, period_month, sequence, visits_goal)
  values (p_customer, p_period, v_seq, v_goal)
  returning * into v_card;
  return v_card;
end $$;

-- 8.8 Contador de visitas (lo mantiene la base de datos)
create or replace function public.visits_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_card public.loyalty_cards;
  v_goal smallint;
begin
  update public.loyalty_cards set visits_count = visits_count + 1
   where id = new.card_id
   returning * into v_card;

  if v_card.visits_count >= v_card.visits_goal then
    update public.loyalty_cards
       set status = 'reward_ready',
           completed_at = new.visited_at,
           reward_id = public.resolve_reward(v_card.customer_id)
     where id = v_card.id;

    select t.visits_goal into v_goal from public.tiers t
     where t.id = public.effective_tier_id(v_card.customer_id);

    insert into public.loyalty_cards (customer_id, period_month, sequence, visits_goal)
    values (v_card.customer_id, v_card.period_month, v_card.sequence + 1, v_goal);
  end if;
  return new;
end $$;

create trigger visits_count_insert after insert on public.visits
  for each row execute function public.visits_after_insert();

create or replace function public.visits_after_void()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_card public.loyalty_cards;
  v_next public.loyalty_cards;
begin
  if old.voided_at is not null or new.voided_at is null then
    return new;
  end if;

  update public.loyalty_cards set visits_count = visits_count - 1
   where id = new.card_id
   returning * into v_card;

  -- Si esa visita había completado la tarjeta y el premio no se ha canjeado, se revierte
  if v_card.status = 'reward_ready' then
    select * into v_next from public.loyalty_cards
     where customer_id = v_card.customer_id and status = 'open';
    if v_next.id is null or (v_next.visits_count = 0 and v_next.period_month = v_card.period_month) then
      if v_next.id is not null then
        delete from public.loyalty_cards where id = v_next.id;
      end if;
      update public.loyalty_cards
         set status = 'open', completed_at = null, reward_id = null
       where id = v_card.id;
    end if;
  end if;
  return new;
end $$;

create trigger visits_count_void after update of voided_at on public.visits
  for each row execute function public.visits_after_void();

-- 8.9 Buscar el código del cliente en la venta (nota del ticket + comentarios de producto)
create or replace function public.find_customer_in_receipt(p_raw jsonb)
returns uuid language plpgsql stable set search_path = '' as $$
declare
  v_text  text;
  v_match text[];
  v_id    uuid;
begin
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
    if v_id is not null then
      return v_id;
    end if;
  end loop;
  return null;
end $$;

-- 8.10 Guardar/actualizar una venta que llega de Loyverse (lo llama el servidor)
create or replace function public.upsert_loyverse_receipt(p_receipt jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  insert into public.loyverse_receipts
    (receipt_number, receipt_type, refund_for, receipt_at, total, cancelled_at, raw)
  values (
    p_receipt ->> 'receipt_number',
    coalesce(p_receipt ->> 'receipt_type', 'SALE'),
    p_receipt ->> 'refund_for',
    coalesce((p_receipt ->> 'receipt_date')::timestamptz, (p_receipt ->> 'created_at')::timestamptz),
    coalesce((p_receipt ->> 'total_money')::numeric, 0),
    (p_receipt ->> 'cancelled_at')::timestamptz,
    p_receipt
  )
  on conflict (receipt_number) do update
     set raw          = excluded.raw,
         cancelled_at = excluded.cancelled_at,
         status       = case
                          when public.loyverse_receipts.cancelled_at is null
                           and excluded.cancelled_at is not null then 'pending'::public.receipt_status
                          else public.loyverse_receipts.status
                        end
  returning id into v_id;
  return v_id;
end $$;

-- 8.11 Procesar una venta: canje de premio + visita
create or replace function public.process_receipt(p_receipt_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  r          public.loyverse_receipts;
  v_original public.loyverse_receipts;
  v_customer uuid;
  v_date     date;
  v_period   date;
  v_card     public.loyalty_cards;
  v_redeem   uuid;
  v_inserted int;
begin
  select * into r from public.loyverse_receipts where id = p_receipt_id for update;
  if not found then
    return 'not_found';
  end if;
  if r.status <> 'pending' then
    return r.status::text;
  end if;

  update public.loyverse_receipts set attempts = attempts + 1 where id = r.id;

  -- Venta cancelada: se anula su visita y se revierte su canje
  if r.cancelled_at is not null then
    update public.visits set voided_at = now(), void_reason = 'cancelled'
     where receipt_id = r.id and voided_at is null;
    update public.loyalty_cards
       set status = 'reward_ready', redeemed_at = null, redeemed_receipt_id = null
     where redeemed_receipt_id = r.id;
    update public.loyverse_receipts
       set status = 'processed', status_reason = 'cancelled', processed_at = now()
     where id = r.id;
    return 'cancelled';
  end if;

  -- Devolución: anula la visita de la venta original
  if r.receipt_type = 'REFUND' then
    select * into v_original from public.loyverse_receipts where receipt_number = r.refund_for;
    if found then
      update public.visits set voided_at = now(), void_reason = 'refund'
       where receipt_id = v_original.id and voided_at is null;
    end if;
    update public.loyverse_receipts
       set status = 'processed', status_reason = 'refund', processed_at = now(),
           customer_id = v_original.customer_id
     where id = r.id;
    return 'refund';
  end if;

  -- Descuentos aplicados (de la venta y de cada producto)
  insert into public.receipt_discounts (receipt_id, loyverse_discount_id, amount)
  select r.id, d ->> 'id', sum(coalesce((d ->> 'money_amount')::numeric, 0))
    from (
      select jsonb_array_elements(coalesce(r.raw -> 'total_discounts', '[]'::jsonb)) as d
      union all
      select jsonb_array_elements(coalesce(li -> 'line_discounts', '[]'::jsonb))
        from jsonb_array_elements(coalesce(r.raw -> 'line_items', '[]'::jsonb)) li
    ) x
   where d ->> 'id' is not null
   group by d ->> 'id'
  on conflict do nothing;

  v_customer := public.find_customer_in_receipt(r.raw);
  if v_customer is null then
    update public.loyverse_receipts
       set status = 'ignored', status_reason = 'no_customer_code', processed_at = now()
     where id = r.id;
    return 'no_customer_code';
  end if;

  v_date   := (r.receipt_at at time zone public.business_tz())::date;
  v_period := date_trunc('month', v_date)::date;

  if v_period < public.local_period() then
    update public.loyverse_receipts
       set status = 'ignored', status_reason = 'closed_period', customer_id = v_customer, processed_at = now()
     where id = r.id;
    return 'closed_period';
  end if;

  -- Canje: si trae el descuento de un premio listo del cliente (el más antiguo)
  select c.id into v_redeem
    from public.loyalty_cards c
    join public.rewards rw on rw.id = c.reward_id
    join public.receipt_discounts rd on rd.receipt_id = r.id and rd.loyverse_discount_id = rw.loyverse_discount_id
   where c.customer_id = v_customer and c.status = 'reward_ready'
   order by c.completed_at
   limit 1
   for update of c;

  if v_redeem is not null then
    update public.loyalty_cards
       set status = 'redeemed', redeemed_at = r.receipt_at, redeemed_receipt_id = r.id
     where id = v_redeem;
  end if;

  -- Visita (máximo una por día; la del canje también cuenta)
  v_card := public.ensure_open_card(v_customer, v_period);
  insert into public.visits (customer_id, card_id, receipt_id, visit_date, visited_at)
  values (v_customer, v_card.id, r.id, v_date, r.receipt_at)
  on conflict do nothing;
  get diagnostics v_inserted = row_count;

  update public.loyverse_receipts
     set status = 'processed',
         status_reason = case
                           when v_inserted = 0 and v_redeem is not null then 'redeemed_already_visited_today'
                           when v_inserted = 0 then 'already_visited_today'
                           when v_redeem is not null then 'visit_and_redeem'
                           else 'visit'
                         end,
         customer_id = v_customer,
         processed_at = now()
   where id = r.id;

  return case when v_inserted = 0 then 'already_visited_today' else 'visit' end;
exception when others then
  update public.loyverse_receipts
     set status = 'error', status_reason = left(sqlerrm, 300)
   where id = p_receipt_id;
  return 'error';
end $$;

-- 8.12 Consulta pública de un grupo por su QR (para la página de registro)
create or replace function public.get_group_by_token(p_token text)
returns table (business_name text, group_name text, prefix text,
               primary_color text, accent_color text, welcome_message text)
language sql stable security definer set search_path = '' as $$
  select s.name, g.name, g.prefix::text, g.primary_color::text, g.accent_color::text, g.welcome_message
    from public.groups g
    cross join public.business_settings s
   where g.registration_token = p_token and g.active and s.loyalty_enabled;
$$;

-- 8.13 Registro del cliente (después de iniciar sesión). Token null = grupo por defecto
create or replace function public.register_customer(p_token text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
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

  if p_token is null then
    select id into v_group from public.groups where is_default and active;
  else
    select id into v_group from public.groups where registration_token = p_token and active;
  end if;
  if v_group is null then
    raise exception 'El código QR no es válido' using errcode = 'P0002';
  end if;

  select id into v_tier from public.tiers where is_default;

  insert into public.profiles (id, email)
  select v_uid, u.email from auth.users u where u.id = v_uid
  on conflict (id) do nothing;

  insert into public.customers (profile_id, group_id, tier_id, code_number)
  values (v_uid, v_group, v_tier, public.generate_code_number())
  returning id into v_id;

  perform public.ensure_open_card(v_id, public.local_period());
  return v_id;
end $$;

-- 8.14 Todo lo que muestra la pantalla del cliente, en una sola consulta
create or replace function public.my_card()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'code',          g.prefix || '-' || c.code_number,
    'full_name',     p.full_name,
    'group',         jsonb_build_object('name', g.name, 'prefix', g.prefix,
                                        'primary_color', g.primary_color, 'accent_color', g.accent_color,
                                        'welcome_message', g.welcome_message),
    'tier',          jsonb_build_object('code', t.code, 'name', t.name, 'expires_at', c.tier_expires_at),
    'visits_count',  coalesce(oc.visits_count, 0),
    'visits_goal',   coalesce(oc.visits_goal, t.visits_goal),
    'period_ends_at', public.period_end(public.local_period()),
    'rewards_ready', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'card_id', rc.id, 'completed_at', rc.completed_at,
                 'discount_name', d.name, 'description', rw.description)
               order by rc.completed_at)
          from public.loyalty_cards rc
          left join public.rewards rw on rw.id = rc.reward_id
          left join public.loyverse_discounts d on d.loyverse_id = rw.loyverse_discount_id
         where rc.customer_id = c.id and rc.status = 'reward_ready'), '[]'::jsonb),
    'recent_visits', coalesce((
        select jsonb_agg(v.visited_at order by v.visited_at desc)
          from (select visited_at from public.visits
                 where customer_id = c.id and voided_at is null
                 order by visited_at desc limit 5) v), '[]'::jsonb)
  )
  from public.customers c
  join public.profiles p on p.id = c.profile_id
  join public.groups   g on g.id = c.group_id
  join public.tiers    t on t.id = public.effective_tier_id(c.id)
  left join public.loyalty_cards oc
         on oc.customer_id = c.id and oc.status = 'open' and oc.period_month = public.local_period()
  where c.profile_id = auth.uid();
$$;

-- 8.15 Cambio de nivel (solo superadmin). Premium dura hasta el fin del mes en curso
create or replace function public.set_customer_tier(p_customer uuid, p_tier_code text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_tier    public.tiers;
  v_before  jsonb;
  v_card    public.loyalty_cards;
  v_expires timestamptz;
begin
  if not public.is_superadmin() then
    raise exception 'Solo superadmin' using errcode = '42501';
  end if;
  select * into v_tier from public.tiers where code = p_tier_code;
  if not found then
    raise exception 'Nivel no existe' using errcode = 'P0002';
  end if;

  select to_jsonb(c) into v_before from public.customers c where c.id = p_customer;
  v_expires := case when v_tier.is_default then null else public.period_end(public.local_period()) end;

  update public.customers set tier_id = v_tier.id, tier_expires_at = v_expires where id = p_customer;

  -- Ajusta la meta de la tarjeta abierta del mes al nuevo nivel
  select * into v_card from public.loyalty_cards
   where customer_id = p_customer and status = 'open' and period_month = public.local_period()
   for update;
  if found then
    if v_card.visits_count >= v_tier.visits_goal then
      update public.loyalty_cards
         set visits_goal = visits_count, status = 'reward_ready',
             completed_at = now(), reward_id = public.resolve_reward(p_customer)
       where id = v_card.id;
      insert into public.loyalty_cards (customer_id, period_month, sequence, visits_goal)
      values (p_customer, v_card.period_month, v_card.sequence + 1, v_tier.visits_goal);
    else
      update public.loyalty_cards set visits_goal = v_tier.visits_goal where id = v_card.id;
    end if;
  end if;

  insert into public.audit_log (actor_id, action, entity, entity_id, before, after)
  select auth.uid(), 'set_tier', 'customers', p_customer, v_before, to_jsonb(c)
    from public.customers c where c.id = p_customer;
end $$;

-- 8.16 Cierre de mes (idempotente: se puede correr todos los días)
create or replace function public.close_month()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_current date := public.local_period();
  v_prev    date := (v_current - interval '1 month')::date;
begin
  update public.loyalty_cards
     set status = 'expired', expired_at = now()
   where status in ('open', 'reward_ready') and period_month < v_current;

  update public.customers c
     set tier_id = (select id from public.tiers where is_default),
         tier_expires_at = null
   where c.tier_expires_at is not null and c.tier_expires_at <= now();

  insert into public.monthly_group_stats as m
    (period_month, group_id, customers_total, customers_new, customers_with_visits,
     customers_multi_visit, visits_total, rewards_completed, rewards_redeemed, computed_at)
  select v_prev, g.id,
         (select count(*) from public.customers c
           where c.group_id = g.id and c.created_at < public.period_end(v_prev)),
         (select count(*) from public.customers c
           where c.group_id = g.id and c.created_at >= public.period_end((v_prev - interval '1 month')::date)
             and c.created_at < public.period_end(v_prev)),
         coalesce(vs.customers_with_visits, 0),
         coalesce(vs.customers_multi_visit, 0),
         coalesce(vs.visits_total, 0),
         (select count(*) from public.loyalty_cards lc join public.customers c on c.id = lc.customer_id
           where c.group_id = g.id and lc.period_month = v_prev and lc.completed_at is not null),
         (select count(*) from public.loyalty_cards lc join public.customers c on c.id = lc.customer_id
           where c.group_id = g.id and lc.period_month = v_prev and lc.redeemed_at is not null),
         now()
    from public.groups g
    left join lateral (
      select count(*) filter (where n >= 1) as customers_with_visits,
             count(*) filter (where n >= 2) as customers_multi_visit,
             coalesce(sum(n), 0)            as visits_total
        from (select v.customer_id, count(*) as n
                from public.visits v join public.customers c on c.id = v.customer_id
               where c.group_id = g.id and v.voided_at is null
                 and v.visit_date >= v_prev and v.visit_date < v_current
               group by v.customer_id) per_customer
    ) vs on true
  on conflict (period_month, group_id) do update
     set customers_total       = excluded.customers_total,
         customers_new         = excluded.customers_new,
         customers_with_visits = excluded.customers_with_visits,
         customers_multi_visit = excluded.customers_multi_visit,
         visits_total          = excluded.visits_total,
         rewards_completed     = excluded.rewards_completed,
         rewards_redeemed      = excluded.rewards_redeemed,
         computed_at           = now();
end $$;

-- 8.17 Clientes a recordar (tarjeta o premio por vencer en N días)
create or replace function public.customers_to_remind(p_days_left int default 5)
returns table (customer_id uuid, profile_id uuid, email text, visits_count smallint,
               visits_goal smallint, rewards_ready bigint, dedupe_key text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.profile_id, p.email,
         coalesce(oc.visits_count, 0), coalesce(oc.visits_goal, 0),
         (select count(*) from public.loyalty_cards rc where rc.customer_id = c.id and rc.status = 'reward_ready'),
         'expiry_reminder:' || c.id || ':' || public.local_period()
    from public.customers c
    join public.profiles p on p.id = c.profile_id
    left join public.loyalty_cards oc
           on oc.customer_id = c.id and oc.status = 'open' and oc.period_month = public.local_period()
   where c.status = 'active'
     and public.period_end(public.local_period()) - now() <= make_interval(days => p_days_left)
     and (coalesce(oc.visits_count, 0) > 0
          or exists (select 1 from public.loyalty_cards rc where rc.customer_id = c.id and rc.status = 'reward_ready'))
     and not exists (select 1 from public.notifications_sent n
                      where n.dedupe_key = 'expiry_reminder:' || c.id || ':' || public.local_period());
$$;

-- ---------------------------------------------------------------------
-- 9. Seguridad (RLS) y permisos
-- ---------------------------------------------------------------------
alter table public.business_settings   enable row level security;
alter table public.loyverse_connection enable row level security;
alter table public.staff               enable row level security;
alter table public.tiers               enable row level security;
alter table public.groups              enable row level security;
alter table public.loyverse_discounts  enable row level security;
alter table public.rewards             enable row level security;
alter table public.profiles            enable row level security;
alter table public.customers           enable row level security;
alter table public.loyverse_receipts   enable row level security;
alter table public.receipt_discounts   enable row level security;
alter table public.loyalty_cards       enable row level security;
alter table public.visits              enable row level security;
alter table public.push_subscriptions  enable row level security;
alter table public.notifications_sent  enable row level security;
alter table public.audit_log           enable row level security;
alter table public.monthly_group_stats enable row level security;

-- Cliente: solo lo suyo
create policy profiles_own_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_staff()));
create policy profiles_own_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy customers_own_select on public.customers for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_staff()));

create policy cards_own_select on public.loyalty_cards for select to authenticated
  using (customer_id in (select c.id from public.customers c where c.profile_id = (select auth.uid()))
         or (select public.is_staff()));

create policy visits_own_select on public.visits for select to authenticated
  using (customer_id in (select c.id from public.customers c where c.profile_id = (select auth.uid()))
         or (select public.is_staff()));

create policy push_own_all on public.push_subscriptions for all to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

-- Personal (panel): lectura de catálogos y reportes
create policy settings_staff_select on public.business_settings for select to authenticated
  using ((select public.is_staff()));
create policy tiers_staff_select    on public.tiers for select to authenticated using ((select public.is_staff()));
create policy groups_staff_select   on public.groups for select to authenticated using ((select public.is_staff()));
create policy discounts_staff_select on public.loyverse_discounts for select to authenticated using ((select public.is_staff()));
create policy rewards_staff_select  on public.rewards for select to authenticated using ((select public.is_staff()));
create policy receipts_staff_select on public.loyverse_receipts for select to authenticated using ((select public.is_staff()));
create policy rdisc_staff_select    on public.receipt_discounts for select to authenticated using ((select public.is_staff()));
create policy notif_staff_select    on public.notifications_sent for select to authenticated using ((select public.is_staff()));
create policy stats_staff_select    on public.monthly_group_stats for select to authenticated using ((select public.is_staff()));
create policy staff_self_select     on public.staff for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_superadmin()));

-- Superadmin (CODIA): configura catálogos y negocio
create policy settings_super_write on public.business_settings for all to authenticated
  using ((select public.is_superadmin())) with check ((select public.is_superadmin()));
create policy tiers_super_write    on public.tiers for all to authenticated
  using ((select public.is_superadmin())) with check ((select public.is_superadmin()));
create policy groups_super_write   on public.groups for all to authenticated
  using ((select public.is_superadmin())) with check ((select public.is_superadmin()));
create policy rewards_super_write  on public.rewards for all to authenticated
  using ((select public.is_superadmin())) with check ((select public.is_superadmin()));
create policy staff_super_write    on public.staff for all to authenticated
  using ((select public.is_superadmin())) with check ((select public.is_superadmin()));
create policy audit_super_select   on public.audit_log for select to authenticated
  using ((select public.is_superadmin()));
-- loyverse_connection: sin políticas = solo el servidor (service_role) la lee y escribe

-- Permisos de funciones
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.get_group_by_token(text)  to anon, authenticated;
grant execute on function public.register_customer(text)   to authenticated;
grant execute on function public.my_card()                 to authenticated;
grant execute on function public.set_customer_tier(uuid, text) to authenticated;
grant execute on function public.is_staff()                to authenticated;
grant execute on function public.is_superadmin()           to authenticated;
grant execute on function public.upsert_loyverse_receipt(jsonb), public.process_receipt(uuid),
                          public.close_month(), public.customers_to_remind(int)
  to service_role;

-- ---------------------------------------------------------------------
-- 10. Datos iniciales (Sano Bistro)
-- ---------------------------------------------------------------------
insert into public.business_settings (name) values ('Sano Bistro Café');
insert into public.loyverse_connection default values;

insert into public.tiers (code, name, visits_goal, is_default, sort_order) values
  ('consentido', 'Cliente Consentido', 8, true, 1),
  ('premium',    'Premium',            4, false, 2);

insert into public.groups (name, prefix, primary_color, accent_color, welcome_message, is_default) values
  ('Cliente Consentido', 'C', '#2F7A22', '#FFFFFF', 'Bienvenido a Sano Rewards', true);

commit;

-- ---------------------------------------------------------------------
-- 11. Tareas automáticas (activar pg_cron en Database > Extensions y ejecutar aparte)
--     Hora de México = UTC-6 todo el año. 06:10 UTC = 00:10 hora local.
-- ---------------------------------------------------------------------
-- select cron.schedule('cierre-de-mes-diario', '10 6 * * *', $$select public.close_month()$$);
