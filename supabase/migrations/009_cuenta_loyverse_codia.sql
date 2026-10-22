-- 009 · Cambio a la cuenta de PRUEBA nueva de Loyverse ("Codia", 2026-10-09).
-- La numeración de tickets vuelve a empezar en la cuenta nueva y receipt_number es UNIQUE:
-- las ventas de la cuenta anterior (Tixcapostres) se conservan con el prefijo "ANT-". No se borra nada.
update public.loyverse_receipts set receipt_number = 'ANT-' || receipt_number where receipt_number not like 'ANT-%';
update public.loyverse_receipts set refund_for = 'ANT-' || refund_for where refund_for is not null and refund_for not like 'ANT-%';

insert into public.loyverse_discounts (loyverse_id, name, discount_type, value, synced_at) values
  ('35af8d67-48fe-4fe3-ab13-48c2e7d2012f', 'Premio Consentido: bebida gratis', 'FIXED_PERCENT', 100, now()),
  ('70cf1573-f31e-4f40-ae92-a9d894f92e83', 'Premio Premium 2x1', 'FIXED_PERCENT', 50, now())
on conflict (loyverse_id) do update set name = excluded.name, value = excluded.value, deleted_at = null, synced_at = now();

update public.rewards set loyverse_discount_id = '35af8d67-48fe-4fe3-ab13-48c2e7d2012f' where loyverse_discount_id = '2d8104ad-50d7-45c9-b5ef-7c73e7d3bcda';
update public.rewards set loyverse_discount_id = '70cf1573-f31e-4f40-ae92-a9d894f92e83' where loyverse_discount_id = '96f7358d-8fcd-44f7-8b79-d146349f733b';
update public.loyverse_discounts set deleted_at = now() where loyverse_id in ('2d8104ad-50d7-45c9-b5ef-7c73e7d3bcda', '96f7358d-8fcd-44f7-8b79-d146349f733b');
