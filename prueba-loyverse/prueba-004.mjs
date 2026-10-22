// Prueba real de la tarjeta básica (spec 004) en la cuenta de PRUEBA de Loyverse "Codia".
// Uso:
//   node prueba-004.mjs preparar                 → crea productos, categoría "Promociones (prueba)" y los 3 descuentos de cupón
//   node prueba-004.mjs venta C-0000 FECHA "Producto[:desc]" ["Producto[:desc]" ...]
//        FECHA = AAAA-MM-DD (se registra a las 12:00 de Progreso) o "hoy"
//        desc  = bebida | panaderia | coldfoam  (descuento del cupón aplicado a ESE producto)
import { lv } from './lv.mjs';

const PRODUCTOS = { 'Bebida 65 (prueba)': 65, 'Snack 64 (prueba)': 64, 'Comida 200 (prueba)': 200, 'Comida 250 (prueba)': 250, 'Paquete 220 (prueba)': 220 };
const DESCUENTOS = { bebida: 'Cupón bebida gratis (prueba)', panaderia: 'Cupón panadería gratis (prueba)', coldfoam: 'Cupón cold foam gratis (prueba)' };

const { stores } = await lv('GET', '/stores');
const store = stores[0].id;

async function preparar() {
  const { categories = [] } = await lv('GET', '/categories?limit=250');
  let cat = categories.find((c) => c.name === 'Promociones (prueba)');
  if (!cat) cat = await lv('POST', '/categories', { name: 'Promociones (prueba)', color: 'ORANGE' });
  const { items = [] } = await lv('GET', '/items?limit=250');
  for (const [nombre, precio] of Object.entries(PRODUCTOS)) {
    if (items.some((i) => i.item_name === nombre)) { console.log('ya existe', nombre); continue; }
    const body = { item_name: nombre, variants: [{ default_pricing_type: 'FIXED', default_price: precio, stores: [{ store_id: store, pricing_type: 'FIXED', price: precio, available_for_sale: true }] }] };
    if (nombre.startsWith('Paquete')) body.category_id = cat.id;
    await lv('POST', '/items', body);
    console.log('creado', nombre);
  }
  const { discounts = [] } = await lv('GET', '/discounts');
  for (const nombre of Object.values(DESCUENTOS)) {
    if (discounts.some((d) => d.name === nombre)) { console.log('ya existe', nombre); continue; }
    await lv('POST', '/discounts', { name: nombre, type: 'FIXED_PERCENT', discount_percent: 100, stores: [store], restricted_access: false });
    console.log('creado', nombre);
  }
}

async function venta(codigo, fecha, lineas) {
  const { items = [] } = await lv('GET', '/items?limit=250');
  const { discounts = [] } = await lv('GET', '/discounts');
  const { payment_types } = await lv('GET', '/payment_types');
  const cash = payment_types.find((p) => p.type === 'CASH') ?? payment_types[0];
  let total = 0;
  const line_items = lineas.map((l) => {
    const [nombre, desc] = l.split(':');
    const it = items.find((i) => i.item_name === nombre);
    if (!it) throw new Error(`No existe el producto ${nombre}`);
    const precio = PRODUCTOS[nombre];
    const li = { variant_id: it.variants[0].variant_id, quantity: 1, price: precio };
    if (desc) {
      const d = discounts.find((x) => x.name === DESCUENTOS[desc]);
      if (!d) throw new Error(`No existe el descuento ${desc}`);
      li.line_discounts = [{ id: d.id }];
    } else total += precio;
    return li;
  });
  const receipt_date = fecha === 'hoy' ? undefined : new Date(`${fecha}T12:00:00-06:00`).toISOString();
  const r = await lv('POST', '/receipts', { store_id: store, note: codigo, receipt_date, line_items, payments: [{ payment_type_id: cash.id, money_amount: total }] });
  console.log(JSON.stringify({ ticket: r.receipt_number, fecha: r.receipt_date, total: r.total_money, descuentos: (r.line_items ?? []).flatMap((x) => (x.line_discounts ?? []).map((d) => d.name)) }));
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'preparar') await preparar();
else if (cmd === 'venta') await venta(args[0], args[1], args.slice(2));
else console.log('Uso: node prueba-004.mjs preparar | venta C-0000 AAAA-MM-DD "Producto[:desc]" ...');
