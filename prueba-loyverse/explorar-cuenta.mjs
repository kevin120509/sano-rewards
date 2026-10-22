// Resumen de la cuenta de Loyverse configurada en .env (sin mostrar claves).
import { lv } from './lv.mjs';
const out = {};
const s = await lv('GET', '/stores'); out.tiendas = s.stores.map((x) => ({ id: x.id, nombre: x.name }));
const d = await lv('GET', '/discounts'); out.descuentos = d.discounts.map((x) => ({ id: x.id, nombre: x.name, tipo: x.type, valor: x.discount_amount ?? x.discount_percent, restringido: x.restricted_access }));
const i = await lv('GET', '/items?limit=10'); out.productos = i.items.slice(0, 5).map((x) => ({ nombre: x.item_name, precio: x.variants?.[0]?.default_price }));
out.total_productos_primera_pagina = i.items.length;
const p = await lv('GET', '/payment_types'); out.pagos = p.payment_types.map((x) => x.type + ':' + x.name);
const w = await lv('GET', '/webhooks'); out.webhooks = (w.webhooks ?? []).map((x) => ({ tipo: x.type, estado: x.status, host: new URL(x.url).host }));
const r = await lv('GET', '/receipts?limit=3'); out.ultimas_ventas = (r.receipts ?? []).map((x) => ({ n: x.receipt_number, fecha: x.created_at }));
const m = await lv('GET', '/merchant').catch(() => null); out.negocio = m ? { nombre: m.business_name, pais: m.country, moneda: m.currency?.code } : null;
console.log(JSON.stringify(out, null, 1));
