-- 015a · Tarjeta básica (spec 004): configuración del programa, cupones, catálogo de Loyverse y promociones.

create table if not exists public.program_settings (
  id smallint primary key default 1 check (id = 1),
  goal smallint not null default 7,
  stamp_min numeric(10,2) not null default 65,
  bakery_min numeric(10,2) not null default 200,
  coldfoam_min numeric(10,2) not null default 250,
  drink_days smallint not null default 30,
  bakery_days smallint not null default 15,
  coldfoam_days smallint not null default 30,
  drink_discount_id text,
  bakery_discount_id text,
  coldfoam_discount_id text,
  promo_category_ids text[] not null default '{}',
  dining_options_counted text[],          -- null = todos cuentan
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.program_settings (id) values (1) on conflict (id) do nothing;
alter table public.program_settings enable row level security;

do $$ begin
  create type public.coupon_kind as enum ('drink', 'bakery', 'coldfoam');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.coupon_status as enum ('available', 'redeemed', 'expired', 'voided');
exception when duplicate_object then null; end $$;

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  card_id uuid not null references public.loyalty_cards(id) on delete cascade,
  kind public.coupon_kind not null,
  status public.coupon_status not null default 'available',
  issued_at timestamptz not null default now(),
  valid_from date not null,
  expires_at timestamptz not null,
  source_receipt_id uuid references public.loyverse_receipts(id),
  source_visit_id uuid references public.visits(id),
  issued_by uuid,
  redeemed_at timestamptz,
  redeemed_date date,
  redeemed_receipt_id uuid references public.loyverse_receipts(id),
  redeemed_by uuid,
  needs_review boolean not null default false,
  review_note text,
  note text,
  unique (card_id, kind)
);
create unique index if not exists coupons_one_redeem_per_day on public.coupons (customer_id, redeemed_date) where status = 'redeemed';
create index if not exists coupons_customer_idx on public.coupons (customer_id, status);
create index if not exists coupons_source_idx on public.coupons (source_receipt_id);
create index if not exists coupons_redeemed_receipt_idx on public.coupons (redeemed_receipt_id);
create index if not exists coupons_review_idx on public.coupons (needs_review) where needs_review;
alter table public.coupons enable row level security;
do $$ begin
  create policy coupons_own_select on public.coupons for select to authenticated
    using (customer_id in (select c.id from public.customers c where c.profile_id = auth.uid()));
exception when duplicate_object then null; end $$;

alter table public.loyverse_receipts add column if not exists paid_amount numeric(10,2);
alter table public.loyverse_receipts add column if not exists regular_amount numeric(10,2);
alter table public.loyverse_receipts add column if not exists dining_option text;
alter table public.loyverse_receipts add column if not exists reversed_at timestamptz;
alter table public.loyverse_receipts add column if not exists reversed_by uuid;
alter table public.loyverse_receipts add column if not exists reverse_reason text;

create table if not exists public.loyverse_categories (
  loyverse_id text primary key, name text not null, deleted_at timestamptz, synced_at timestamptz not null default now());
create table if not exists public.loyverse_items (
  loyverse_id text primary key, name text not null, category_id text, deleted_at timestamptz, synced_at timestamptz not null default now());
alter table public.loyverse_categories enable row level security;
alter table public.loyverse_items enable row level security;

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text,
  sort smallint not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now());
alter table public.promotions enable row level security;
do $$ begin
  create policy promotions_read on public.promotions for select to authenticated using (active);
exception when duplicate_object then null; end $$;

-- Imágenes de promociones: lectura pública, escritura solo dueña/encargado/CODIA.
insert into storage.buckets (id, name, public) values ('promos', 'promos', true) on conflict (id) do nothing;
do $$ begin
  create policy promos_admin_insert on storage.objects for insert to authenticated
    with check (bucket_id = 'promos' and exists (select 1 from public.staff s where s.user_id = auth.uid() and s.role in ('superadmin', 'owner', 'manager')));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy promos_admin_update on storage.objects for update to authenticated
    using (bucket_id = 'promos' and exists (select 1 from public.staff s where s.user_id = auth.uid() and s.role in ('superadmin', 'owner', 'manager')));
exception when duplicate_object then null; end $$;
