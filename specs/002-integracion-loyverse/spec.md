# 002 Â· IntegraciÃ³n Loyverse â†’ Supabase (spec + plan + tareas)

Estado: en implementaciÃ³n (aprobado por Kevin el 2026-10-06, "haz todo eso").

## QuÃ© y por quÃ©
Cada venta cerrada en Loyverse debe llegar sola al sistema para sumar la visita del cliente que dictÃ³ su
cÃ³digo (ej. `C-4821`) y para validar el canje de premios. Sin esto la tarjeta del cliente nunca avanza.

## Requisitos (EARS)
- RF1. CUANDO Loyverse envÃ­e `receipts.update`, el sistema DEBE guardar cada recibo una sola vez (por `receipt_number`).
- RF2. CUANDO un recibo traiga un cÃ³digo vÃ¡lido en la nota o en la nota de un producto, el sistema DEBE sumar 1 visita.
- RF3. SI el cliente ya tiene visita ese dÃ­a (hora de MÃ©rida), ENTONCES el sistema NO DEBE sumar otra.
- RF4. CUANDO las visitas lleguen a la meta (8; Premium 4), el sistema DEBE marcar el premio listo y abrir tarjeta nueva.
- RF5. CUANDO un recibo traiga el descuento del premio listo del cliente, el sistema DEBE marcarlo canjeado; la venta tambiÃ©n cuenta como visita.
- RF6. SI se aplica un descuento de premio sin premio listo, ENTONCES el sistema DEBE reportarlo.
- RF7. CUANDO llegue una devoluciÃ³n o cancelaciÃ³n, el sistema DEBE anular la visita de la venta original.
- RF8. SI la peticiÃ³n no trae la clave secreta correcta, ENTONCES el sistema DEBE rechazarla (401) sin guardar nada.
- RF9. SI el recibo no trae cÃ³digo o es de un mes cerrado, ENTONCES se guarda como ignorado con su motivo.

## Casos lÃ­mite
CÃ³digo en minÃºsculas o con espacios (`c 4821`), dos cÃ³digos en un recibo (gana el primero vÃ¡lido), webhook
repetido (idempotente), recibo editado despuÃ©s (se actualiza `raw`), cliente inactivo (ignorado).

## Fuera de alcance
Panel del superadmin, recordatorios por correo/push, sincronizaciÃ³n nocturna de respaldo.

## Plan (cÃ³mo)
1. MigraciÃ³n 004: `private.webhook_keys` (solo hash SHA-256 de la clave), RPC `loyverse_ingest(p_key, p_payload)`
   (solo service_role) que valida la clave y llama a `upsert_loyverse_receipt` + `process_receipt` por recibo;
   RPC `sync_loyverse_discounts`; RPC `reward_misuse_report` (RF6).
2. Edge Function `loyverse-webhook` (Deno, sin JWT): lee `?key=`, llama a `loyverse_ingest`, responde 200/401/500.
3. Registrar el webhook `receipts.update` en la cuenta de PRUEBA de Loyverse.
4. Premios de prueba: Consentido â†’ "Recompensa de producto Gratis"; Premium â†’ "Cliente de 2 x 1" (cambiables).
5. Script `prueba-loyverse/e2e.mjs`: crea ventas por la API de Loyverse y verifica cada RF contra Supabase.

## Tareas
- [x] T1 Aplicar 003 Â· Hecho cuando: `my_card` devuelve `theme` y `next_reward`.
- [x] T2 MigraciÃ³n 004 Â· Hecho cuando: `loyverse_ingest` con clave mala falla y con buena procesa.
- [x] T3 Edge Function desplegada Â· Hecho cuando: POST sin clave â†’ 401.
- [x] T4 Webhook registrado y descuentos sincronizados.
- [x] T5 e2e verde en RF2â€“RF9 con una cuenta de prueba creada por Kevin.
- [x] T6 App en modo real muestra visitas y premio.
