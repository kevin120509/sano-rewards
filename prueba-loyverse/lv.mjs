// Cliente mínimo de la API de Loyverse (cuenta de PRUEBA). Lee el token de .env sin mostrarlo.
// Uso: node lv.mjs GET /stores      |  node lv.mjs POST /webhooks archivo.json
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(here, '.env'), 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const TOKEN = env.LOYVERSE_TOKEN;
if (!TOKEN) { console.error('Falta LOYVERSE_TOKEN en .env'); process.exit(1); }

export async function lv(method, path, body) {
  const res = await fetch(`https://api.loyverse.com/v1.0${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  return data;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [method = 'GET', path = '/stores', file] = process.argv.slice(2);
  const body = file ? JSON.parse(readFileSync(file, 'utf8')) : undefined;
  lv(method, path, body).then((d) => console.log(JSON.stringify(d, null, 1))).catch((e) => { console.error(e.message); process.exit(1); });
}
