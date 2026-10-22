/** Fechas del panel siempre en hora de Yucatán, sin importar el reloj del dispositivo. */
const TZ = 'America/Merida';

export const fmtDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('es-MX', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('es-MX', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' });

export const fmtRelativeDay = (iso: string | null): string => {
  if (!iso) return 'Sin visitas';
  const d = new Date(iso);
  const key = (x: Date) => x.toLocaleDateString('en-CA', { timeZone: TZ });
  const today = new Date();
  const yest = new Date(Date.now() - 864e5);
  const time = d.toLocaleTimeString('es-MX', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
  if (key(d) === key(today)) return `Hoy, ${time}`;
  if (key(d) === key(yest)) return `Ayer, ${time}`;
  return fmtDateTime(iso);
};

const RECEIPT_STATUS: Record<string, string> = {
  pending: 'en proceso', processed: 'procesada', ignored: 'sin cliente', error: 'con error (se reintenta en la noche)',
};
const COUPON_NAME: Record<string, string> = { bebida: 'bebida', drink: 'bebida', bakery: 'panadería', coldfoam: 'cold foam' };
const COUPON_RESULT: Record<string, string> = {
  redeemed: 'canjeado', not_available: 'no estaba disponible', expired: 'vencido',
  not_yet: 'aún no se podía canjear', daily_limit: 'no se canjeó, ya había usado un cupón ese día',
};

/**
 * Nota de una compra de Loyverse en español. La BD guarda notas como "sello · coldfoam: redeemed ·
 * sin sello: pagó 64 (mínimo 65.00)"; aquí se traducen los códigos internos.
 */
export const receiptReason = (reason: string | null | undefined, status?: string | null): string => {
  if (!reason) return status ? RECEIPT_STATUS[status] ?? status : '';
  return reason.split(' · ').map((part) => {
    const coupon = /^(\w+): (\w+)$/.exec(part);
    if (coupon && COUPON_NAME[coupon[1]] && COUPON_RESULT[coupon[2]]) return `cupón de ${COUPON_NAME[coupon[1]]}: ${COUPON_RESULT[coupon[2]]}`;
    return part.replace(/\(mínimo (\d+)(?:\.00)?\)/, '(mínimo $$$1)').replace(/pagó (\d+(?:\.\d+)?)/, 'pagó $$$1');
  }).join(' · ');
};

/** Mensaje legible de cualquier error. */
export const errMsg = (e: unknown, fallback = 'Algo salió mal. Intenta de nuevo.'): string =>
  e instanceof Error && e.message ? e.message : fallback;
