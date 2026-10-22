// Prueba la función de Supabase y registra el webhook en la cuenta de PRUEBA de Loyverse.
// Uso: node webhook.mjs probar   |   node webhook.mjs registrar   |   node webhook.mjs ver
import { readFileSync } from 'node:fs';
import { lv } from './lv.mjs';

const env = Object.fromEntries(readFileSync(new URL('./.env', import.meta.url), 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
export const FN = 'https://xddzafjkmtxgwqmrcdwg.supabase.co/functions/v1/loyverse-webhook';
const withKey = `${FN}?key=${env.WEBHOOK_KEY}`;

const post = async (url, body) => { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return `${r.status} ${await r.text()}`; };

const cmd = process.argv[2] ?? 'probar';
if (cmd === 'probar') {
  console.log('sin clave      →', await post(FN, { receipts: [] }));
  console.log('clave falsa    →', await post(`${FN}?key=falsa`, { receipts: [] }));
  console.log('clave correcta →', await post(withKey, { receipts: [] }));
} else if (cmd === 'registrar') {
  const { webhooks = [] } = await lv('GET', '/webhooks');
  const ya = webhooks.find((w) => w.url.startsWith(FN) && w.type === 'receipts.update');
  if (ya) console.log('Ya existe el webhook', ya.id, ya.status);
  else console.log('Creado', (await lv('POST', '/webhooks', { url: withKey, type: 'receipts.update', status: 'ENABLED' })).id);
} else if (cmd === 'ver') {
  const { webhooks = [] } = await lv('GET', '/webhooks');
  console.log(webhooks.map((w) => ({ id: w.id, type: w.type, status: w.status, url: w.url.replace(/key=.*/, 'key=***') })));
}
