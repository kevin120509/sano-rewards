-- 011 · La tarjeta trae la fecha y hora de cada visita de la tarjeta actual (card_visits, en orden)
-- y el historial trae hasta 31 visitas (antes 5). Mismo tipo de retorno: create or replace.
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
                 order by visited_at desc limit 31) v), '[]'::jsonb),
    'card_visits',   coalesce((
        select jsonb_agg(v.visited_at order by v.visited_at)
          from public.visits v
         where v.card_id = oc.id and v.voided_at is null), '[]'::jsonb),
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
