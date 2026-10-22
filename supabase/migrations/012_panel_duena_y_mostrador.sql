-- 012 · Panel de la dueña (Administración) y del personal (Mostrador). Spec: specs/003-panel-dueña-y-mostrador.
-- (012a aparte: alter type public.staff_role add value 'cashier')
-- Nota: el MCP de Supabase cancela migraciones con DELETE/DROP; por eso no se usan aquí.
-- Roles: superadmin (CODIA) · owner (dueña) · manager · cashier (tableta del mesero). Clientes = sin fila en staff.
-- Todo pasa por funciones security definer que revisan el rol: un cliente no ve nada aunque abra la pantalla.

alter table public.groups add column if not exists benefit text;                       -- lo que el mesero aplica en caja
alter table public.visits alter column receipt_id drop not null;                         -- visitas manuales no tienen ticket
alter table public.visits add column if not exists source text not null default 'loyverse' check (source in ('loyverse', 'manual'));
alter table public.visits add column if not exists added_by uuid references auth.users(id);

-- Alta de personal por correo ANTES de que entren (solo CODIA). Al iniciar sesión, my_role() la convierte en staff.
create table if not exists public.staff_invites (
  email      text primary key check (email = lower(email)),
  role       public.staff_role not null,
  created_at timestamptz not null default now()
);
alter table public.staff_invites enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'staff_invites' and policyname = 'invites_super_all') then
    create policy invites_super_all on public.staff_invites for all
      using ((select private.is_superadmin())) with check ((select private.is_superadmin()));
  end if;
end $$;

create or replace function private.staff_role() returns text
language sql stable security definer set search_path = '' as $$
  select s.role::text from public.staff s where s.user_id = auth.uid();
$$;

create or replace function private.require_role(p_roles text[]) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (coalesce(private.staff_role(), '') = any (p_roles)) then
    raise exception 'Sin permiso' using errcode = '42501';
  end if;
end $$;

create or replace function private.today_local() returns date
language sql stable set search_path = '' as $$ select (now() at time zone public.business_tz())::date $$;

-- Rol de la sesión (y canje de invitación si el correo verificado está invitado). null = cliente.
create or replace function public.my_role() returns text
language plpgsql security definer set search_path = '' as $$
declare v_email text; v_role public.staff_role;
begin
  if auth.uid() is null then return null; end if;
  select lower(u.email) into v_email from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null;
  -- La invitación se queda guardada (no se borra); si ya es staff no se toca su rol.
  if v_email is not null and not exists (select 1 from public.staff s where s.user_id = auth.uid()) then
    select i.role into v_role from public.staff_invites i where i.email = v_email;
    if found then
      insert into public.staff (user_id, role) values (auth.uid(), v_role) on conflict (user_id) do nothing;
    end if;
  end if;
  return private.staff_role();
end $$;

-- El personal no tiene tarjeta de cliente.
create or replace function private.block_staff_customer() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.staff s where s.user_id = new.profile_id) then
    raise exception 'Las cuentas del personal no tienen tarjeta de cliente' using errcode = '42501';
  end if;
  return new;
end $$;
create or replace trigger customers_block_staff before insert on public.customers for each row execute function private.block_staff_customer();

-- Resumen de un cliente para Mostrador y Administración.
create or replace function private.customer_summary(p_customer uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', c.id, 'code', g.prefix || '-' || c.code_number, 'full_name', p.full_name, 'phone', p.phone, 'email', p.email,
    'status', c.status, 'created_at', c.created_at,
    'group', jsonb_build_object('id', g.id, 'name', g.name, 'prefix', g.prefix, 'theme', g.theme, 'benefit', g.benefit),
    'tier', jsonb_build_object('code', t.code, 'name', t.name, 'expires_at', case when t.is_default then null else c.tier_expires_at end),
    'visits_count', coalesce(oc.visits_count, 0),
    'visits_goal', coalesce(oc.visits_goal, t.visits_goal),
    'visited_today', exists (select 1 from public.visits v where v.customer_id = c.id and v.voided_at is null and v.visit_date = private.today_local()),
    'last_visit_at', (select max(v.visited_at) from public.visits v where v.customer_id = c.id and v.voided_at is null),
    'rewards_ready', (select count(*) from public.loyalty_cards rc where rc.customer_id = c.id and rc.status = 'reward_ready'),
    'reward_name', (select coalesce(rw.description, d.name) from public.loyalty_cards rc
                      left join public.rewards rw on rw.id = rc.reward_id
                      left join public.loyverse_discounts d on d.loyverse_id = rw.loyverse_discount_id
                     where rc.customer_id = c.id and rc.status = 'reward_ready' order by rc.completed_at limit 1))
  from public.customers c
  join public.profiles p on p.id = c.profile_id
  join public.groups g on g.id = c.group_id
  join public.tiers t on t.id = public.effective_tier_id(c.id)
  left join public.loyalty_cards oc on oc.customer_id = c.id and oc.status = 'open' and oc.period_month = public.local_period()
  where c.id = p_customer;
