-- 015d · PENDIENTE DE APLICAR (requiere aprobación de Kevin): datos a la tarjeta básica.
-- Sin Premium por ahora: todos a la categoría normal. Recorridos abiertos con meta 7 (conservan sus sellos).
update public.customers set tier_id = (select id from public.tiers where is_default), tier_expires_at = null
 where tier_id is distinct from (select id from public.tiers where is_default) or tier_expires_at is not null;
update public.tiers set visits_goal = 7;
update public.loyalty_cards set visits_goal = 7 where status = 'open';
