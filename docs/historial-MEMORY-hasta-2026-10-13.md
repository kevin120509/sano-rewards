# MEMORY.md · estado del proyecto (máx. ~50 líneas, sin claves ni datos personales)

## Estado actual (2026-10-06, tarde)
- BD sano_bistro: migraciones 001–006 aplicadas (003 diseño por grupo/próximo premio, 004 webhook,
  005/006 consulta de estado para pruebas).
- Edge Function `loyverse-webhook` desplegada (sin JWT, clave en ?key=, se valida por hash en BD).
- Webhook `receipts.update` registrado en la cuenta de PRUEBA de Loyverse (tienda Tixcapostres).
- Pruebas e2e: 12/12 pasaron (ver prueba-loyverse/RESULTADOS-2026-10-06.md). Cliente de prueba C-8571.
- Frontend: demo en :5173 (`Abrir-Sano-Rewards.bat`) y modo real en :5174 (`Abrir-modo-real.bat`).
- Demo pública en Vercel: sano-rewards-demo.vercel.app (proyecto aparte, sin repo; borrar cuando Kevin diga).
- La carpeta de la laptop es la fuente de verdad del código.
- 2026-10-07: Google OAuth (proyecto GCP "Sano Rewards", modo prueba), SMTP Gmail sanobistrocafe@gmail.com
  con remitente "Sano Bistro Café", plantillas por grupo (supabase/plantillas-correo, gen.py), migración 007
  (teléfono único + grupo/nivel en user_metadata), contador 60 s al reenviar código, selector de cuenta Google.
- Versión real: sano-rewards-real.vercel.app (publicar con frontend\Publicar-en-Vercel.bat; Kevin lo corre).

## Decisiones (y por qué)
- Vite + React en lugar de Next.js: app 100 % de navegador.
- Premium = piel dorada sobre el diseño del grupo; mantiene el prefijo del grupo.
- Al cliente se le muestra `rewards.description` (texto amable) antes que el nombre interno del descuento.
- Premios de PRUEBA: Consentido → "Recompensa de producto Gratis" (una bebida gratis);
  Premium → "Cliente de 2 x 1" (2x1 en tu bebida). Falta que Kevin/dueña definan los reales por grupo.
- Webhook sin firma de Loyverse: se protege con clave secreta en la URL (hash en `private.webhook_keys`).
- Devolución y cancelación se probaron con payload simulado (mismo formato que Loyverse).
- Sin QR → grupo por defecto (Consentido). Teléfono opcional. Marca en `frontend/src/config/brand.ts`.

## Errores a evitar
- El entorno en la nube no puede usar npm: instalar/compilar en la laptop.
- Loyverse POST /receipts: con `id` de descuento existente NO mandar `percentage`.
- La regla 1 visita/día hace que repetir pruebas el mismo mes dé "already_visited_today".
- `set_customer_tier` exige superadmin; mientras no exista, el cambio a Premium se hizo por SQL.
- Pruebas SQL locales: crear antes los roles anon/authenticated/service_role.

## Próximos pasos
- Kevin: Google OAuth, SMTP (Gmail o Resend), token de Loyverse definitivo (y rotar el de prueba).
- Definir premios reales por grupo y crear grupos GYM/Estudiantes/OSO con su `theme`.
- Crear superadmin; pg_cron para close_month; aviso de privacidad; logo real.

