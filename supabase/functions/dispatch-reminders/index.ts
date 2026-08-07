/**
 * Edge Function: dispatch-reminders  (CDC v2.1 — Lot L10, Partie 13.2)
 *
 * Vide l'outbox des relances d'échéance (modele='echeance', statut='en_attente') :
 * rend l'email de rappel (ton selon le jalon) avec un LIEN DE PAIEMENT signé
 * (pay-link, sans login), l'envoie via Resend, écrit la preuve (corps_snapshot).
 *
 * Appelé par cron (service role) ou admin. Reprise 5 essais.
 */
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { requireAdmin } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const FROM = Deno.env.get("ACCESS_EMAIL_FROM") || "Atlas Studio <acces@atlas-studio.org>";
const SECRET = Deno.env.get("LICENCE_HMAC_SECRET") || Deno.env.get("JWT_SECRET") || "atlas-default-secret";
const MAX_TRIES = 5;

function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function signToken(payload: Record<string, unknown>): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(JSON.stringify(payload)));
  const json = JSON.stringify({ payload, sig: hex(mac) });
  return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

const TONE: Record<string, { titre: string; intro: (app: string, d: string) => string; urgent: boolean }> = {
  echeance_j30: { titre: "Votre abonnement arrive à échéance", urgent: false, intro: (a, d) => `Votre abonnement <strong>${a}</strong> arrive à échéance le ${d}. Vous pouvez le renouveler dès maintenant.` },
  echeance_j15: { titre: "Facture de renouvellement disponible", urgent: false, intro: (a, d) => `La facture de renouvellement de <strong>${a}</strong> (échéance ${d}) est disponible.` },
  echeance_j7: { titre: "Renouvellement — échéance dans 7 jours", urgent: false, intro: (a, d) => `Il reste 7 jours avant l'échéance de <strong>${a}</strong> (${d}).` },
  echeance_j1: { titre: "Renouvellement — échéance demain", urgent: true, intro: (a, d) => `Votre abonnement <strong>${a}</strong> arrive à échéance le ${d}. Réglez aujourd'hui pour éviter toute interruption.` },
  retard_j7: { titre: "Paiement en attente — accès bientôt suspendu", urgent: true, intro: (a, _d) => `Votre abonnement <strong>${a}</strong> est échu. Votre accès reste ouvert pendant la période de grâce, mais sera suspendu faute de règlement. Régularisez dès que possible.` },
};

