// Cambia la clave del webhook: genera una nueva, la guarda en .env (sin mostrarla), borra y vuelve a registrar
// el webhook de la cuenta actual con la clave nueva, y muestra SOLO el hash para guardarlo en Supabase.
import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes, createHash } from 'node:crypto';
import { lv } from './lv.mjs';
import { FN } from './webhook.mjs';
const path = new URL('./.env', import.meta.url);
const key = randomBytes(24).toString('hex');
const lines = readFileSync(path, 'utf8').split(/\r?\n/).filter((l) => !l.startsWith('WEBHOOK_KEY='));
lines.push(`WEBHOOK_KEY=${key}`);
writeFileSync(path, lines.filter((l, i, a) => l || i < a.length - 1).join('\n') + '\n');
const { webhooks = [] } = await lv('GET', '/webhooks');
for (const w of webhooks.filter((w) => w.url.startsWith(FN))) { await lv('DELETE', `/webhooks/${w.id}`); console.log('webhook anterior borrado', w.id); }
const nuevo = await lv('POST', '/webhooks', { url: `${FN}?key=${key}`, type: 'receipts.update', status: 'ENABLED' });
console.log('webhook nuevo', nuevo.id, nuevo.status);
console.log('HASH', createHash('sha256').update(key, 'utf8').digest('hex'));
