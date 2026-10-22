// Recibe el webhook receipts.update de Loyverse y lo pasa a la base de datos.
// Autenticación propia: clave secreta en ?key= (se compara por hash dentro de la base de datos).
// Extra para el script de pruebas: body { check: { numbers: [...], code } } devuelve el estado.
// Desplegada en Supabase (sano_bistro) con verify_jwt = false.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: true, service: "loyverse-webhook" });

  const key = new URL(req.url).searchParams.get("key") ?? "";
  if (!key) return json({ error: "unauthorized" }, 401);

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }

  const check = payload.check as { numbers?: string[]; code?: string } | undefined;
  const { data, error } = check
    ? await sb.rpc("loyverse_check", { p_key: key, p_numbers: check.numbers ?? [], p_code: check.code ?? null })
    : await sb.rpc("loyverse_ingest", { p_key: key, p_payload: payload });

  if (error) {
    if (error.code === "28000" || /invalid_key/.test(error.message)) return json({ error: "unauthorized" }, 401);
    console.error("rpc", error.message);
    return json({ error: "server_error" }, 500); // Loyverse reintenta
  }
  if (!check) console.log("procesados", JSON.stringify(data));
  return json({ ok: true, results: data });
});
