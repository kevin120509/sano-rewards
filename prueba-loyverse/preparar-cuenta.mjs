// Deja lista una cuenta de PRUEBA de Loyverse vacía: 3 productos, 2 descuentos de premio y el webhook.
// Es seguro correrlo dos veces: no duplica lo que ya existe (busca por nombre).
import { lv } from './lv.mjs';
const { stores } = await lv('GET', '/stores');
const store = stores[0].id;

const PRODUCTOS = [['Café americano (prueba)', 45], ['Latte (prueba)', 60], ['Sándwich de jamón (prueba)', 75]];
const { items = [] } = await lv('GET', '/items?limit=250');
for (const [nombre, precio] of PRODUCTOS) {
  if (items.some((i) => i.item_name === nombre)) { console.log('ya existe', nombre); continue; }
  const it = await lv('POST', '/items', { item_name: nombre, variants: [{ default_pricing_type: 'FIXED', default_price: precio, stores: [{ store_id: store, pricing_type: 'FIXED', price: precio, available_for_sale: true }] }] });
  console.log('producto', it.item_name);
}

const DESCUENTOS = [['Premio Consentido: bebida gratis', 100], ['Premio Premium 2x1', 50]];
const { discounts = [] } = await lv('GET', '/discounts');
const ids = {};
for (const [nombre, pct] of DESCUENTOS) {
  let d = discounts.find((x) => x.name === nombre);
  if (!d) d = await lv('POST', '/discounts', { name: nombre, type: 'FIXED_PERCENT', discount_percent: pct, stores: [store], restricted_access: false });
  ids[nombre] = d.id; console.log('descuento', d.name, d.id, d.type, d.discount_percent);
}
console.log(JSON.stringify({ store, descuentos: ids }));
