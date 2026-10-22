// "El sistema pide": trae de Loyverse las ventas actualizadas desde hace N minutos y las manda a la función de Supabase.
// Uso: node sincronizar.mjs [minutos=10]
import { readFileSync } from 'node:fs';
import { lv } from './lv.mjs';
import { FN } from './webhook.mjs';

const env = Object.fromEntries(readFileSync(new URL('./.env', import.meta.url), 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const minutos = Number(process.argv[2] ?? 10);
const desde = new Date(Date.now() - minutos * 60000).toISOString();
const t0 = Date.now();
const { receipts = [] } = await lv('GET', `/receipts?updated_at_min=${encodeURIComponent(desde)}&limit=250`);
const t1 = Date.now();
const res = await fetch(`${FN}?key=${encodeURIComponent(env.WEBHOOK_KEY)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ receipts }) });
const out = await res.json();
const t2 = Date.now();
console.log(JSON.stringify({ desde, ventas_traidas: receipts.map((r) => r.receipt_number), ms_loyverse: t1 - t0, ms_supabase: t2 - t1, respuesta: res.status, resultados: out.results }));
