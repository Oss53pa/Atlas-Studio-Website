/**
 * Edge Function: resend-webhook
 *
 * CDC v2.1 — Lot L8. Reçoit les événements de délivrance Resend (Svix) et met à
 * jour `message_deliveries` : remis / ouvert / cliqué / rebond / plainte.
 * C'est la source de la « preuve d'envoi » (Partie 15.2).
 *
 * Configurer côté Resend : Webhook -> {SUPABASE_URL}/functions/v1/resend-webhook,
 * secret dans RESEND_WEBHOOK_SECRET (whsec_...).
 */
import { supabaseAdmin } from "../_shared/supabase.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function verifySvix(secret: string, id: string, ts: string, body: string, sigHeader: string): Promise<boolean> {
  try {
    const key = b64ToBytes(secret.replace(/^whsec_/, ""));
    const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signed = new TextEncoder().encode(`${id}.${ts}.${body}`);
    const mac = await crypto.subtle.sign("HMAC", cryptoKey, signed);
    const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
    // sigHeader = "v1,<sig> v1,<sig2>..."
    return sigHeader.split(" ").some((p) => p.split(",")[1] === expected);
  } catch (_e) { return false; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.text();
    const secret = Deno.env.get("RESEND_WEBHOOK_SECRET");
    if (secret) {
      const ok = await verifySvix(
        secret, req.headers.get("svix-id") || "", req.headers.get("svix-timestamp") || "",
        body, req.headers.get("svix-signature") || "");
      if (!ok) return new Response(JSON.stringify({ error: "signature invalide" }), { status: 401, headers: cors });
    } else {
      console.warn("[resend-webhook] RESEND_WEBHOOK_SECRET absent — signature non vérifiée");
    }

    const evt = JSON.parse(body);
    const type: string = evt.type || "";
    const emailId: string | undefined = evt.data?.email_id || evt.data?.id;
    if (!emailId) return new Response(JSON.stringify({ received: true, skipped: "no email_id" }), { headers: cors });

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = {};
    switch (type) {
      case "email.sent":             patch.statut = "envoye"; patch.envoye_le = now; break;
      case "email.delivered":        patch.statut = "remis"; patch.remis_le = now; break;
      case "email.opened":           patch.statut = "ouvert"; patch.ouvert_le = now; break;
      case "email.clicked":          patch.statut = "clique"; patch.clique_le = now; break;
      case "email.bounced":          patch.statut = "rebond_dur"; patch.erreur = JSON.stringify(evt.data?.bounce || evt.data || {}); break;
      case "email.delivery_delayed": patch.erreur = "delivery_delayed"; break;
      case "email.complained":       patch.statut = "plainte"; break;
      default: return new Response(JSON.stringify({ received: true, ignored: type }), { headers: cors });
    }

    // Ne pas rétrograder un statut plus avancé (ouvert/cliqué) sur un simple "remis".
    const rank: Record<string, number> = { en_attente:0, envoye:1, remis:2, ouvert:3, clique:4 };
    const { data: current } = await supabaseAdmin.from("message_deliveries")
      .select("statut").eq("provider_message_id", emailId).maybeSingle();
    if (current && patch.statut && (rank[patch.statut as string] ?? 9) < (rank[current.statut] ?? 0)
        && !["rebond_dur","plainte"].includes(patch.statut as string)) {
      delete patch.statut; // garde le statut plus avancé, mais applique quand même le timestamp
    }

    const { error } = await supabaseAdmin.from("message_deliveries").update(patch).eq("provider_message_id", emailId);
    if (error) console.error("[resend-webhook] update", error);
    return new Response(JSON.stringify({ received: true, type, emailId }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("resend-webhook error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: cors });
  }
});
