// Prueba de tiempo: crea UNA venta en Loyverse (cuenta de PRUEBA) y muestra la hora exacta.
// Uso: node prueba-tiempo.mjs "C-8571" [id_descuento|-] [fecha ISO]
import { lv } from './lv.mjs';
import { venta } from './venta.mjs';

const [nota = "C-8571", desc, fecha] = process.argv.slice(2); const descuento = desc && desc !== "-" ? desc : null;
const { webhooks } = await lv('GET', '/webhooks');
for (const w of webhooks ?? []) console.log('Webhook:', w.type, '·', w.status, '· apunta a', new URL(w.url).host); // sin mostrar la clave
const t0 = new Date();
const r = await venta({ note: nota, discount: descuento ? { id: descuento, pct: 50 } : null, date: fecha ?? null });
const t1 = new Date();
console.log(JSON.stringify({ receipt_number: r.receipt_number, enviado: t0.toISOString(), respuesta_api: t1.toISOString(), receipt_date: r.receipt_date, created_at: r.created_at, total: r.total_money, descuentos: (r.total_discounts ?? []).map((d) => d.name) }));
