// Cortex Data Fabric — ingestion d'événements business (COUCHE 1).
// Vérifie la signature HMAC-SHA256 par source (RG-09), insère de façon
// idempotente dans cps_events_raw (le trigger de normalisation met à jour
// cps_metrics_snapshot, publié en Realtime). Ne fait AUCUN calcul métier ici.
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const raw = await req.text();
  let evt: any;
  try { evt = JSON.parse(raw); } catch { return errorResponse("JSON invalide", 400); }

  const { source_app, event_type, occurred_at, payload, idempotency_key } = evt ?? {};
  if (!source_app || !event_type || !occurred_at || !idempotency_key) {
    return errorResponse("Champs requis manquants (source_app, event_type, occurred_at, idempotency_key)", 400);
  }

  const { data: src } = await supabaseAdmin
    .from("cps_data_sources").select("*").eq("source_app", source_app).maybeSingle();
  if (!src || src.status !== "active" || !src.hmac_secret) {
    return errorResponse("Source inconnue ou inactive", 401);
  }

  // RG-09 : signature obligatoire et valide
  const provided = req.headers.get("x-cortex-signature") ?? "";
  const expected = await hmacHex(src.hmac_secret, raw);
  if (!timingSafeEqual(provided, expected)) {
    await supabaseAdmin.from("cps_data_sources")
      .update({ reject_count: Number(src.reject_count ?? 0) + 1, last_reject_reason: "signature HMAC invalide" })
      .eq("id", src.id);
    return errorResponse("Signature HMAC invalide", 401);
  }

  // Idempotence (RG-09) : idempotency_key unique
  const { error } = await supabaseAdmin.from("cps_events_raw").insert({
    source_app, event_type, occurred_at, payload: payload ?? {}, idempotency_key,
  });
  if (error) {
    if ((error as any).code === "23505") return jsonResponse({ ok: true, duplicate: true });
    return errorResponse("Ingestion échouée : " + error.message, 500);
  }

  await supabaseAdmin.from("cps_data_sources")
    .update({ last_seen_at: new Date().toISOString(), event_count: Number(src.event_count ?? 0) + 1, last_reject_reason: null })
    .eq("id", src.id);

  return jsonResponse({ ok: true });
});