$$;

-- ===== Mostrador (mesero, dueña, CODIA) =====
create or replace function public.staff_search_customers(p_q text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare q text := trim(coalesce(p_q, '')); d text := regexp_replace(coalesce(p_q, ''), '\D', '', 'g'); v jsonb;
begin
  perform private.require_role(array['superadmin', 'owner', 'manager', 'cashier']);
  if length(q) < 2 then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(private.customer_summary(x.id) order by x.full_name), '[]'::jsonb) into v from (
    select c.id, p.full_name from public.customers c join public.profiles p on p.id = c.profile_id
     where p.full_name ilike '%' || q || '%'
        or p.email ilike q || '%'
        or (length(d) = 4 and c.code_number::text = d)
        or (length(d) >= 4 and regexp_replace(coalesce(p.phone, ''), '\D', '', 'g') like '%' || d || '%')
     order by p.full_name limit 25) x;
  return v;
end $$;

create or replace function public.staff_customer_detail(p_customer uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_role(array['superadmin', 'owner', 'manager', 'cashier']);
  return private.customer_summary(p_customer) || jsonb_build_object(
    'visits', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'visited_at', v.visited_at, 'source', v.source,
                                 'added_by', (select coalesce(pp.full_name, pp.email) from public.profiles pp where pp.id = v.added_by)) order by v.visited_at desc)
                          from (select * from public.visits where customer_id = p_customer and voided_at is null order by visited_at desc limit 31) v), '[]'::jsonb));
end $$;

create or replace function public.staff_add_visit(p_customer uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_card public.loyalty_cards; v_id uuid; v_today date := private.today_local();
begin
  perform private.require_role(array['superadmin', 'owner', 'manager', 'cashier']);
  if not exists (select 1 from public.customers where id = p_customer and status = 'active') then
    raise exception 'Cliente no encontrado o bloqueado' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.visits where customer_id = p_customer and visit_date = v_today and voided_at is null) then
    return jsonb_build_object('result', 'already_visited_today', 'customer', private.customer_summary(p_customer));
  end if;
  v_card := public.ensure_open_card(p_customer, public.local_period());
  insert into public.visits (customer_id, card_id, receipt_id, visit_date, visited_at, source, added_by)
  values (p_customer, v_card.id, null, v_today, now(), 'manual', auth.uid()) returning id into v_id;
  insert into public.audit_log (actor_id, action, entity, entity_id, after)
  values (auth.uid(), 'manual_visit', 'visits', v_id, jsonb_build_object('customer_id', p_customer));
  return jsonb_build_object('result', 'visit', 'customer', private.customer_summary(p_customer));
exception when unique_violation then
  return jsonb_build_object('result', 'already_visited_today', 'customer', private.customer_summary(p_customer));
end $$;

