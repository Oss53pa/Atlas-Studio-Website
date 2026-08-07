/**
 * Edge Function: pay-link  (CDC v2.1 — Lot L10, Partie 13.3)
 *
 * Page de paiement d'une facture de renouvellement, SANS connexion préalable.
 * Le lien porte un jeton signé (HMAC) qui n'expose que le montant et la référence.
 * Public (verify_jwt=false) ; la sécurité vient de la signature du jeton.
 *
 * GET ?token=<signé>  → page HTML récapitulative + bouton « Payer ».
 */
import { supabaseAdmin } from "../_shared/supabase.ts";

const SITE_URL = Deno.env.get("SITE_URL") || "https://atlas-studio.org";
const SECRET = Deno.env.get("LICENCE_HMAC_SECRET") || Deno.env.get("JWT_SECRET") || "atlas-default-secret";

function b64urlToStr(b64: string): string {
  const s = b64.replace(/-/g, "+").replace(/_/g, "/");
  return atob(s + "=".repeat((4 - (s.length % 4)) % 4));
}
function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function verifyToken(token: string): Promise<any | null> {
  try {
    const { payload, sig } = JSON.parse(b64urlToStr(token));
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(JSON.stringify(payload)));
    if (hex(mac) !== sig) return null;
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (_e) { return null; }
}

function page(title: string, bodyHtml: string): Response {
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;600;700&family=Grand+Hotel&family=JetBrains+Mono&display=swap');
body{margin:0;background:#FBF6EC;font-family:'Exo 2',Arial,sans-serif;color:#2A2A26;}
.card{max-width:460px;margin:48px auto;background:#FFFDF8;border:1px solid #EFE7D6;border-radius:18px;overflow:hidden;}
.bar{height:4px;background:#EF9F27;} .pad{padding:32px 36px;}
.mono{font-family:'JetBrains Mono',monospace;} .btn{display:inline-block;padding:14px 34px;background:#EF9F27;color:#0A0A0A;font-weight:700;border-radius:12px;text-decoration:none;}
.muted{color:#8A867A;font-size:13px;}</style></head>
<body><div class="card"><div class="bar"></div><div class="pad">
<div style="font-family:'Grand Hotel',cursive;font-size:28px;color:#0A0A0A;">Atlas Studio</div>
${bodyHtml}
</div></div></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const payload = await verifyToken(token);
  if (!payload) {
    return page("Lien invalide", `<h2>Lien invalide ou expiré</h2><p class="muted">Contactez-nous pour un nouveau lien de paiement.</p>`);
  }

  const { data: sub } = await supabaseAdmin.from("subscriptions")
    .select("id, numero, app_id, plan, price_at_subscription, date_fin, tenant_id, status").eq("id", payload.sub).single();
  if (!sub) return page("Introuvable", `<h2>Abonnement introuvable</h2>`);
  const { data: tenant } = await supabaseAdmin.from("tenants").select("name").eq("id", sub.tenant_id).single();
  const { data: app } = await supabaseAdmin.from("apps").select("name").eq("id", sub.app_id).single();

  const montant = Number(payload.amt ?? sub.price_at_subscription ?? 0).toLocaleString("fr-FR");
  const already = sub.status === "active";

  return page("Paiement du renouvellement", `
    <p style="margin:16px 0 4px;">Renouvellement de <strong>${app?.name || sub.app_id}</strong>${tenant?.name ? ` — ${tenant.name}` : ""}</p>
    <div style="background:#FBF6EC;border-radius:12px;padding:16px 18px;margin:14px 0;">
      <div class="mono" style="font-size:22px;color:#0A0A0A;">${montant} FCFA</div>
      <div class="muted mono">Réf ${sub.numero || sub.id.slice(0,8)}${sub.date_fin ? ` · échéance ${new Date(sub.date_fin).toLocaleDateString("fr-FR")}` : ""}</div>
    </div>
    ${already
      ? `<p style="color:#2E7D32;">Cet abonnement est déjà à jour. Aucun paiement requis.</p>`
      : `<a class="btn" href="${SITE_URL}/portal/billing?renew=${sub.id}">Payer maintenant →</a>
         <p class="muted" style="margin-top:16px;">Paiement sécurisé Mobile Money / carte. Aucune connexion requise pour régler cette facture.</p>`}
  `);
});
