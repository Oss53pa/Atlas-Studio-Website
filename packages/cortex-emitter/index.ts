// @atlas/cortex-emitter — micro-SDK à embarquer dans chaque app Atlas.
// Pousse un événement business standardisé, signé HMAC-SHA256, vers
// l'Edge Function cortex-ingest de CADMIN. Fonctionne en navigateur, Deno
// et Node ≥ 18 (Web Crypto). Aucune dépendance.
//
// Usage :
//   const emit = createCortexEmitter({
//     ingestUrl: "https://<projet>.supabase.co/functions/v1/cortex-ingest",
//     sourceApp: "atlas_fna",
//     secret: process.env.CORTEX_SECRET!,   // secret HMAC de la source
//   });
//   await emit("subscription_started", { plan_code: "FNA_PRO", amount_fcfa: 45000, period: "monthly", tenant_ref: hash });

export type CortexEventType =
  | "signup" | "trial_started" | "subscription_started" | "subscription_renewed"
  | "subscription_cancelled" | "payment_received" | "payment_failed"
  | "active_usage_ping" | "support_ticket_opened";

export interface CortexEmitterOptions {
  ingestUrl: string;
  sourceApp: string;
  secret: string;
  /** Clé anonyme Supabase (en-tête Authorization requis par les Edge Functions). */
  anonKey?: string;
}

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function createCortexEmitter(opts: CortexEmitterOptions) {
  return async function emit(
    eventType: CortexEventType,
    payload: Record<string, unknown> = {},
    idempotencyKey?: string,
  ): Promise<{ ok: boolean; status: number }> {
    const body = JSON.stringify({
      source_app: opts.sourceApp,
      event_type: eventType,
      occurred_at: new Date().toISOString(),
      payload,
      idempotency_key: idempotencyKey ?? crypto.randomUUID(),
    });
    const signature = await hmacHex(opts.secret, body);
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-cortex-signature": signature,
    };
    if (opts.anonKey) headers["authorization"] = `Bearer ${opts.anonKey}`;
    const res = await fetch(opts.ingestUrl, { method: "POST", headers, body });
    return { ok: res.ok, status: res.status };
  };
}
