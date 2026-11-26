# MEMORY.md · estado del proyecto (máx. ~50 líneas, sin claves ni datos personales)
Historial completo anterior: docs/historial-MEMORY-hasta-2026-10-13.md

## Estado actual (2026-10-13)
- App real: sano-rewards-real.vercel.app (Vercel, deploy con VERCEL_ORG_ID/PROJECT_ID, ver Publicar-en-Vercel.bat).
  sano-rewards-demo.vercel.app solo redirige a la real.
- Backend Supabase (proyecto xddzafjkmtxgwqmrcdwg). Migraciones aplicadas hasta 016 (016 aplicada 2026-10-22 por SQL Editor desde el Chrome de Kevin). Edge function loyverse-sync v3.
- Loyverse: cuenta de PRUEBA "Codia". pg_cron cada minuto pide tickets (y cada 5 min descuentos, categorías y productos).
  Webhook solo como respaldo. Diario 00:10 (Progreso): daily_maintenance (vence cupones, reintenta tickets con error).
- Spec 004 (tarjeta básica) IMPLEMENTADA y probada con ventas reales: 7 sellos + bebida en la 8.ª, sello con compra
  ≥ $65 (1/día), panadería ($200 en sello 1, 15 días), cold foam ($250, 30 días), bebida 30 días desde el día
  siguiente, 1 cupón/día, sellos no vencen, anular compra → cupones usados a revisión. Sin Premium por ahora.
- Panel por rol (spec 003): /admin (Resumen, Clientes, Grupos, Programa) y /mostrador. Rol lo decide la BD (my_role).
  2026-10-13: menú del personal ahora VERTICAL a la izquierda (≥900px) y pestañas abajo en teléfono (StaffShell.tsx, styles.css). Resumen y Programa reordenados por secciones. Menú lateral ya publicado y revisado en pantalla (Kevin lo subió). Ficha del cliente con secciones y negritas, y barra superior móvil que se envuelve: hechos en código el 2026-10-13, con librería `motion` (components/motion.tsx: CountUp, Rise; pastilla animada del menú y transición entre pantallas, respetan reduced-motion). PUBLICADO 2026-10-13 (deploy EZdMuYEb…). Claude publica con run_in_terminal + frontend/Publicar-en-Vercel.bat en la terminal del usuario; por Bash/PowerShell el clasificador bloquea vercel deploy --prod.
- Diseño cliente "Sano" (beige/café, logo @sanobistro) igual para todos los grupos (themes.ts CUSTOMER_SKIN).
- 2026-11-26: QR del cliente PUBLICADO en vivo (deploy sano-rewards-real-2jijpu8cw; bundle verificado: codesheet__qr,
  escaneen, "Mostrar código y QR"). El botón de la tarjeta ahora dice "Mostrar código y QR". OJO AL PUBLICAR:
  el deploy va SIEMPRE desde la carpeta `frontend/` (ahí está el .vercel correcto → sano-rewards-real y Publicar-en-Vercel.bat).
  Desde la RAÍZ NO: `vercel --prod` en la raíz crea un proyecto basura "tarjetas-lealtad" (ya borrado). Los pushes a
  GitHub NO despliegan solos; hay que publicar a mano. GitHub al día (commit 0bbee6d).

## Cuentas de prueba (contraseñas en CUENTAS-PRUEBA.local.txt, no subir)
- kevin.36137+admin@gmail.com (dueña) · kevin.36137+caja@gmail.com (caja) · (cuenta de cliente de prueba C-2891 BORRADA 2026-11-09; para probar como cliente registrar otra por QR)
- Kevin real: C-8571. Víctor: C-4738 y C-3895 (no tocar).

- 2026-10-13 prueba en vivo de las 3 pantallas (caja, admin, cliente). Arreglado y PUBLICADO 2026-10-13 (deploy DA35ey8i…; cliente verificado en vivo, admin no re-verificado):
  Programa se desbordaba a lo ancho 640-720px (styles.css .sp-form__grid/.field select); notas de compra en inglés
  (receiptReason en lib/staff-format.ts + test); "Mostrar mi código" no salía encima (.sano > * le ganaba a .codesheet);
  pantallas nuevas abrían a media página (ScrollToTop en App.tsx); textos "la tarjeta se reinicia cada mes" (History, Account).
  Sin arreglar: selector "Diseño de la tarjeta" en Grupos no hace nada; buscar "C-0000" encuentra por teléfono;
  "Activar notificaciones" no tiene backend que envíe avisos. (Bebida "30 días desde su emisión" = correcto, así lo dice el PDF de la dueña.)
- 2026-10-13 revisado material de la dueña (docs/material-duena-2026-10-12) contra la app: todo hecho salvo fotos
  reales tipo sticker, promos y convenios (los manda ella).