function renderReminder(p: { app: string; montant: string; numero: string; dateFin: string; payUrl: string; evenement: string }): { html: string; text: string } {
  const F = "'Exo 2',Arial,sans-serif";
  const t = TONE[p.evenement] || TONE.echeance_j30;
  const accent = t.urgent ? "#B23A2E" : "#EF9F27";
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>@import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;600;700&family=Grand+Hotel&family=JetBrains+Mono&display=swap');</style></head>
<body style="margin:0;background:#FBF6EC;"><table role="presentation" width="100%" style="background:#FBF6EC;"><tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="540" style="width:540px;max-width:540px;background:#FFFDF8;border:1px solid #EFE7D6;border-radius:18px;overflow:hidden;">
<tr><td style="height:4px;background:${accent};font-size:4px;line-height:4px;">&nbsp;</td></tr>
<tr><td style="padding:30px 40px 0;"><div style="font-family:'Grand Hotel',cursive,${F};font-size:28px;color:#0A0A0A;">Atlas Studio</div></td></tr>
<tr><td style="padding:20px 40px 0;"><h1 style="margin:0;font-family:${F};font-size:21px;color:#0A0A0A;">${esc(t.titre)}</h1>
<p style="margin:12px 0 0;font-family:${F};font-size:15px;color:#4A473F;line-height:1.6;">${t.intro(esc(p.app), esc(p.dateFin))}</p></td></tr>
<tr><td style="padding:16px 40px 0;"><table role="presentation" width="100%" style="background:#FBF6EC;border-radius:12px;"><tr><td style="padding:14px 18px;font-family:'JetBrains Mono',monospace;font-size:13px;color:#5A574E;">
Montant : <b>${esc(p.montant)} FCFA</b><br/>Référence : <b>${esc(p.numero)}</b>${p.dateFin ? `<br/>Échéance : <b>${esc(p.dateFin)}</b>` : ""}</td></tr></table></td></tr>
<tr><td align="center" style="padding:22px 40px 8px;"><a href="${esc(p.payUrl)}" style="display:inline-block;padding:14px 34px;background:${accent};color:#fff;font-family:${F};font-weight:700;border-radius:12px;text-decoration:none;">Payer maintenant</a></td></tr>
<tr><td align="center" style="padding:0 40px 8px;"><span style="font-family:${F};font-size:12px;color:#8A867A;">Aucune connexion requise. Lien valable jusqu'à la résiliation.</span></td></tr>
<tr><td align="center" style="padding:24px 40px 36px;border-top:1px solid #EFE7D6;"><p style="margin:14px 0 0;font-family:${F};font-size:11px;color:#B8B4A8;">Atlas Studio · atlas-studio.org · acces@atlas-studio.org</p></td></tr>
</table></td></tr></table></body></html>`;
  const text = `${t.titre}\n\n${p.app} — ${p.montant} FCFA (réf ${p.numero}${p.dateFin ? `, échéance ${p.dateFin}` : ""})\nPayer : ${p.payUrl}\n`;
  return { html, text };
}

async function sendResend(to: string, subject: string, html: string, text: string): Promise<string | null> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) { console.warn("[reminders] RESEND_API_KEY absent"); return null; }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, text }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return (await res.json()).id ?? null;
}

async function processOne(msg: Record<string, any>): Promise<void> {
  const { data: sub } = await supabaseAdmin.from("subscriptions")
    .select("id, numero, app_id, price_at_subscription, date_fin, tenant_id").eq("id", msg.subscription_id).single();
  if (!sub) throw new Error("abonnement introuvable");
  const { data: tenant } = await supabaseAdmin.from("tenants").select("billing_email").eq("id", sub.tenant_id).single();
  if (!tenant?.billing_email) throw new Error("email introuvable");
  const { data: app } = await supabaseAdmin.from("apps").select("name").eq("id", sub.app_id).single();

  const amount = Number(sub.price_at_subscription ?? 0);
  const exp = Date.now() + 90 * 86400000; // valable 90 j
  const token = await signToken({ sub: sub.id, amt: amount, ref: sub.numero, exp });
  const payUrl = `${SUPABASE_URL}/functions/v1/pay-link?token=${encodeURIComponent(token)}`;
  const dateFin = sub.date_fin ? new Date(sub.date_fin).toLocaleDateString("fr-FR") : "";

  const { html, text } = renderReminder({
    app: app?.name || sub.app_id, montant: amount.toLocaleString("fr-FR"),
    numero: sub.numero || sub.id.slice(0, 8), dateFin, payUrl, evenement: msg.evenement,
  });
  const subject = (TONE[msg.evenement]?.titre || "Rappel Atlas Studio") + ` — ${app?.name || sub.app_id}`;
  const providerId = await sendResend(tenant.billing_email, subject, html, text);

  await supabaseAdmin.from("message_deliveries").update({
    statut: "envoye", provider: "resend", provider_message_id: providerId,
    sujet: subject, corps_snapshot: html, envoye_le: new Date().toISOString(), destinataire: tenant.billing_email,
  }).eq("id", msg.id);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const bearer = (req.headers.get("authorization") || "").replace("Bearer ", "");
    const isService = bearer && bearer === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!isService) await requireAdmin(req);

    const url = new URL(req.url);
    const onlyId = url.searchParams.get("id");
    let q;
    if (onlyId) q = supabaseAdmin.from("message_deliveries").select("*").eq("id", onlyId).limit(1);
    else q = supabaseAdmin.from("message_deliveries").select("*").eq("modele", "echeance").eq("statut", "en_attente").lt("tentatives", MAX_TRIES).limit(50);
    const { data: pending, error } = await q;
    if (error) throw error;

    let sent = 0; const failures: string[] = [];
    for (const msg of pending ?? []) {
      try { await processOne(msg); sent++; }
      catch (e) {
        const tries = (msg.tentatives ?? 0) + 1;
        await supabaseAdmin.from("message_deliveries").update({ tentatives: tries, erreur: (e as Error).message, statut: tries >= MAX_TRIES ? "echec" : "en_attente" }).eq("id", msg.id);
        failures.push(`${msg.id}: ${(e as Error).message}`);
      }
    }
    return jsonResponse({ processed: (pending ?? []).length, sent, failures });
  } catch (e: any) {
    if (e.status) return errorResponse(e.message, e.status);
    return errorResponse(e.message || "Erreur");
  }
});