create or replace function public.staff_redeem_reward(p_customer uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_card public.loyalty_cards; v_name text;
begin
  perform private.require_role(array['superadmin', 'owner', 'manager', 'cashier']);
  select * into v_card from public.loyalty_cards where customer_id = p_customer and status = 'reward_ready'
   order by completed_at limit 1 for update;
  if not found then return jsonb_build_object('result', 'no_reward', 'customer', private.customer_summary(p_customer)); end if;
  select coalesce(rw.description, d.name) into v_name from public.rewards rw
    left join public.loyverse_discounts d on d.loyverse_id = rw.loyverse_discount_id where rw.id = v_card.reward_id;
  update public.loyalty_cards set status = 'redeemed', redeemed_at = now() where id = v_card.id;
  insert into public.audit_log (actor_id, action, entity, entity_id, after)
  values (auth.uid(), 'manual_redeem', 'loyalty_cards', v_card.id, jsonb_build_object('customer_id', p_customer));
  return jsonb_build_object('result', 'redeemed', 'reward_name', v_name, 'customer', private.customer_summary(p_customer));
end $$;

-- ===== Administración (dueña, manager, CODIA) =====
create or replace function public.admin_void_visit(p_visit uuid, p_reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.visits; v_status public.card_status;
begin
  perform private.require_role(array['superadmin', 'owner', 'manager']);
  select * into v from public.visits where id = p_visit and voided_at is null for update;
  if not found then raise exception 'Visita no encontrada' using errcode = 'P0002'; end if;
  select status into v_status from public.loyalty_cards where id = v.card_id;
  if v_status = 'redeemed' then raise exception 'Esa visita es de una tarjeta cuyo premio ya se canjeó' using errcode = '22023'; end if;
  update public.visits set voided_at = now(), void_reason = coalesce(nullif(trim(p_reason), ''), 'Corregido desde el panel') where id = p_visit;
  insert into public.audit_log (actor_id, action, entity, entity_id, before)
  values (auth.uid(), 'void_visit', 'visits', p_visit, to_jsonb(v));
  return jsonb_build_object('result', 'voided', 'customer', private.customer_summary(v.customer_id));
end $$;

create or replace function public.admin_dashboard() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_start timestamptz := (public.local_period()::timestamp at time zone public.business_tz());
begin
  perform private.require_role(array['superadmin', 'owner', 'manager']);
  return jsonb_build_object(
    'customers_total', (select count(*) from public.customers),
    'new_this_month', (select count(*) from public.customers where created_at >= v_start),
    'visits_today', (select count(*) from public.visits where voided_at is null and visit_date = private.today_local()),
    'visits_month', (select count(*) from public.visits where voided_at is null and visit_date >= public.local_period()),
    'rewards_earned_month', (select count(*) from public.loyalty_cards where completed_at >= v_start),
    'rewards_redeemed_month', (select count(*) from public.loyalty_cards where redeemed_at >= v_start),
    'rewards_pending', (select count(*) from public.loyalty_cards where status = 'reward_ready'),
    'premium_active', (select count(*) from public.customers c join public.tiers t on t.id = public.effective_tier_id(c.id) where not t.is_default),
    'groups', (select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name, 'prefix', g.prefix, 'theme', g.theme, 'active', g.active,
                 'customers', (select count(*) from public.customers c where c.group_id = g.id),
                 'visits_month', (select count(*) from public.visits v join public.customers c on c.id = v.customer_id
                                   where c.group_id = g.id and v.voided_at is null and v.visit_date >= public.local_period()))
                 order by g.is_default desc, g.name), '[]'::jsonb) from public.groups g));
end $$;

