/**
 * Lo que este dispositivo ya le mostró al cliente: la última visita vista (para animar solo las nuevas)
 * y los premios cuyo aviso ya cerró. Vive en el navegador; si se borra, solo se repite una animación.
 */
interface Seen { lastAt?: string; rewards: string[] }
const key = (code: string) => `sano-seen:${code}`;

export function loadSeen(code: string): Seen {
  try { const s = JSON.parse(localStorage.getItem(key(code)) ?? '{}'); return { lastAt: s.lastAt, rewards: Array.isArray(s.rewards) ? s.rewards : [] }; }
  catch { return { rewards: [] }; }
}

export function saveSeen(code: string, patch: Partial<Seen>): void {
  try { localStorage.setItem(key(code), JSON.stringify({ ...loadSeen(code), ...patch })); } catch { /* modo privado: sin memoria */ }
}
