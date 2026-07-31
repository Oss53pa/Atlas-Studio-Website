/**
 * Edge Function: dispatch-access-messages
 *
 * CDC v2.1 — Lot L6. Vide l'outbox `message_deliveries` (canal email, modèle
 * `acces_accorde`, statut `en_attente`) : reconstruit le contenu depuis
 * l'abonnement (apps, plans, sièges, échéance, n° abonnement), rend l'email
 * d'accès multi-apps à la charte, l'envoie via Resend, puis met à jour la ligne
 * (statut, provider_message_id, corps_snapshot = pièce probante).
 *
 * GÉNÉRIQUE : aucune application codée en dur — tout est lu depuis `apps`.
 * Aucune clé/jeton produit ailleurs qu'ici (Principe 5).
 *
 * Appelé par CADMIN (« Envoyer/Renvoyer », admin) ou par un cron (service role).
 * Politique de reprise : 5 tentatives, puis statut `echec`.
 */
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { requireAdmin } from "../_shared/auth.ts";

const SITE_URL = Deno.env.get("SITE_URL") || "https://atlas-studio.org";
const ACCESS_FROM = Deno.env.get("ACCESS_EMAIL_FROM") || "Atlas Studio <acces@atlas-studio.org>";
const MAX_TRIES = 5;

function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

interface AppBlock { name: string; url: string; plan: string; seats: number; status: string; }

