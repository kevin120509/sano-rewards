\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
-- Datos de prueba
insert into auth.users (id,email,raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a','codia@codia.mx','{"full_name":"Admin CODIA"}'),
 ('00000000-0000-0000-0000-0000000000a1','ana@correo.com','{"full_name":"Ana López"}'),
 ('00000000-0000-0000-0000-0000000000b1','luis@correo.com','{"name":"Luis Pérez"}');
insert into public.staff values ('00000000-0000-0000-0000-00000000000a','superadmin',now());
insert into public.loyverse_discounts (loyverse_id,name,discount_type,value) values
 ('d-cons','CONSENTIDO - Bebida','FIXED_PERCENT',100),('d-gym','GYM - 30%','FIXED_PERCENT',30),('d-prem','PREMIUM - Postre','FIXED_PERCENT',100);
insert into public.groups (name,prefix,primary_color,registration_token) values
 ('GYM FitZone','G','#111411','tok-gym'),('Estudiantes','E','#D9620F','tok-est'),('OSO','O','#174F8C','tok-oso');
insert into public.rewards (tier_id,group_id,loyverse_discount_id) select id,null,'d-cons' from tiers where code='consentido';
insert into public.rewards (tier_id,group_id,loyverse_discount_id) select t.id,g.id,'d-gym' from tiers t, groups g where t.code='consentido' and g.prefix='G';
insert into public.rewards (tier_id,group_id,loyverse_discount_id) select id,null,'d-prem' from tiers where code='premium';

select 'T01 perfiles automáticos: ' || count(*) from profiles;

-- Público (anon): consulta grupo por token, pero no la tabla
set role anon;
select 'T02 grupo por QR: ' || group_name || ' ' || prefix from get_group_by_token('tok-gym');
select 'T03 anon ve tabla groups: ' || count(*) from groups;
reset role;

-- Registro de clientes
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
select 'T04 registro Ana (sin grupo) ok: ' || (register_customer(null) is not null);
select 'T05 registrar dos veces devuelve la misma: ' || (register_customer(null) = register_customer('tok-gym'));
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);
select 'T06 registro Luis (GYM) ok: ' || (register_customer('tok-gym') is not null);
select 'T07 Luis ve clientes (RLS, solo él): ' || count(*) from customers;
select 'T08 Luis ve grupos (no es staff): ' || count(*) from groups;
select 'T09 my_card Luis: ' || (my_card() ->> 'code') || ' grupo ' || (my_card()->'group'->>'name') || ' ' || (my_card()->>'visits_count') || '/' || (my_card()->>'visits_goal');
reset role;
do $$ begin
  set role authenticated;
  perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);
  begin
    perform register_customer('token-falso');
  exception when others then raise notice 'skip'; end;
  reset role;
end $$;
select set_config('request.jwt.claim.sub','',false);

-- helper: venta simulada
create or replace function pg_temp.sale(num text, at text, note text, disc text default null) returns text language sql as $$
  select process_receipt(upsert_loyverse_receipt(jsonb_build_object(
    'receipt_number',num,'receipt_type','SALE','receipt_date',at,'total_money',100,
    'note',null,
    'line_items', jsonb_build_array(jsonb_build_object('item_name','Café','line_note',note,'line_discounts','[]'::jsonb)),
    'total_discounts', case when disc is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object('id',disc,'money_amount',50)) end
  )));
$$;
select code_number as lc from customers c join profiles p on p.id=c.profile_id where p.email='luis@correo.com' \gset
select code_number as ac from customers c join profiles p on p.id=c.profile_id where p.email='ana@correo.com' \gset

-- 8 visitas de Luis en días distintos
select 'T10 visitas Luis: ' || string_agg(pg_temp.sale('1-'||d, '2026-10-'||lpad(d::text,2,'0')||'T15:00:00Z', 'g-'||:lc), ',' order by d) from generate_series(1,8) d;
select 'T11 tarjeta completa: ' || string_agg(lc.status::text||' '||visits_count||'/'||visits_goal||' seq'||sequence, ' | ' order by sequence) from loyalty_cards lc join customers c on c.id=lc.customer_id where c.code_number=:lc;
select 'T12 recompensa asignada: ' || d.name from loyalty_cards lc join rewards r on r.id=lc.reward_id join loyverse_discounts d on d.loyverse_id=r.loyverse_discount_id join customers c on c.id=lc.customer_id where c.code_number=:lc and lc.status='reward_ready';
select 'T13 mismo día otra vez: ' || pg_temp.sale('1-801', '2026-10-08T20:00:00Z', 'G-'||:lc);
select 'T14 aviso duplicado: ' || process_receipt(upsert_loyverse_receipt(raw)) from loyverse_receipts where receipt_number='1-1';
select 'T15 prefijo equivocado: ' || pg_temp.sale('1-900', '2026-10-09T15:00:00Z', 'E-'||:lc);
select 'T16 sin código: ' || pg_temp.sale('1-901', '2026-10-09T15:00:00Z', null);
select 'T17 canje con descuento GYM: ' || pg_temp.sale('1-10', '2026-10-10T15:00:00Z', 'G '||:lc, 'd-gym');
select 'T18 tarjetas después del canje: ' || string_agg(lc.status::text||' '||visits_count||'/'||visits_goal, ' | ' order by sequence) from loyalty_cards lc join customers c on c.id=lc.customer_id where c.code_number=:lc;
-- Devolución de la venta del canje
select 'T19 devolución: ' || process_receipt(upsert_loyverse_receipt(jsonb_build_object('receipt_number','1-11','receipt_type','REFUND','refund_for','1-10','receipt_date','2026-10-10T16:00:00Z','total_money',-100)));
select 'T20 visita anulada y contador: ' || (select count(*) from visits v join loyverse_receipts r on r.id=v.receipt_id where r.receipt_number='1-10' and v.voided_at is not null) || ' / abierta ' || (select visits_count from loyalty_cards lc join customers c on c.id=lc.customer_id where c.code_number=:lc and lc.status='open');

