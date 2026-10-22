// Resumen de la cuenta de prueba: tiendas, tipos de pago, artículos, webhooks y forma de un recibo.
import { lv } from './lv.mjs';

const stores = await lv('GET', '/stores');
console.log('TIENDAS', stores.stores.map((s) => ({ id: s.id, name: s.name })));
const pt = await lv('GET', '/payment_types');
console.log('PAGOS', pt.payment_types.map((p) => ({ id: p.id, name: p.name, type: p.type })));
const items = await lv('GET', '/items?limit=5');
console.log('ARTICULOS', items.items.map((i) => ({ name: i.item_name, variants: i.variants.map((v) => ({ id: v.variant_id, price: v.stores?.[0]?.price ?? v.default_price })) })));
const wh = await lv('GET', '/webhooks');
console.log('WEBHOOKS', wh.webhooks ?? wh);
const rc = await lv('GET', '/receipts?limit=1');
const r = rc.receipts?.[0];
console.log('RECIBOS (total en esta página):', rc.receipts?.length ?? 0);
if (r) {
  console.log('LLAVES RECIBO', Object.keys(r).join(', '));
  console.log('EJEMPLO', JSON.stringify({ receipt_number: r.receipt_number, receipt_type: r.receipt_type, note: r.note, receipt_date: r.receipt_date, total_money: r.total_money, total_discounts: r.total_discounts, line0: r.line_items?.[0] && { line_note: r.line_items[0].line_note, line_discounts: r.line_items[0].line_discounts, keys: Object.keys(r.line_items[0]) } }, null, 1));
}
