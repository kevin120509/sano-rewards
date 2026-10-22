import type { LoyaltyApi } from './port';
import { createLiveApi } from './live';

const env = import.meta.env;
const url = env.VITE_SUPABASE_URL as string | undefined;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!url || !key) {
  // Sin credenciales la app no puede funcionar: mejor fallar claro que mostrar datos falsos.
  throw new Error('Faltan VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY (ver .env.example).');
}

/** Única fuente de datos: Supabase (proyecto real). */
export const api: LoyaltyApi = createLiveApi(url, key);
export const VAPID_PUBLIC_KEY = (env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? '';
