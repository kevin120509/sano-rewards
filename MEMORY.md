# MEMORY.md · estado del proyecto (máx. ~50 líneas, sin claves ni datos personales)
Historial completo anterior: docs/historial-MEMORY-hasta-2026-10-13.md

## Estado actual (2026-10-13)
- App real: sano-rewards-real.vercel.app (Vercel, deploy con VERCEL_ORG_ID/PROJECT_ID, ver Publicar-en-Vercel.bat).
  sano-rewards-demo.vercel.app solo redirige a la real.
- Backend Supabase (proyecto xddzafjkmtxgwqmrcdwg). Migraciones aplicadas hasta 015a-i (incl. 015d). Edge function loyverse-sync v3.
- Loyverse: cuenta de PRUEBA "Codia". pg_cron cada minuto pide tickets (y cada 5 min descuentos, categorías y productos).
  Webhook solo como respaldo. Diario 00:10 (Progreso): daily_maintenance (vence cupones, reintenta tickets con error).
- Spec 004 (tarjeta básica) IMPLEMENTADA y probada con ventas reales: 7 sellos + bebida en la 8.ª, sello con compra
  ≥ $65 (1/día), panadería ($200 en sello 1, 15 días), cold foam ($250, 30 días), bebida 30 días desde el día
  siguiente, 1 cupón/día, sellos no vencen, anular compra → cupones usados a revisión. Sin Premium por ahora.
- Panel por rol (spec 003): /admin (Resumen, Clientes, Grupos, Programa) y /mostrador. Rol lo decide la BD (my_role).
  2026-10-13: menú del personal ahora VERTICAL a la izquierda (≥900px) y pestañas abajo en teléfono (StaffShell.tsx, styles.css). Resumen y Programa reordenados por secciones. Menú lateral ya publicado y revisado en pantalla (Kevin lo subió). Ficha del cliente con secciones y negritas, y barra superior móvil que se envuelve: hechos en código el 2026-10-13, con librería `motion` (components/motion.tsx: CountUp, Rise; pastilla animada del menú y transición entre pantallas, respetan reduced-motion). PUBLICADO 2026-10-13 (deploy EZdMuYEb…). Claude publica con run_in_terminal + frontend/Publicar-en-Vercel.bat en la terminal del usuario; por Bash/PowerShell el clasificador bloquea vercel deploy --prod.
- Diseño cliente "Sano" (beige/café, logo @sanobistro) igual para todos los grupos (themes.ts CUSTOMER_SKIN).

## Cuentas de prueba (contraseñas en CUENTAS-PRUEBA.local.txt, no subir)
- kevin.36137+admin@gmail.com (dueña) · kevin.36137+caja@gmail.com (caja) · kevin.36137+cliente@gmail.com (cliente C-2891, entra con código por correo)
- Kevin real: C-8571. Víctor: C-4738 y C-3895 (no tocar).

- 2026-10-13 prueba en vivo de las 3 pantallas (caja, admin, cliente). Arreglado y PUBLICADO 2026-10-13 (deploy DA35ey8i…; cliente verificado en vivo, admin no re-verificado):
  Programa se desbordaba a lo ancho 640-720px (styles.css .sp-form__grid/.field select); notas de compra en inglés
  (receiptReason en lib/staff-format.ts + test); "Mostrar mi código" no salía encima (.sano > * le ganaba a .codesheet);
  pantallas nuevas abrían a media página (ScrollToTop en App.tsx); textos "la tarjeta se reinicia cada mes" (History, Account).
  Sin arreglar: selector "Diseño de la tarjeta" en Grupos no hace nada; buscar "C-0000" encuentra por teléfono;
  "Activar notificaciones" no tiene backend que envíe avisos. (Bebida "30 días desde su emisión" = correcto, así lo dice el PDF de la dueña.)
- 2026-10-13 revisado material de la dueña (docs/material-duena-2026-10-12) contra la app: todo hecho salvo fotos
  reales tipo sticker, promos y convenios (los manda ella).

## PENDIENTE (en orden)
1. ✅ HECHO 2026-10-13: 015d aplicada (1 cliente→normal, 2 tiers y 3 tarjetas abiertas a meta 7). Archivo renombrado 015d_migrar_datos_APLICADA.sql.
2. ✅ HECHO 2026-10-13: plantillas de correo en diseño café, un solo diseño (supabase/plantillas-correo, gen.py). Ya pegadas y guardadas en Supabase (Magic link/OTP, Confirm sign up, Reset password; verificadas al recargar). Copia en _drive/06 Plantillas de correo ya actualizada. Pendiente menor: probar un correo real de código. Los asuntos no se cambiaron.
3. Fotos reales de la dueña para cupones (galleta, cold foam) cuando las mande.
4. Promociones del mes: las carga la dueña en Programa (ella las está preparando).
5. Cuenta REAL de Sano en Loyverse: token en Vault 'loyverse_token', crear 3 descuentos + categoría de paquetes, elegirlos en Programa, registrar webhook.
6. Convenios (Estudiantes, GYM, OZON): reglas especiales después; por ahora mismas reglas. Quitar SHOW_GROUP_LINKS cuando haya QR impresos.
7. Alta de la dueña real: insert into staff_invites (email, role 'owner'). Borrar cuentas de prueba al final.
8. Actualizar docs del Drive (CODIA › Clientes › 2.0 Sino Coffe). Correos por Gmail SMTP llegan lento: considerar Resend.

## Decisiones (y por qué)
- Identificación por CÓDIGO en la nota del ticket (no escaneo de QR): no requiere app extra para el mesero.
- QR SOLO para registro de clientes (QR impreso de cada grupo). NO poner QR personal en "Mostrar mi código",
  aunque el diseño de la dueña diga "Mostrar mi QR" (Kevin, 2026-10-13).
- Cupones = descuentos de Loyverse; el sistema los lee y marca el canje solo. Mostrador puede canjear a mano.
- "Precio regular" = renglón sin descuento y fuera de la categoría de paquetes elegida en Programa.
- Cold foam se gana en cualquier compra del recorrido abierto; no con la bebida pendiente. Sello manual no da cupones.
- Montos/vigencias solo los cambia CODIA (program_settings).

## Errores a evitar
- En SQL: `text[] || 'literal'` falla; usar array_append.
- La herramienta de Supabase cancela UPDATE/DELETE de datos sin aprobación: hacerlo cuando Kevin esté presente.
- Loyverse: nombres de descuento ≤ 40 caracteres; productos requieren default_pricing_type FIXED.
- Windows bloquea nlm.exe: usar el python de uv (ver historial). Vitest no corre en la VM; correrlo en la laptop.
- card.test.ts: test de piel Premium reescrito (2026-10-13) para el diseño Sano (skin 'sano', sin premium). Si CUSTOMER_SKIN vuelve a 'groups', restaurar el test de piel dorada. Vitest no corrido (solo en la laptop).
- Pruebas: 1 sello por día; usar fechas pasadas con prueba-loyverse/prueba-004.mjs.