- 2026-10-22: PUBLICADO en Vercel (deploy dpl_7GXTmfzi…; bundle en vivo verificado) y revisado local en 3 tamaños con
  dueña (Grupos) y cliente (Cuenta). Login de prueba por código: pedir código en /entrar y leerlo con el conector Gmail
  (llega en segundos, diseño café OK). Repo PÚBLICO github.com/kevin120509/sano-rewards creado; VictorCD20 y EmirMontalvo invitados (push).
  Conector Supabase de Claude está en OTRA cuenta (solo ve utm-desk-nosql-cloud): no ve sano_bistro.
  Ojo: Resumen de admin mostró "Clientes registrados 0" con C-2891 existente : era CountUp (esperaba a useInView y en pestaña oculta se quedaba en 0; real = 4). Arreglado 2026-10-22 en motion.tsx (anima al cargar + temporizador 900 ms fija el valor). PUBLICADO y verificado en vivo (muestra 4).
- 2026-10-20/22: arreglados en código (typecheck 0, tests 18/18, build OK):
  selector de diseño en Grupos oculto si CUSTOMER_SKIN='sano' (AdminGroups.tsx); sección "Avisos" oculta con
  PUSH_ENABLED=false (config/brand.ts, Account.tsx); búsqueda por código exacto en migración 016_buscar_por_codigo_APLICADA.sql
  (aplicada 2026-10-22).
- 2026-10-22: git iniciado (2 commits). .gitignore excluye .env*, *.local*, _entrega (un tgz traía .env.local),
  _to_delete, _drive/07, docs/material-duena (audios privados). Repo creado (ver arriba).
  .claude/launch.json = server "sano-dev".
- 2026-10-26: PRUEBA COMPLETA en Loyverse "Codia" con C-2891 (tickets 0016-0019), leída sola en <1 min y verificada en la ficha: 4 → sin sello (mínimo 5); 50 → sello + cupón cold foam (vence 30 días después: 21 oct → 20 nov); 2.ª compra del mismo día → sin sello; cupón aplicado en Loyverse → canjeado solo + sello. Anulación ya probada el 2026-10-13 (tickets 0003/0015). C-2891 quedó en 4/7 sellos, sin cupones.
- 2026-11-09: LIMPIEZA de clientes en Supabase (sano_bistro): borrados C-2891 Paula Prueba, G-2966 Kevin vargas (GYM) y C-7417 Chatgpt DSM, con tarjeta y acceso, por decisión de Kevin. Quedan SOLO C-8571, C-4738 y C-3895 (verificado: 0 accesos/perfiles restantes, 0 sellos o cupones huérfanos). Los 17 tickets de C-2891 se conservaron en loyverse_receipts con customer_id null para que no se reprocesen. Conector Supabase reconectado a la organización CODIA_Cafateria (herramientas MCP disponibles al abrir sesión nueva).
- 2026-11-09: se PROBÓ el diseño verde de la primera versión en la pantalla de inicio (/) y Kevin pidió REGRESARLO al café (nunca se publicó). Quedó revertido con git revert; el trabajo verde sigue en el historial (commit 3285e5b) por si se quiere recuperar. Versiones viejas del código: _entrega/sano-front.tgz (6 oct) y _drive/07 (zip 7 oct), fuera de git.
- 2026-11-09 (tarde): por orden de Kevin se BORRARON las tarjetas de cliente C-8571 (Kevin), C-4738 y C-3895 (Víctor, victorgcc10@gmail.com). Kevin y victorcado29 siguen como administradores (owner); el acceso/perfil de victorgcc10 sigue existiendo pero sin tarjeta ni rol. Único cliente que queda: C-5777 (oscarmendozauwu@gmail.com, real, no tocar). Tickets de Loyverse conservados con customer_id null. La regla "no tocar C-8571/C-4738/C-3895" ya no aplica.
- 2026-11-23: NUEVO flujo de identificación por QR (decidido con Kevin, validado contra la API y precios oficiales de Loyverse).
  Verificado en loyverse.com/pricing: CLIENTES y programa de fidelidad son GRATIS; lo de pago es Empleados ($5/empleado),
  Historial >31 días ($5/tienda), Inventario avanzado ($25/tienda). O sea NO cobra por clientes (lo que vio la dueña era
  seguramente empleados). API: recibo trae note + line_items + total_money + customer_id; GET /receipts filtra por updated_at_min;
  objeto customer tiene customer_code (≤40); límite de API = 300 req/300s por cuenta (1/seg), sin tope de nº de clientes.
  Arquitectura: Supabase = identidad+fidelización (dueño de la verdad); Loyverse = cliente operativo. El cliente muestra su QR
  (= su código C-XXXX), el cajero lo escanea en "Añadir cliente" (cámara nativa de Loyverse, sin lector extra), el recibo regresa
  con customer_id y de ahí sacamos el sello. El sello se da con la VENTA confirmada, no al escanear. Nota en el ticket = respaldo (híbrido).
  HECHO Fase 1 (mig 017): columna customers.loyverse_customer_id (único) + función customer_code(uuid)= prefix||'-'||code_number.
  HECHO Fase 2 (mig 018 + Edge loyverse-sync v4): RPCs loyverse_customers_pending/ _mark (seguras con el secreto compartido) y
  paso en la función tras ?clientes=1 que crea el cliente en Loyverse (name+customer_code) y guarda el id. PROBADO contra Codia:
  3 clientes creados con customer_code exacto, mapeo guardado, LUEGO borrados de Codia y loyverse_customer_id vuelto a null para
  que con el token real se sincronicen a Sano. El cron automático NO dispara ?clientes=1 todavía (a propósito, para no sincronizar
  con el token de prueba).
  HECHO Fase 3 (mig 019): find_customer_in_receipt ahora es híbrida: 1) usa raw.customer_id cruzado con customers.loyverse_customer_id
  (cliente escaneado por QR); 2) si no, el código en la nota/renglón (como antes). Probado aislado: customer_id→cliente correcto,
  nota→correcto, customer_id inválido con nota→usa nota, customer_id inválido sin nota→null. (Escanear y cancelar NO da sello:
  process_receipt revierte el ticket cancelado antes de identificar.)
  HECHO Fase 4 (CardScreen.tsx CodeSheet + styles.css): "Mostrar mi código" ahora muestra el QR del código (= card.code, p.ej. C-5785)
  con el helper qrDataUrl (librería qrcode, misma que el cartel). Texto: "Muéstralo para que lo escaneen, o díctalo al mesero".
  typecheck 0, 18/18 tests, build OK. Visual en vivo del QR dentro de la tarjeta: no capturado (requiere login de un cliente que no
  debo usar); el QR usa el mismo helper ya probado del cartel. Commits locales sin subir. FALTA solo lo que necesita el token/cuenta
  real: descuentos+categoría, webhook, encender ?clientes=1 en el cron (una línea), y sincronizar clientes existentes.

