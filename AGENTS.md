# AGENTS.md · Sano Rewards (tarjetas de lealtad · CODIA)

## Qué es
Tarjeta de lealtad web "Cliente Consentido" para Sano Bistro Café. Loyverse es el POS: el mesero escribe el
código del cliente (ej. G-4821) en el comentario de la venta; el sistema lee el recibo y suma la visita.
8 visitas = premio (Premium: 4). Máx. 1 visita/día. Reinicio mensual. Grupos (GYM, Estudiantes, OSO,
Consentido) con QR físico propio, prefijo de código y diseño propio.

## Stack y estructura
- `frontend/`: Vite + React 18 + TypeScript, PWA. Arquitectura limpia:
  `src/domain` (reglas puras) · `src/data` (puerto `LoyaltyApi` + adaptador Supabase) ·
  `src/components` · `src/screens` · `src/config/brand.ts` (datos del negocio) · `tests/` (vitest).
- `supabase/migrations/`: 001 esquema, 002 ajustes, 003 diseño por grupo + próximo premio.
- Supabase: proyecto `sano_bistro` (ref xddzafjkmtxgwqmrcdwg). Un proyecto por negocio.

## Comandos (en `frontend/`)
`npm install` · `npm run dev` · `npm run typecheck` · `npm test` · `npm run build`
Ver la app: `Abrir-Sano-Rewards.bat` → http://localhost:5173

## Convenciones
- Textos de la UI en español de México. Colores por tema en `domain/themes.ts` (variables CSS).
- Responsive: teléfono < 640, tablet 640–1023, compu ≥ 1024. La tarjeta usa container queries.
- La UI solo habla con el puerto `LoyaltyApi`; nunca llama a Supabase directo.

## Reglas de dominio / trampas
- El registro nuevo SOLO llega por el QR físico del local (`/r/<token>`). No hay registro en el panel.
- Loyverse no escanea QR ni tiene clientes registrados: identificación por código dictado.
- El código lleva el prefijo del grupo, también para Premium (no "P").
- La venta del canje del premio también cuenta como visita.
- `my_card()` devuelve null si el usuario aún no es cliente.

## Personal (roles) · cómo dar de alta
- El rol lo decide la BD (`public.my_role()`); no hay pantalla para elegirlo. Clientes = sin fila en `staff`.
- Dar de alta a alguien (antes o después de que cree su cuenta): `insert into public.staff_invites (email, role) values ('correo@dominio.com', 'owner');` (roles: owner, manager, cashier). Al entrar con ese correo confirmado, `my_role()` lo pasa a `staff`.
- Una cuenta de personal no puede tener tarjeta de cliente (trigger `customers_block_staff`). Para un mesero que también es cliente, usar otro correo.
- Panel: /admin (dueña: Resumen, Clientes, Grupos con QR) y /mostrador (caja: buscar, +1 sello 1 por día, canjear). −1 visita, cambio de grupo y Premium solo dueña.

## Programa (spec 004, tarjeta básica)
- Reglas en `program_settings` (1 fila): 65/200/250, vigencias 30/15/30, meta 7, descuentos de Loyverse por cupón, categorías de paquetes, tipos de pedido. La dueña edita descuentos/categoría/tipos en Administración → Programa.
- Cada ticket: `process_receipt` (canje bebida → sello → panadería en sello 1 → cold foam → canje panadería/cold foam). Anular: `private.reverse_receipt`. Diario 00:10: `daily_maintenance` (vence cupones, reintenta tickets con error).
- Prueba real: `prueba-loyverse/prueba-004.mjs venta C-0000 AAAA-MM-DD "Producto[:bebida|panaderia|coldfoam]"`.

✅ Siempre: probar con `typecheck` + `test` y revisar en 3 tamaños antes de entregar.
⚠ Preguntar antes: aplicar migraciones en Supabase, cambiar reglas de visitas/premios, hacer push al repo.
🚫 Nunca: usar la service_role en el frontend, subir `.env`/tokens, inventar precios o premios reales.

## Verificación
Sin modo demo: proyecto real. Código de correo = 8 dígitos (OTP_LENGTH en config/brand.ts debe coincidir con Supabase).
