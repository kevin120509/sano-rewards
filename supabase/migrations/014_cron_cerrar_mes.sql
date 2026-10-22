-- 014 · Cierre automático (aplicado 2026-10-10 con execute_sql).
-- Corre todos los días 00:10 hora de Yucatán (06:10 UTC). close_month es idempotente:
--   · vence tarjetas de meses anteriores (abiertas o con premio sin canjear),
--   · regresa a Cliente Consentido a quien se le venció el Premium,
--   · recalcula monthly_group_stats del mes anterior.
select cron.schedule('cerrar-mes', '10 6 * * *', $$ select public.close_month() $$);