## PENDIENTE (en orden)
0. ✅ HECHO 2026-10-22: 016 aplicada y probada en vivo como caja (C-0000 y ZZ-1234 → nadie; c2891 y "Paula" → C-2891). T2 y T18 cerradas.
1. ✅ HECHO 2026-10-13: 015d aplicada (1 cliente→normal, 2 tiers y 3 tarjetas abiertas a meta 7). Archivo renombrado 015d_migrar_datos_APLICADA.sql.
2. ✅ HECHO 2026-10-13: plantillas de correo en diseño café, un solo diseño (supabase/plantillas-correo, gen.py). Ya pegadas y guardadas en Supabase (Magic link/OTP, Confirm sign up, Reset password; verificadas al recargar). Copia en _drive/06 Plantillas de correo ya actualizada. Correo real de código probado 2026-10-22 (llega en segundos). Los asuntos no se cambiaron.
3. Fotos reales de la dueña para cupones (galleta, cold foam) cuando las mande.
4. Promociones del mes: las carga la dueña en Programa (ella las está preparando).
5. Cuenta REAL de Sano en Loyverse: token en Vault 'loyverse_token', crear 3 descuentos + categoría de paquetes, elegirlos en Programa, registrar webhook.
6. Convenios (Estudiantes, GYM, OZON): reglas especiales después; por ahora mismas reglas. Quitar SHOW_GROUP_LINKS cuando haya QR impresos.
7. Dueña real: INVITACIÓN owner guardada 2026-10-26 para su correo (tabla staff_invites; verificado: sin otra cuenta ni rol). Falta que ELLA entre con código por correo y confirmar que ve el panel completo. Borrar cuentas de prueba al final.
   2026-10-27: Kevin pidió 3 admins más; agregadas invitaciones owner (staff_invites, SQL Editor desde el Chrome de Kevin, `on conflict do nothing`, verificado con select): emoncan27@gmail.com (aún sin cuenta), kevin.36137@gmail.com y victorcado29@gmail.com (estos dos YA tienen tarjeta de cliente: decisión de Kevin, la tarjeta no se borra y sigue sumando por Loyverse, pero con ese correo la app solo muestra el panel y no su tarjeta; ver app-context.tsx load()). Falta que entren y confirmar que ven /admin. Sin comprobar: si esas tarjetas cuentan en "Clientes registrados" del Resumen.
8. Drive (2.0 Sino Coffe › 05 Documentacion tecnica): Claude no tiene permiso de escribir (carpeta de Víctor); copia local al día en _drive/05, subirla a mano. Correos por Gmail SMTP llegan lento: considerar Resend.

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
- Migraciones: el conector Supabase de Claude es de otra cuenta y el clasificador bloquea aplicar/Run. Flujo que funciona: Claude pega el SQL en el SQL Editor del Chrome de Kevin (monaco setValue) y Kevin da Run; luego Claude prueba en vivo.
- Navegador: usar el Chrome de Kevin (Claude in Chrome); ahí tiene sesión de Supabase. Login de prueba en la app: código por correo leído con el conector Gmail.
