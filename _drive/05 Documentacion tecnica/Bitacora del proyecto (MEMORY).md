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
