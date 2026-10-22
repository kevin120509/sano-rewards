// Pruebas de punta a punta: ventas en Loyverse (PRUEBA) → webhook → Supabase → tarjeta del cliente.
// Uso: node e2e.mjs C-8571 A   (fase A: visitas, duplicados, código falso, descuento sin premio, devolución)
//      node e2e.mjs C-8571 B   (fase B, cliente en Premium meta 4: premio listo, canje y cancelación)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { venta } from './venta.mjs';
import { FN } from './webhook.mjs';

const env = Object.fromEntries(readFileSync(new URL('./.env', import.meta.url), 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const URL_FN = `${FN}?key=${env.WEBHOOK_KEY}`;
const [CODE = '', FASE = 'A', SOLO = ''] = process.argv.slice(2); // SOLO: correr un paso suelto, ej. A5
if (!/^[A-Z]{1,2}-\d{4}$/i.test(CODE)) { console.error('Uso: node e2e.mjs C-1234 A|B'); process.exit(1); }
const [PFX, NUM] = CODE.toUpperCase().split('-');

const DESC_GRATIS = { id: '2d8104ad-50d7-45c9-b5ef-7c73e7d3bcda', pct: 100 }; // premio Consentido
const DESC_2X1 = { id: '96f7358d-8fcd-44f7-8b79-d146349f733b', pct: 50 };     // premio Premium

// Día N del mes en curso, a las 12:00 de Mérida (UTC-6).
const ym = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Merida', year: 'numeric', month: '2-digit' }).format(new Date());
const day = (n, h = 12) => new Date(`${ym}-${String(n).padStart(2, '0')}T${String(h).padStart(2, '0')}:00:00-06:00`).toISOString();

const post = async (body) => { const r = await fetch(URL_FN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(`función ${r.status} ${await r.text()}`); return (await r.json()).results; };
const check = (numbers) => post({ check: { numbers, code: CODE } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function esperar(number) {
  for (let i = 0; i < 20; i++) {
    const s = await check([number]);
    if (s.receipts[number] && s.receipts[number].status !== 'pending') return s;
    await sleep(1500);
  }
  throw new Error(`El recibo ${number} no llegó a Supabase en 30 s (¿webhook activo?)`);
}

const filas = [];
const STATE = new URL('./e2e-estado.json', import.meta.url);
const estado = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : {};

async function paso(id, desc, accion, esperado) {
  if (SOLO && SOLO !== id) return;
  let ok = false, obtenido = '';
  try {
    const antes = (await check([])).card ?? {};
    const { number, s } = await accion();
    const r = s.receipts[number] ?? {};
    const c = s.card ?? {};
    obtenido = `${r.status}/${r.reason} · visitas ${c.visits}/${c.goal} · listos ${c.ready} · canjeados ${c.redeemed}${s.misuse.length ? ' · ALERTA descuento' : ''}`;
    // dv = cambio esperado en visitas respecto a antes del paso (permite repetir pasos sueltos)
    ok = Object.entries(esperado).every(([k, v]) => ({ status: r.status, reason: r.reason, visits: c.visits, dv: c.visits - antes.visits, goal: c.goal, ready: c.ready, redeemed: c.redeemed, misuse: s.misuse.includes(number) })[k] === v);
  } catch (e) { obtenido = `ERROR ${e.message}`; }
  filas.push({ paso: id, caso: desc, resultado: ok ? 'PASÓ' : 'FALLÓ', obtenido });
  console.log(`${ok ? '✔' : '✘'} ${id} ${desc}\n    ${obtenido}`);
}

const real = (opts) => async () => { const rc = await venta(opts); const s = await esperar(rc.receipt_number); return { number: rc.receipt_number, s, rc }; };
const sintetico = (receipt) => async () => { await post({ receipts: [receipt] }); const s = await check([receipt.receipt_number]); return { number: receipt.receipt_number, s }; };

if (FASE === 'A') {
  let a3;
  let a5;
  await paso('A1', 'Venta con código en la nota del ticket (día 1)', real({ note: `${PFX}-${NUM}`, date: day(1) }), { status: 'processed', reason: 'visit', dv: 1 });
  await paso('A2', 'Segunda venta el mismo día (código en nota del producto)', real({ lineNote: `${PFX}-${NUM}`, date: day(1, 17) }), { status: 'processed', reason: 'already_visited_today', dv: 0 });
  await paso('A3', 'Código en minúsculas y con espacio "c 8571" (día 2)', async () => { const x = await real({ lineNote: `${PFX.toLowerCase()} ${NUM}`, date: day(2) })(); a3 = x.rc; return x; }, { status: 'processed', reason: 'visit', dv: 1 });
  await paso('A4', 'Código que no existe (día 2)', real({ note: `${PFX}-0000`, date: day(2, 15) }), { status: 'ignored', reason: 'no_customer_code', dv: 0 });
  await paso('A5', 'Descuento de premio SIN tener premio (día 3) → alerta', async () => { const x = await real({ note: `${PFX}-${NUM}`, discount: DESC_GRATIS, date: day(3) })(); a5 = x.rc; return x; }, { status: 'processed', reason: 'visit', dv: 1, misuse: true });
  await paso('A6', 'Devolución de una venta con visita (simulada) → se anula', sintetico({ receipt_number: `TEST-DEV-${Date.now()}`, receipt_type: 'REFUND', refund_for: (a3 ?? a5)?.receipt_number, receipt_date: new Date().toISOString(), total_money: -((a3 ?? a5)?.total_money ?? 0), line_items: [] }), { status: 'processed', reason: 'refund', dv: -1 });
} else {
  let b3;
  await paso('B1', 'Premium: visita (día 4)', real({ note: `${PFX}-${NUM}`, date: day(4) }), { status: 'processed', reason: 'visit', visits: 3, goal: 4 });
  await paso('B2', 'Premium: visita 4 de 4 → premio listo (día 5)', real({ note: `${PFX}-${NUM}`, date: day(5) }), { status: 'processed', reason: 'visit', visits: 0, goal: 4, ready: 1 });
  await paso('B3', 'Canje con el descuento 2x1 (día 6) → canjeado y cuenta visita', async () => { const x = await real({ note: `${PFX}-${NUM}`, discount: DESC_2X1, date: day(6, 10) })(); b3 = x.rc; return x; }, { status: 'processed', reason: 'visit_and_redeem', visits: 1, ready: 0, redeemed: 1 });
  await paso('B4', 'Se cancela la venta del canje (simulada) → premio vuelve a estar listo', sintetico({ ...b3, cancelled_at: new Date().toISOString() }), { status: 'processed', reason: 'cancelled', visits: 0, ready: 1, redeemed: 0 });
}

estado[FASE] = { fecha: new Date().toISOString(), filas };
writeFileSync(STATE, JSON.stringify(estado, null, 1));
const fallos = filas.filter((f) => f.resultado !== 'PASÓ').length;
console.log(`\nFase ${FASE}: ${filas.length - fallos}/${filas.length} pasaron.`);
process.exit(fallos ? 1 : 0);