-- Ana: 8 visitas y luego se cancela la 8.ª (premio aún no canjeado) -> regresa a abierta
select 'T21 visitas Ana: ' || string_agg(pg_temp.sale('2-'||d, '2026-10-'||lpad(d::text,2,'0')||'T15:00:00Z', 'C-'||:ac), ',' order by d) from generate_series(1,8) d;
select 'T22 antes de cancelar: ' || string_agg(lc.status::text||' '||visits_count, ' | ' order by sequence) from loyalty_cards lc join customers c on c.id=lc.customer_id where c.code_number=:ac;
select upsert_loyverse_receipt(raw || jsonb_build_object('cancelled_at','2026-10-08T18:00:00Z')) as cid from loyverse_receipts where receipt_number='2-8' \gset
select 'T23 cancelación: ' || process_receipt(:'cid');
select 'T24 después de cancelar: ' || string_agg(lc.status::text||' '||visits_count||'/'||visits_goal, ' | ' order by sequence) from loyalty_cards lc join customers c on c.id=lc.customer_id where c.code_number=:ac;

-- Premium por superadmin (Ana tiene 7 visitas -> con meta 4 se completa)
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
set role authenticated;
select 'T25 superadmin ve todos los clientes: ' || count(*) from customers;
select set_customer_tier((select id from customers where code_number=:ac),'premium');
reset role;
select 'T26 Ana premium: ' || t.code || ' vence ' || to_char(c.tier_expires_at at time zone 'America/Mexico_City','YYYY-MM-DD HH24:MI') from customers c join tiers t on t.id=c.tier_id where c.code_number=:ac;
select 'T27 tarjetas Ana: ' || string_agg(lc.status::text||' '||visits_count||'/'||visits_goal, ' | ' order by sequence) from loyalty_cards lc join customers c on c.id=lc.customer_id where c.code_number=:ac;
select 'T28 auditoría: ' || count(*) from audit_log;
do $$ begin
  set role authenticated;
  perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);
  perform set_customer_tier((select id from customers limit 1),'premium');
  raise exception 'NO DEBIÓ PASAR';
exception when insufficient_privilege then raise notice 'T29 cliente no puede hacerse premium: OK';
end $$;
reset role;

-- Venta de un mes ya cerrado
select 'T30 venta de septiembre: ' || pg_temp.sale('3-1', '2026-09-20T15:00:00Z', 'G-'||:lc);

-- Cierre de mes: simulamos tarjetas de septiembre y un premium vencido
insert into loyalty_cards (customer_id, period_month, sequence, visits_goal, visits_count, status)
  select id, '2026-09-01', 1, 8, 0, 'reward_ready' from customers where code_number=:lc;
update customers set tier_expires_at = now() - interval '1 minute' where code_number=:ac;
select close_month();
select 'T31 tarjeta de septiembre vencida: ' || lc.status from loyalty_cards lc join customers c on c.id=lc.customer_id where c.code_number=:lc and period_month='2026-09-01';
select 'T32 premium vencido regresa a: ' || t.code from customers c join tiers t on t.id=c.tier_id where c.code_number=:ac;
select 'T33 estadísticas de sep: ' || count(*) || ' grupos' from monthly_group_stats where period_month='2026-09-01';
select 'T34 cierre idempotente: ' || (select count(*) from (select close_month()) x);
select 'T35 recordatorios (30 días): ' || count(*) from customers_to_remind(30);
select set_config('request.jwt.claim.sub', (select profile_id::text from customers where code_number=:ac), false) \gset
set role authenticated;
select 'T36 my_card Ana: ' || (my_card()->>'code') || ' nivel ' || (my_card()->'tier'->>'name') || ' premios listos ' || jsonb_array_length(my_card()->'rewards_ready') || ' (' || (my_card()->'rewards_ready'->0->>'discount_name') || ')';
do $$ begin
  insert into public.visits (customer_id, card_id, receipt_id, visit_date, visited_at)
  select customer_id, id, (select id from loyverse_receipts limit 1), current_date, now() from loyalty_cards limit 1;
  raise exception 'NO DEBIÓ PASAR';
exception when insufficient_privilege then raise notice 'T39 cliente no puede crear visitas: OK';
end $$;
do $$ begin
  update public.customers set tier_id = (select id from tiers where code='premium');
  if (select count(*) from customers c join tiers t on t.id=c.tier_id where t.code='premium') > 0 then raise exception 'NO DEBIÓ PASAR'; end if;
  raise notice 'T40 cliente no puede cambiar su nivel: OK';
exception when insufficient_privilege then raise notice 'T40 cliente no puede cambiar su nivel: OK';
end $$;
reset role;
select 'T37 errores en ventas: ' || count(*) from loyverse_receipts where status='error';
select 'T38 estados de ventas: ' || string_agg(status_reason||'='||n, ', ') from (select status_reason, count(*) n from loyverse_receipts group by 1 order by 1) x;

explain (costs off) select c.id from customers c join groups g on g.id=c.group_id where c.code_number=1234 and g.prefix='G';
explain (costs off) select * from loyalty_cards where customer_id='00000000-0000-0000-0000-000000000000' and status='open';