create or replace function public.admin_list_customers(p_q text, p_group uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare q text := trim(coalesce(p_q, '')); d text := regexp_replace(coalesce(p_q, ''), '\D', '', 'g'); v jsonb;
begin
  perform private.require_role(array['superadmin', 'owner', 'manager']);
  select coalesce(jsonb_agg(private.customer_summary(x.id) order by x.created_at desc), '[]'::jsonb) into v from (
    select c.id, c.created_at from public.customers c join public.profiles p on p.id = c.profile_id
     where (p_group is null or c.group_id = p_group)
       and (q = '' or p.full_name ilike '%' || q || '%' or p.email ilike '%' || q || '%'
            or (length(d) = 4 and c.code_number::text = d)
            or (length(d) >= 4 and regexp_replace(coalesce(p.phone, ''), '\D', '', 'g') like '%' || d || '%'))
     order by c.created_at desc limit 100) x;
  return v;
end $$;

create or replace function public.admin_change_group(p_customer uuid, p_group uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_before jsonb;
begin
  perform private.require_role(array['superadmin', 'owner', 'manager']);
  if not exists (select 1 from public.groups where id = p_group and active) then raise exception 'Grupo no disponible' using errcode = 'P0002'; end if;
  select to_jsonb(c) into v_before from public.customers c where c.id = p_customer;
  if v_before is null then raise exception 'Cliente no encontrado' using errcode = 'P0002'; end if;
  update public.customers set group_id = p_group where id = p_customer;
  insert into public.audit_log (actor_id, action, entity, entity_id, before, after)
  select auth.uid(), 'change_group', 'customers', p_customer, v_before, to_jsonb(c) from public.customers c where c.id = p_customer;
  return private.customer_summary(p_customer);
end $$;

-- Premium por 1, 3 o 6 meses (vence al final del último mes); 0 = quitar. Ajusta la meta de la tarjeta abierta.
create or replace function public.admin_set_premium(p_customer uuid, p_months int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_tier public.tiers; v_before jsonb; v_card public.loyalty_cards; v_expires timestamptz;
begin
  perform private.require_role(array['superadmin', 'owner', 'manager']);
  if p_months not in (0, 1, 3, 6) then raise exception 'Meses no válidos' using errcode = '22023'; end if;
  select * into v_tier from public.tiers where (p_months = 0 and is_default) or (p_months > 0 and code = 'premium');
  select to_jsonb(c) into v_before from public.customers c where c.id = p_customer;
  if v_before is null then raise exception 'Cliente no encontrado' using errcode = 'P0002'; end if;
  v_expires := case when p_months = 0 then null
                    else public.period_end((public.local_period() + make_interval(months => p_months - 1))::date) end;
  update public.customers set tier_id = v_tier.id, tier_expires_at = v_expires where id = p_customer;

  select * into v_card from public.loyalty_cards
   where customer_id = p_customer and status = 'open' and period_month = public.local_period() for update;
  if found then
    if v_card.visits_count >= v_tier.visits_goal then
      update public.loyalty_cards set visits_goal = visits_count, status = 'reward_ready', completed_at = now(),
             reward_id = public.resolve_reward(p_customer) where id = v_card.id;
      insert into public.loyalty_cards (customer_id, period_month, sequence, visits_goal)
      values (p_customer, v_card.period_month, v_card.sequence + 1, v_tier.visits_goal);
    else
      update public.loyalty_cards set visits_goal = v_tier.visits_goal where id = v_card.id;
    end if;
  end if;
  insert into public.audit_log (actor_id, action, entity, entity_id, before, after)
  select auth.uid(), 'set_premium', 'customers', p_customer, v_before, to_jsonb(c) from public.customers c where c.id = p_customer;
  return private.customer_summary(p_customer);
end $$;

create or replace function public.admin_list_groups() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_role(array['superadmin', 'owner', 'manager']);
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'id', g.id, 'name', g.name, 'prefix', g.prefix, 'theme', g.theme, 'benefit', g.benefit, 'welcome_message', g.welcome_message,
      'active', g.active, 'is_default', g.is_default, 'registration_token', g.registration_token,
      'customers', (select count(*) from public.customers c where c.group_id = g.id),
      'reward', (select jsonb_build_object('discount_id', rw.loyverse_discount_id, 'description', rw.description, 'discount_name', d.name)
                   from public.rewards rw left join public.loyverse_discounts d on d.loyverse_id = rw.loyverse_discount_id
                   join public.tiers t on t.id = rw.tier_id and t.is_default
                  where rw.active and (rw.group_id = g.id or rw.group_id is null)
                  order by (rw.group_id is null), rw.created_at limit 1))
      order by g.is_default desc, g.created_at), '[]'::jsonb) from public.groups g);
end $$;

create or replace function public.admin_list_discounts() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_role(array['superadmin', 'owner', 'manager']);
  return (select coalesce(jsonb_agg(jsonb_build_object('id', loyverse_id, 'name', name, 'type', discount_type, 'value', value) order by name), '[]'::jsonb)
            from public.loyverse_discounts where deleted_at is null);
end $$;

