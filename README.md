# Sano Rewards

Tarjeta de lealtad web "Cliente Consentido" para Sano Bistro Café (proyecto de CODIA).
App publicada: https://sano-rewards-real.vercel.app

## Qué hay aquí
- `frontend/`: app web (Vite + React 18 + TypeScript, PWA).
- `supabase/`: migraciones SQL, funciones Edge y plantillas de correo.
- `specs/`: especificaciones por funcionalidad (la vigente es la 004).
- `prueba-loyverse/`: scripts para probar ventas reales con Loyverse.
- `qr/`: QR de registro de cada grupo.
- `docs/` y `_drive/`: documentación técnica.

Lee primero `AGENTS.md` (reglas del proyecto) y `MEMORY.md` (estado actual).

## Correr la app en tu compu
1. `cd frontend`
2. Copia `.env.example` a `.env.local` y pide a Kevin los valores que falten (no se suben al repositorio).
3. `npm install`
4. `npm run dev` y abre http://localhost:5173

Antes de entregar: `npm run typecheck` y `npm test`.

## Reglas importantes
- Nunca subas `.env`, tokens ni contraseñas.
- Las migraciones en Supabase y las publicaciones en Vercel se aplican solo con aprobación de Kevin.