function renderAccessEmail(p: {
  tenantName: string; numero: string; nature: string; expiry: string | null;
  codeClient: string; apps: AppBlock[]; passwordUrl: string | null; portalUrl: string;
}): { html: string; text: string } {
  const F = "'Exo 2','Segoe UI',Arial,sans-serif";
  const GOLD = "#EF9F27", ONYX = "#0A0A0A";
  const natureLabel: Record<string, string> = {
    payant: "Abonnement", essai: "Essai gratuit", offert: "Accès offert", interne: "Accès interne", partenaire: "Partenaire",
  };
  const appRows = p.apps.map((a) => `
    <tr><td style="padding:14px 0;border-bottom:1px solid #EFE7D6;">
      <div style="font-family:'Grand Hotel',cursive,${F};font-size:22px;color:${ONYX};line-height:1;">${esc(a.name)}</div>
      <div style="font-family:${F};font-size:13px;color:#7A7568;margin:4px 0 10px;">Plan ${esc(a.plan || "—")} · ${a.seats} siège${a.seats > 1 ? "s" : ""}${a.status !== "available" && a.status !== "production" ? ' · <span style="color:#B26A00;">en construction</span>' : ""}</div>
      <a href="${esc(a.url)}" style="display:inline-block;padding:9px 20px;background:${ONYX};color:#fff;font-family:${F};font-size:13px;font-weight:600;border-radius:8px;text-decoration:none;">Ouvrir ${esc(a.name)} →</a>
    </td></tr>`).join("");

  const pwBlock = p.passwordUrl ? `
    <tr><td align="center" style="padding:8px 40px 4px;">
      <a href="${esc(p.passwordUrl)}" style="display:inline-block;padding:14px 34px;background:${GOLD};color:${ONYX};font-family:${F};font-size:16px;font-weight:700;border-radius:12px;text-decoration:none;">Définir mon mot de passe</a>
    </td></tr>
    <tr><td align="center" style="padding:0 40px 8px;"><span style="font-family:${F};font-size:12px;color:#8A867A;">Lien valable 7 jours. Jamais de mot de passe en clair.</span></td></tr>` : "";

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>@import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700&family=Grand+Hotel&display=swap');</style>
</head><body style="margin:0;padding:0;background:#FBF6EC;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF6EC;"><tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:560px;background:#FFFDF8;border:1px solid #EFE7D6;border-radius:18px;overflow:hidden;">
  <tr><td style="height:4px;background:${GOLD};font-size:4px;line-height:4px;">&nbsp;</td></tr>
  <tr><td style="padding:32px 40px 0;">
    <div style="font-family:'Grand Hotel',cursive,${F};font-size:30px;color:${ONYX};line-height:1;">Atlas Studio</div>
    <div style="font-family:${F};font-size:12px;letter-spacing:.4px;color:#8A867A;text-transform:uppercase;margin-top:2px;">une identité, tout l'écosystème</div>
  </td></tr>
  <tr><td style="padding:24px 40px 0;">
    <h1 style="margin:0;font-family:${F};font-size:22px;font-weight:700;color:${ONYX};">Vos accès sont prêts</h1>
    <p style="margin:12px 0 0;font-family:${F};font-size:15px;color:#4A473F;line-height:1.6;">Bonjour ${esc(p.tenantName)},<br/>Voici les applications qui viennent de vous être ouvertes.</p>
  </td></tr>
  <tr><td style="padding:18px 40px 0;">
    <table role="presentation" width="100%" style="background:#FBF6EC;border-radius:12px;"><tr><td style="padding:14px 18px;font-family:'JetBrains Mono',monospace,${F};font-size:12px;color:#5A574E;line-height:1.8;">
      Type : <b>${esc(natureLabel[p.nature] || p.nature)}</b><br/>
      ${p.expiry ? `Échéance : <b>${esc(p.expiry)}</b><br/>` : ""}
      Code client : <b>${esc(p.codeClient)}</b> · Abonnement : <b>${esc(p.numero)}</b>
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:8px 40px 0;"><table role="presentation" width="100%">${appRows}</table></td></tr>
  ${pwBlock}
  <tr><td align="center" style="padding:8px 40px 0;">
    <a href="${esc(p.portalUrl)}" style="font-family:${F};font-size:13px;color:#52693F;">Accéder à mon espace client →</a>
  </td></tr>
  <tr><td style="padding:20px 40px;">
    <ul style="margin:0;padding-left:18px;font-family:${F};font-size:13px;color:#5A574E;line-height:1.7;">
      <li>Ouvrez chaque application avec le bouton correspondant.</li>
      <li>Invitez votre équipe depuis les paramètres de chaque application.</li>
      <li>Une question ? Répondez simplement à cet e-mail.</li>
    </ul>
  </td></tr>
  <tr><td align="center" style="padding:8px 40px 36px;border-top:1px solid #EFE7D6;">
    <p style="margin:14px 0 0;font-family:${F};font-size:11px;color:#B8B4A8;">Atlas Studio · atlas-studio.org · acces@atlas-studio.org</p>
  </td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    `Vos accès Atlas Studio sont prêts`, ``, `Bonjour ${p.tenantName},`, ``,
    `Type : ${natureLabel[p.nature] || p.nature}`,
    p.expiry ? `Échéance : ${p.expiry}` : ``,
    `Code client : ${p.codeClient} · Abonnement : ${p.numero}`, ``,
    ...p.apps.map((a) => `- ${a.name} (plan ${a.plan || "—"}, ${a.seats} siège(s)) : ${a.url}`),
    ``, p.passwordUrl ? `Définir mon mot de passe : ${p.passwordUrl}` : ``,
    `Espace client : ${p.portalUrl}`,
  ].filter(Boolean).join("\n");

  return { html, text };
}

async function sendViaResend(to: string, subject: string, html: string, text: string): Promise<string | null> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) { console.warn("[L6] RESEND_API_KEY absent — envoi ignoré"); return null; }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: ACCESS_FROM, to: [to], subject, html, text }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return (await res.json()).id ?? null;
}

