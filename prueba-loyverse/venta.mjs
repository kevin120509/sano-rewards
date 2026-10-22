// Crea UNA venta de prueba en Loyverse (cuenta de PRUEBA). Uso:
//   node venta.mjs "nota del ticket" [nota_producto] [id_descuento] [fecha ISO]
import { lv } from './lv.mjs';

let ctx;
export async function contexto() {
  if (ctx) return ctx;
  const { stores } = await lv('GET', '/stores');
  const { payment_types } = await lv('GET', '/payment_types');
  const { items } = await lv('GET', '/items?limit=50');
  const store = stores[0];
  const cash = payment_types.find((p) => p.type === 'CASH') ?? payment_types[0];
  let variant, price;
  for (const it of items) for (const v of it.variants) {
    const p = v.stores?.find((s) => s.store_id === store.id)?.price ?? v.default_price;
    if (!variant && p > 0) { variant = v.variant_id; price = p; }
  }
  if (!variant) throw new Error('No encontré un producto con precio en la cuenta de prueba');
  ctx = { store: store.id, cash: cash.id, variant, price };
  return ctx;
}

/** Venta con la nota del ticket, nota del producto, un descuento opcional (% a nivel ticket) y fecha opcional. */
export async function venta({ note = null, lineNote = null, discount = null, date = null } = {}) {
  const c = await contexto();
  const pct = discount?.pct ?? 0;
  const total = Math.round(c.price * (1 - pct / 100) * 100) / 100;
  const body = {
    store_id: c.store,
    note: note ?? undefined,
    receipt_date: date ?? undefined,
    line_items: [{ variant_id: c.variant, quantity: 1, price: c.price, line_note: lineNote ?? undefined }],
    total_discounts: discount ? [{ id: discount.id, scope: 'RECEIPT' }] : undefined, // Loyverse toma el % del descuento existente
    payments: [{ payment_type_id: c.cash, money_amount: total }],
  };
  return lv('POST', '/receipts', body);
}

if (process.argv[1]?.endsWith('venta.mjs')) {
  const [note, lineNote, discountId, date] = process.argv.slice(2);
  const r = await venta({ note, lineNote, discount: discountId ? { id: discountId, pct: 100 } : null, date });
  console.log('Venta creada', r.receipt_number, r.receipt_date, 'total', r.total_money);
}
