# Sano Rewards · App del cliente

Web app (PWA) donde el cliente de Sano Bistro Café ve su tarjeta **Cliente Consentido**: código, visitas, premio listo, historial y avisos.

## Cómo verla
1. Doble clic a `Abrir-Sano-Rewards.bat` (instala la primera vez y abre http://localhost:5173).
2. La app siempre usa Supabase real (ya no hay modo demo). `Abrir-Sano-Rewards.bat` la abre en http://localhost:5174.

## Flujo
- El registro nuevo llega **solo por el QR físico del local** (`/r/<token>` por grupo). No hay registro desde el panel.
- Entrar: Google, código por correo o correo+contraseña → nombre/teléfono → tarjeta.
- Tarjeta: código (prefijo del grupo + número), sellos, meta 8 (Premium 4), 1 visita/día, reinicio mensual.
- Diseño por grupo: classic / sport / notebook / waves; Premium = piel dorada.

## Comandos
`npm run dev` · `npm run build` · `npm test` · `npm run typecheck`

## Estructura
`src/domain` (reglas puras) · `src/data` (puerto + adaptador Supabase) · `src/screens` · `src/components` · `tests`.
Migración nueva (diseño por grupo y próximo premio): `../supabase/migrations/003_tema_y_proximo_premio.sql` (no aplicada aún).