async function processOne(msg: Record<string, any>): Promise<void> {
  // 1. Abonnement + tenant
  const { data: sub } = await supabaseAdmin.from("subscriptions")
    .select("id, numero, nature, date_fin, tenant_id").eq("id", msg.subscription_id).single();
  if (!sub) throw new Error("abonnement introuvable");
  const { data: tenant } = await supabaseAdmin.from("tenants")
    .select("id, name, billing_email").eq("id", sub.tenant_id).single();
  if (!tenant?.billing_email) throw new Error("tenant/email introuvable");

  // 2. Lignes -> apps
  const { data: lines } = await supabaseAdmin.from("subscription_lines")
    .select("app_id, quantite_sieges, plan_id").eq("subscription_id", sub.id);
  const appIds = (lines ?? []).map((l) => l.app_id);
  const { data: apps } = await supabaseAdmin.from("apps")
    .select("id, name, external_url, status").in("id", appIds.length ? appIds : ["__none__"]);
  const appById = new Map((apps ?? []).map((a) => [a.id, a]));
  const blocks: AppBlock[] = (lines ?? []).map((l) => {
    const a = appById.get(l.app_id);
    return {
      name: a?.name || l.app_id,
      url: a?.external_url || `${SITE_URL}/portal`,
      plan: "", seats: l.quantite_sieges || 1, status: a?.status || "",
    };
  });

  // 3. Lien de définition de mot de passe (généré côté serveur)
  let passwordUrl: string | null = null;
  try {
    const { data: link } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery", email: tenant.billing_email,
      options: { redirectTo: `${SITE_URL}/portal/reset-password` },
    });
    passwordUrl = link?.properties?.action_link ?? null;
  } catch (e) { console.warn("[L6] generateLink échoué (non bloquant)", e); }

  // 4. Rendu + envoi
  const subject = `Vos accès Atlas Studio : ${blocks.map((b) => b.name).join(", ")}`;
  const { html, text } = renderAccessEmail({
    tenantName: tenant.name || tenant.billing_email,
    numero: sub.numero || sub.id.slice(0, 8),
    nature: sub.nature || "offert",
    expiry: sub.date_fin ? new Date(sub.date_fin).toLocaleDateString("fr-FR", { dateStyle: "long" }) : null,
    codeClient: tenant.id.slice(0, 8).toUpperCase(),
    apps: blocks, passwordUrl, portalUrl: `${SITE_URL}/portal`,
  });
  const providerId = await sendViaResend(tenant.billing_email, subject, html, text);

  // 5. Marquer remis + snapshot probant
  await supabaseAdmin.from("message_deliveries").update({
    statut: "envoye", provider: "resend", provider_message_id: providerId,
    sujet: subject, corps_snapshot: html, envoye_le: new Date().toISOString(),
    destinataire: tenant.billing_email,
  }).eq("id", msg.id);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    // Autorisation : service role (cron) OU admin (déclenchement manuel L8)
    const bearer = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
    const isService = bearer && bearer === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!isService) await requireAdmin(req);

    const url = new URL(req.url);
    const onlyId = url.searchParams.get("id"); // renvoi ciblé (L8)
    let q = supabaseAdmin.from("message_deliveries").select("*")
      .eq("modele", "acces_accorde").eq("statut", "en_attente").lt("tentatives", MAX_TRIES).limit(25);
    if (onlyId) q = supabaseAdmin.from("message_deliveries").select("*").eq("id", onlyId).limit(1);
    const { data: pending, error } = await q;
    if (error) throw error;

    let sent = 0; const failures: string[] = [];
    for (const msg of pending ?? []) {
      try { await processOne(msg); sent++; }
      catch (e) {
        const tries = (msg.tentatives ?? 0) + 1;
        await supabaseAdmin.from("message_deliveries").update({
          tentatives: tries, erreur: (e as Error).message,
          statut: tries >= MAX_TRIES ? "echec" : "en_attente",
        }).eq("id", msg.id);
        failures.push(`${msg.id}: ${(e as Error).message}`);
      }
    }
    return jsonResponse({ processed: (pending ?? []).length, sent, failures });
  } catch (e: any) {
    console.error("dispatch-access-messages error:", e);
    if (e.status) return errorResponse(e.message, e.status);
    return errorResponse(e.message || "Erreur");
  }
});
