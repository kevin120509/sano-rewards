-- =====================================================================
-- 002 · Ajustes según los avisos de Supabase (seguridad y rendimiento)
-- =====================================================================

-- 1. Índices para llaves foráneas
drop index if exists public.visits_card_idx;
create index visits_card_customer_idx on public.visits (card_id, customer_id);
create index audit_actor_idx on public.audit_log (actor_id);

-- 2. Funciones auxiliares de rol fuera de la API pública (esquema privado)
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;
alter function public.is_staff() set schema private;
alter function public.is_superadmin() set schema private;
revoke execute on function private.is_staff(), private.is_superadmin() from public, anon;
grant execute on function private.is_staff(), private.is_superadmin() to authenticated, service_role;

-- set_customer_tier llamaba a public.is_superadmin(): se actualiza la referencia
create or replace function public.set_customer_tier(p_customer uuid, p_tier_code text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_tier    public.tiers;
  v_before  jsonb;
  v_card    public.loyalty_cards;
  v_expires timestamptz;
begin
  if not private.is_superadmin() then
    raise exception 'Solo superadmin' using errcode = '42501';
  end if;
  select * into v_tier from public.tiers where code = p_tier_code;
  if not found then
    raise exception 'Nivel no existe' using errcode = 'P0002';
  end if;

  select to_jsonb(c) into v_before from public.customers c where c.id = p_customer;
  v_expires := case when v_tier.is_default then null else public.period_end(public.local_period()) end;

  update public.customers set tier_id = v_tier.id, tier_expires_at = v_expires where id = p_customer;

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

-- 3. Una sola política de lectura por tabla: el superadmin escribe con políticas por acción
drop policy settings_super_write on public.business_settings;
drop policy tiers_super_write    on public.tiers;
drop policy groups_super_write   on public.groups;
drop policy rewards_super_write  on public.rewards;
drop policy staff_super_write    on public.staff;

create policy settings_super_insert on public.business_settings for insert to authenticated with check ((select private.is_superadmin()));
create policy settings_super_update on public.business_settings for update to authenticated using ((select private.is_superadmin())) with check ((select private.is_superadmin()));
create policy settings_super_delete on public.business_settings for delete to authenticated using ((select private.is_superadmin()));

create policy tiers_super_insert on public.tiers for insert to authenticated with check ((select private.is_superadmin()));
create policy tiers_super_update on public.tiers for update to authenticated using ((select private.is_superadmin())) with check ((select private.is_superadmin()));
create policy tiers_super_delete on public.tiers for delete to authenticated using ((select private.is_superadmin()));

create policy groups_super_insert on public.groups for insert to authenticated with check ((select private.is_superadmin()));
create policy groups_super_update on public.groups for update to authenticated using ((select private.is_superadmin())) with check ((select private.is_superadmin()));
create policy groups_super_delete on public.groups for delete to authenticated using ((select private.is_superadmin()));

create policy rewards_super_insert on public.rewards for insert to authenticated with check ((select private.is_superadmin()));
create policy rewards_super_update on public.rewards for update to authenticated using ((select private.is_superadmin())) with check ((select private.is_superadmin()));
create policy rewards_super_delete on public.rewards for delete to authenticated using ((select private.is_superadmin()));

create policy staff_super_insert on public.staff for insert to authenticated with check ((select private.is_superadmin()));
create policy staff_super_update on public.staff for update to authenticated using ((select private.is_superadmin())) with check ((select private.is_superadmin()));
create policy staff_super_delete on public.staff for delete to authenticated using ((select private.is_superadmin()));