-- Crear (p_id null) o editar un grupo. La letra no se cambia si el grupo ya tiene clientes.
create or replace function public.admin_save_group(p_id uuid, p_name text, p_prefix text, p_theme text, p_benefit text,
                                                   p_welcome text, p_discount_id text, p_reward_text text, p_active boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := p_id; v_prefix text := upper(trim(coalesce(p_prefix, ''))); v_old public.groups; v_default_tier uuid;
        v_color text := case p_theme when 'sport' then '#111411' when 'notebook' then '#D9620F' when 'waves' then '#174F8C' else '#2F7A22' end;
begin
  perform private.require_role(array['superadmin', 'owner', 'manager']);
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Escribe el nombre del grupo' using errcode = '22023'; end if;
  if v_prefix !~ '^[A-Z]$' then raise exception 'La letra debe ser una sola letra (A-Z)' using errcode = '22023'; end if;
  if coalesce(p_theme, '') not in ('classic', 'sport', 'notebook', 'waves') then raise exception 'Diseño no válido' using errcode = '22023'; end if;
  if exists (select 1 from public.groups where prefix = v_prefix and id is distinct from p_id) then raise exception 'Esa letra ya la usa otro grupo' using errcode = '23505'; end if;
  if exists (select 1 from public.groups where lower(name) = lower(trim(p_name)) and id is distinct from p_id) then raise exception 'Ya existe un grupo con ese nombre' using errcode = '23505'; end if;

  if v_id is null then
    insert into public.groups (name, prefix, theme, benefit, welcome_message, primary_color, active)
    values (trim(p_name), v_prefix, p_theme, nullif(trim(p_benefit), ''), nullif(trim(p_welcome), ''), v_color, coalesce(p_active, true))
    returning id into v_id;
  else
    select * into v_old from public.groups where id = v_id for update;
    if not found then raise exception 'Grupo no encontrado' using errcode = 'P0002'; end if;
    if v_old.prefix <> v_prefix and exists (select 1 from public.customers where group_id = v_id) then
      raise exception 'No se puede cambiar la letra: el grupo ya tiene clientes con ese código' using errcode = '22023';
    end if;
    if v_old.is_default and not coalesce(p_active, true) then raise exception 'El grupo general no se puede pausar' using errcode = '22023'; end if;
    update public.groups set name = trim(p_name), prefix = v_prefix, theme = p_theme, benefit = nullif(trim(p_benefit), ''),
           welcome_message = nullif(trim(p_welcome), ''), primary_color = v_color, active = coalesce(p_active, true) where id = v_id;
  end if;

  if nullif(p_discount_id, '') is not null then
    if not exists (select 1 from public.loyverse_discounts where loyverse_id = p_discount_id and deleted_at is null) then
      raise exception 'Ese descuento ya no existe en Loyverse' using errcode = 'P0002';
    end if;
    select id into v_default_tier from public.tiers where is_default;
    update public.rewards set active = false where group_id = v_id and tier_id = v_default_tier and loyverse_discount_id <> p_discount_id;
    if exists (select 1 from public.rewards where group_id = v_id and tier_id = v_default_tier and loyverse_discount_id = p_discount_id) then
      update public.rewards set active = true, description = nullif(trim(p_reward_text), '')
       where group_id = v_id and tier_id = v_default_tier and loyverse_discount_id = p_discount_id;
    else
      insert into public.rewards (tier_id, group_id, loyverse_discount_id, description, active)
      values (v_default_tier, v_id, p_discount_id, nullif(trim(p_reward_text), ''), true);
    end if;
  end if;

  insert into public.audit_log (actor_id, action, entity, entity_id, before, after)
  select auth.uid(), case when p_id is null then 'create_group' else 'update_group' end, 'groups', v_id,
         case when p_id is null then null else to_jsonb(v_old) end, to_jsonb(g)
    from public.groups g where g.id = v_id;
  return (select x from jsonb_array_elements(public.admin_list_groups()) x where x ->> 'id' = v_id::text);
end $$;

create or replace function public.admin_new_group_token(p_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare v text := replace(gen_random_uuid()::text, '-', '');
begin
  perform private.require_role(array['superadmin', 'owner', 'manager']);
  update public.groups set registration_token = v where id = p_id;
  if not found then raise exception 'Grupo no encontrado' using errcode = 'P0002'; end if;
  insert into public.audit_log (actor_id, action, entity, entity_id) values (auth.uid(), 'new_group_qr', 'groups', p_id);
  return v;
end $$;

-- Permisos: solo usuarios con sesión pueden llamar (y adentro se revisa el rol).
do $$
declare f text;
begin
  foreach f in array array['my_role()', 'staff_search_customers(text)', 'staff_customer_detail(uuid)', 'staff_add_visit(uuid)',
    'staff_redeem_reward(uuid)', 'admin_void_visit(uuid,text)', 'admin_dashboard()', 'admin_list_customers(text,uuid)',
    'admin_change_group(uuid,uuid)', 'admin_set_premium(uuid,integer)', 'admin_list_groups()', 'admin_list_discounts()',
    'admin_save_group(uuid,text,text,text,text,text,text,text,boolean)', 'admin_new_group_token(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
revoke all on function private.customer_summary(uuid) from public, anon, authenticated;
