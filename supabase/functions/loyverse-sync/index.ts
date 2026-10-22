// "El sistema pregunta": pg_cron la llama cada minuto. Trae de Loyverse los tickets actualizados desde el último
// que ya tenemos y los procesa igual que el webhook (idempotente: un ticket repetido no suma doble).
// Cada 5 minutos (o con ?catalogo=1) también actualiza descuentos, categorías y productos (spec 004: los paquetes/promos
// se reconocen por su categoría). El catálogo se actualiza ANTES de procesar tickets.
// Auth: header x-sync-secret (secreto en Vault, lo compara la base de datos). verify_jwt = false.
// El token de Loyverse vive en Vault ('loyverse_token'); no está en el código.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const unauthorized = (e: { code?: string; message: string }) => e.code === "28000" || /invalid_key/.test(e.message);

/** Trae todas las páginas de un recurso de Loyverse (máx. 2000 registros). */
async function fetchAll(token: string, path: string, key: string, params: Record<string, string> = {}): Promise<unknown[] | null> {
  const out: unknown[] = [];
  let cursor: string | undefined;
  do {
    const url = new URL(`https://api.loyverse.com/v1.0/${path}`);
    url.searchParams.set("limit", "250");
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    if (cursor) url.searchParams.set("cursor", cursor);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const page = await res.json();
    out.push(...(page[key] ?? []));
    cursor = page.cursor ?? undefined;
  } while (cursor && out.length < 2000);
  return out;
}

Deno.serve(async (req) => {
  const secret = req.headers.get("x-sync-secret") ?? "";
  if (!secret) return json({ error: "unauthorized" }, 401);

  const { data: cfg, error: e1 } = await sb.rpc("loyverse_sync_config", { p_secret: secret });
  if (e1) return unauthorized(e1) ? json({ error: "unauthorized" }, 401) : json({ error: "config", detail: e1.message }, 500);
  if (!cfg?.token) return json({ error: "sin_token" }, 500);

  const params = new URL(req.url).searchParams;
  let catalog: Record<string, unknown> | null = null;
  if (new Date().getUTCMinutes() % 5 === 0 || params.has("catalogo") || params.has("descuentos")) {
    catalog = {};
    const discounts = await fetchAll(cfg.token, "discounts", "discounts");
    if (discounts) catalog.discounts = (await sb.rpc("loyverse_sync_discounts", { p_secret: secret, p_discounts: discounts })).data;
    const categories = await fetchAll(cfg.token, "categories", "categories");
    const items = await fetchAll(cfg.token, "items", "items");
    if (categories || items) {
      const lean = items?.map((i) => {
        const it = i as Record<string, unknown>;
        return { id: it.id, item_name: it.item_name, category_id: it.category_id, deleted_at: it.deleted_at };
      }) ?? null;
      catalog.catalog = (await sb.rpc("loyverse_sync_catalog", { p_secret: secret, p_categories: categories, p_items: lean })).data;
    }
  }

  // Desde el último ticket que tenemos (menos 2 min por si llegan desordenados); máximo 24 h hacia atrás.
  const floor = Date.now() - 24 * 3600_000;
  const base = cfg.since ? new Date(cfg.since).getTime() - 2 * 60_000 : Date.now() - 60 * 60_000;
  const since = new Date(Math.max(base, floor)).toISOString();

  const receipts = await fetchAll(cfg.token, "receipts", "receipts", { updated_at_min: since });
  if (!receipts) return json({ error: "loyverse_receipts" }, 502);
  if (!receipts.length) return json({ ok: true, since, count: 0, catalog });

  const { data, error: e2 } = await sb.rpc("loyverse_sync_ingest", { p_secret: secret, p_payload: { receipts } });
  if (e2) return json({ error: "ingest", detail: e2.message }, 500);
  console.log("sync", since, JSON.stringify(data));
  return json({ ok: true, since, count: receipts.length, results: data, catalog });
});