## 2026-10-07 (tarde)
- Teléfono OBLIGATORIO en los 3 accesos: Complete.tsx lo exige; App.tsx manda a /completar a quien tenga tarjeta sin teléfono; migración 008 (aplicada) hace que register_customer rechace crear tarjeta sin teléfono (≥10 dígitos). Google no entrega teléfono → se pide en "Casi listo".
- Nueva ruta pública /privacidad (Privacy.tsx, borrador con domicilio [PENDIENTE]).
- Google OAuth EN PRODUCCIÓN (2026-10-07): marca con página principal sano-rewards-real.vercel.app, privacidad /privacidad, dominios demo/real/supabase. Cualquier cuenta Google puede entrar. Si se sube logo, Google exigirá verificación.
- Contraseña: '¿Olvidaste tu contraseña?' en Login (resetPasswordForEmail → /nueva-contrasena, pantalla NewPassword.tsx) y sección 'Contraseña' en Mi cuenta (updateUser; sirve también para quien entró con Google/código). Plantilla 'Reset password' de Supabase con diseño por grupo (gen.py → restablecer-contrasena.html). Pendiente: publicar en Vercel y probar el correo real.
- Login: ya no redirige solo si hay sesión abierta (solo al volver de Google, flag sessionStorage 'sano_oauth_pending'); muestra 'Ya tienes la sesión abierta con X · Ir a mi tarjeta / Usar otra cuenta'. El selector de Google sí funciona en producción (verificado); lo que pasaba en el teléfono era la sesión ya abierta.
- 2026-10-07: SE QUITÓ EL MODO DEMO (demo.ts, DemoPanel, isDemo → movidos a _to_delete/demo). App siempre Supabase. Publicar-en-Vercel.bat solo sube la real; Abrir-Sano-Rewards.bat abre :5174 real. Proyecto Vercel sano-rewards-demo sigue existiendo (borrar cuando Kevin confirme).
- Inicio: chips de registro por grupo con tokens REALES (config/brand.ts GROUP_LINKS, SHOW_GROUP_LINKS=true TEMPORAL hasta imprimir QR; quitar después porque deja elegir grupo).
- Código por correo = 8 dígitos (OTP_LENGTH). Mi cuenta: tarjeta (código, grupo, categoría, vencimiento Premium, visitas), datos con teléfono obligatorio, botón "Cambiar contraseña" → /nueva-contrasena.
- Prueba real 2026-10-07 con Google (cuenta de Kevin): tarjeta, Mi cuenta, Historial y aviso de sesión abierta OK y coinciden con la BD. OJO: el correo con código de las 11:02 no llegó (Supabase /otp 200); revisar Enviados/alertas de sanobistrocafe@gmail.com.
- 2026-10-07: grupo OSO renombrado a OZON (BD, plantillas de correo en Supabase y gen.py, GROUP_LINKS). Bienvenida por grupo en /r/<token> con textos propios (domain/groupCopy.ts) y diseño del grupo.
- QR generados en qr/ (PNG 1920x1080 por grupo + inicio general; qr/imprenta/*.svg vectoriales; qr/fuente/posters.mjs para regenerar). Apuntan a sano-rewards-real.vercel.app: si se cambia a dominio propio hay que regenerarlos ANTES de imprimir.
- Correo con código por Gmail SMTP llegó con ~12 min de retraso (enviado 17:02Z): riesgo para clientes; considerar Resend u otro servicio de envío.
- Ubicación del negocio: Progreso, Yucatán (no Mérida). Aviso de privacidad corregido.
- Domicilio Sano Bistro: Calle 77 (antes 27) No. 8E x 44 y 46, Col. Ismael García, 97320 Progreso, Yuc. (BRAND.address + mapsUrl). Aviso de privacidad ya sin [PENDIENTE].
- 2026-10-09: documentación completa subida al Drive del equipo (CODIA › Clientes › 2.0 Sino Coffe): 00 LEEME (Google Doc), 04 QR, 05 Documentación técnica, 06 Plantillas de correo, 07 Código fuente (zip sin claves), migraciones 003-008 + edge function en 'Base de datos (SQL y pruebas)'. Copia local del paquete en _drive/.
- 2026-10-09 prueba de tiempo: ventas 0010 (visita) y 0011 (canje 2x1) en Loyverse de prueba. El webhook (ENABLED) NO llegó en >4 min (el 6-oct sí llegaba en segundos). "El sistema pide" (prueba-loyverse/sincronizar.mjs: GET /receipts?updated_at_min + POST a la función) tarda ~2-3 s y funcionó: visita 1/4 y premio canjeado; repetir la sync no duplica. Propuesta: sync automática cada minuto (pg_cron + edge function con el token de Loyverse como secreto) + webhook como respaldo.
- 2026-10-09: NUEVA cuenta de PRUEBA Loyverse "Codia" (token en prueba-loyverse/.env y en Vault 'loyverse_token'). preparar-cuenta.mjs creó 3 productos "(prueba)" y descuentos "Premio Consentido: bebida gratis" (100%) y "Premio Premium 2x1" (50%); webhook registrado. Migración 009: recibos viejos con prefijo ANT- (la numeración reinicia en 0001) y premios apuntan a los descuentos nuevos.
- SINCRONIZACIÓN AUTOMÁTICA (migración 010 + Edge Function loyverse-sync): pg_cron cada minuto → pide a Loyverse los tickets desde el último updated_at (−2 min) y los procesa (idempotente). Secreto cron↔función en Vault 'loyverse_sync_secret'. Probado: ventas 0001/0002 procesadas ~35 s después de la venta. El webhook de Loyverse sigue sin llegar; queda como respaldo. Para la cuenta REAL: cambiar 'loyverse_token' en Vault, mapear descuentos y registrar webhook.
- 2026-10-09: el webhook de la cuenta VIEJA (Tixcapostres) entregó tarde (~30 min) tickets 0010/0011 → renombrados ANT-DUP-. Se rotó la clave del webhook (prueba-loyverse/rotar-clave.mjs: .env + hash en private.webhook_keys + webhook nuevo en Codia), así la cuenta vieja recibe 401. Pendiente opcional: filtrar por store_id en el ingest. Ventas 1-0001/1-0002 hechas por Kevin desde el POS sin código → ignoradas (correcto).
- 2026-10-09: sano-rewards-demo.vercel.app ahora REDIRIGE a sano-rewards-real (carpeta redireccion-demo/, publicada con vercel CLI usando VERCEL_ORG_ID/PROJECT_ID; incluye sw.js que desinstala el SW viejo). frontend/.vercel ahora apunta al proyecto real. La app real ya estaba al día (sin demo, OZON, domicilio).
- 2026-10-09: visitas con fecha y hora (migración 011: my_card trae card_visits; recent_visits hasta 31). Tarjeta: fecha bajo cada sello + lista 'Tus visitas en esta tarjeta'; Historial agrupado por mes. Animación de sello nuevo + aviso '¡Se registró tu visita!' (lib/seen.ts guarda en el navegador la última visita vista; en dispositivo nuevo anima visitas de las últimas 6 h). Aviso de premio en medio de la pantalla (RewardModal) una vez por premio. La tarjeta se refresca cada 20 s mientras está abierta. Publicado en Vercel (deploy por CLI desde la compu de Kevin funciona con VERCEL_ORG_ID/PROJECT_ID).

## 2026-10-09 · Panel de la dueña y Mostrador (spec 003)
- Un solo enlace; el rol lo decide la BD (public.my_role). Personal = tabla staff (superadmin/owner/manager/cashier). Nadie elige rol; CODIA da de alta por SQL. El personal nunca ve el flujo de cliente (App.tsx: Home/RequireCard/RequireSession mandan a su panel; trigger customers_block_staff impide que saque tarjeta).
- Frontend: domain/staff.ts (tipos), port.ts + live.ts (myRole, staff*, admin*), app-context publica `role` (la sesión se publica junto con el rol para no pasar por /completar), components/StaffShell, CustomerPanel, CustomerRow; screens/staff/Mostrador, AdminSummary, AdminCustomers, AdminGroups; lib/qr-poster.ts (paquete `qrcode`; cartel PNG 1200×1600 con BRAND.publicUrl/r/<token>), lib/staff-format.ts (hora America/Merida). Estilos `.sp-*` al final de styles.css.
- Rutas: /mostrador (todo el personal), /admin, /admin/clientes (?grupo=id), /admin/grupos (solo owner/manager/superadmin; caja → /mostrador).
- Probado 2026-10-09 en localhost con cuentas de prueba: caja → Mostrador, búsqueda por código/nombre, ficha (ya vino hoy, +1 bloqueado), /admin bloqueado; dueña → Resumen con datos reales, Clientes con ficha admin, Grupos (editar y guardar GYM OK, beneficio de prueba revertido), cartel QR generado OK; vista de teléfono OK. Publicado en Vercel (producción) el mismo día.
- Pendiente: alta de la cuenta real de la dueña (insert en staff_invites con su correo y role owner); borrar cuentas de prueba al terminar; actualizar docs del Drive.
- 2026-10-10: spec 003 TERMINADA. Validación RF por RF contra la BD (transacción revertida, datos de Kevin intactos): +1 manual con autor, 1 por día, −1 bloqueado a caja y OK a dueña, canje y "sin premio", cambio de grupo C→E→C conserva número, Premium 3 meses/quitar, 8 registros en audit_log. Texto de Premium corregido (cuenta por mes de calendario). Publicado en Vercel.
- 2026-10-10: cron 'cerrar-mes' (migración 014) corre close_month diario 00:10 Yucatán: vence tarjetas de meses pasados (también premios sin canjear), regresa Premium vencido y guarda estadísticas. Confirmar con Kevin/dueña si un premio ganado a fin de mes debe vencer el día 1.
- 2026-10-12: la dueña (Paula Morales) CAMBIÓ el modelo: sin Premium por ahora; tarjeta básica 7 sellos + bebida en la 8.ª (compra ≥$65, sellos no vencen), cupones panadería (≥$200 en sello 1, 15 días) y cold foam (≥$250, 30 días), 1 cupón por día, diseño nuevo café/beige con QR, beneficios y promociones del mes. Material en docs/material-duena-2026-10-12/. Borrador specs/004-tarjeta-basica-y-cupones/spec.md con 5 dudas para la dueña. NO programar hasta aprobación. Los 2 audios no se pudieron transcribir (bloqueo de red).
- 2026-10-13: spec 004 IMPLEMENTADA (migraciones 015a-i, edge loyverse-sync v3 con catálogo, frontend diseño café/beige, pestaña Programa, Mostrador con cupones, anular compra, revisión). Publicado en Vercel. Probado con ventas reales en Loyverse Codia (ver specs/004/tasks.md). Config actual de Programa apunta a descuentos "(prueba)" de la cuenta Codia: al pasar a la cuenta real de Sano hay que crear los 3 descuentos + categoría de promos y elegirlos en Programa.
- PENDIENTE: aplicar 015d (datos: Premium→normal, meta 7) — los clientes viejos aún muestran meta 4/8. Plantillas de correo siguen con diseño verde "Cliente Consentido". Cliente de prueba nuevo: kevin.36137+cliente@gmail.com (C-2891, entra con código por correo).
- Autoprueba SQL y migración de datos fueron "cancelled" por la herramienta: requieren que Kevin apruebe en el momento.
