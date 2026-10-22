-- 003 · Diseño por grupo + próximo premio para la app del cliente
-- Aditiva: no borra nada. my_card se reemplaza (mismo tipo de retorno jsonb) y se agrega get_group_public.

alter table public.groups
  add column if not exists theme text not null default 'classic'
  check (theme in ('classic', 'sport', 'notebook', 'waves'));

comment on column public.groups.theme is 'Diseño visual de la tarjeta del cliente: classic | sport | notebook | waves';

-- Misma firma que get_group_by_token + theme (función nueva: cambiar el RETURNS de la vieja exigiría DROP).
create or replace function public.get_group_public(p_token text)
returns table (business_name text, group_name text, prefix text, primary_color text,
               accent_color text, welcome_message text, theme text)
language sql stable security definer set search_path = ''
as $$
  select s.name, g.name, g.prefix::text, g.primary_color::text, g.accent_color::text, g.welcome_message, g.theme
    from public.groups g
    cross join public.business_settings s
   where g.registration_token = p_token and g.active and s.loyalty_enabled;
$$;
revoke all on function public.get_group_public(text) from public;
grant execute on function public.get_group_public(text) to anon, authenticated;

create or replace function public.my_card()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'code',          g.prefix || '-' || c.code_number,
    'full_name',     p.full_name,
    'group',         jsonb_build_object('name', g.name, 'prefix', g.prefix,
                                        'primary_color', g.primary_color, 'accent_color', g.accent_color,
                                        'welcome_message', g.welcome_message, 'theme', g.theme),
    'tier',          jsonb_build_object('code', t.code, 'name', t.name, 'expires_at', c.tier_expires_at),
    'visits_count',  coalesce(oc.visits_count, 0),
    'visits_goal',   coalesce(oc.visits_goal, t.visits_goal),
    'period_ends_at', public.period_end(public.local_period()),
    'rewards_ready', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'card_id', rc.id, 'completed_at', rc.completed_at,
                 'discount_name', coalesce(rw.description, d.name), 'description', rw.description)
               order by rc.completed_at)
          from public.loyalty_cards rc
          left join public.rewards rw on rw.id = rc.reward_id
          left join public.loyverse_discounts d on d.loyverse_id = rw.loyverse_discount_id
         where rc.customer_id = c.id and rc.status = 'reward_ready'), '[]'::jsonb),
    'recent_visits', coalesce((
        select jsonb_agg(v.visited_at order by v.visited_at desc)
          from (select visited_at from public.visits
                 where customer_id = c.id and voided_at is null
                 order by visited_at desc limit 5) v), '[]'::jsonb),
    'next_reward',   (
        select jsonb_build_object('name', coalesce(rw.description, d.name), 'description', rw.description)
          from public.rewards rw
          left join public.loyverse_discounts d on d.loyverse_id = rw.loyverse_discount_id
         where rw.active and rw.tier_id = t.id and (rw.group_id = c.group_id or rw.group_id is null)
         order by (rw.group_id is null), rw.created_at
         limit 1)
  )
  from public.customers c
  join public.profiles p on p.id = c.profile_id
  join public.groups   g on g.id = c.group_id
  join public.tiers    t on t.id = public.effective_tier_id(c.id)
  left join public.loyalty_cards oc
         on oc.customer_id = c.id and oc.status = 'open' and oc.period_month = public.local_period()
  where c.profile_id = auth.uid();
$$;
