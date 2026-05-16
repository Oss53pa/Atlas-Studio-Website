// ASVC — OAuth start Meta (Facebook + Instagram).
// GET /asvc-oauth-meta-start?return_to=/admin/asvc/connectors
// Auth: JWT admin

import { corsHeaders } from "../_shared/cors.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";

function html(status: number, body: string): Response {
  return new Response(body, {
    status,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}

// Meta utilise la dernière version stable de la Graph API
const META_AUTH_URL = "https://www.facebook.com/v21.0/dialog/oauth";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return html(405, "<h1>Method not allowed</h1>");

  const authz = await authorizeRequest(req);
  if (!authz.ok || authz.isCron) {
    return html(401, `<h1>Unauthorized</h1><p>${authz.ok ? "Cron secret non autorisé" : authz.reason}</p>`);
  }

  const clientId = Deno.env.get("META_OAUTH_CLIENT_ID");
  if (!clientId) {
    return html(500, `<h1>OAuth non configuré</h1><p>META_OAUTH_CLIENT_ID manquant côté Supabase.</p>
      <p>Setup : <a href="https://developers.facebook.com/apps" target="_blank">developers.facebook.com/apps</a> →
      créer une app Business → ajouter produits "Facebook Login for Business" + "Instagram Graph API".</p>`);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const redirectUri = `${supabaseUrl}/functions/v1/asvc-oauth-meta-callback`;

  const url = new URL(req.url);
  const returnTo = url.searchParams.get("return_to") ?? "/admin/asvc/connectors";

  const state = btoa(JSON.stringify({
    provider: "meta",
    actor: authz.actor,
    return_to: returnTo,
    nonce: crypto.randomUUID(),
    issued_at: Date.now(),
  }));

  // Scopes nécessaires :
  // - pages_show_list           : lister les Pages admin
  // - pages_manage_posts        : publier sur la Page FB
  // - pages_read_engagement     : lire la Page (nom, ID)
  // - instagram_basic           : voir l'IG Business Account lié à la Page
  // - instagram_content_publish : publier sur l'IG (2-step container/publish)
  // - business_management       : nécessaire pour les Page Access Token never-expiring
  const scopes = [
    "pages_show_list",
    "pages_manage_posts",
    "pages_read_engagement",
    "instagram_basic",
    "instagram_content_publish",
    "business_management",
  ].join(",");

  const consentUrl = new URL(META_AUTH_URL);
  consentUrl.searchParams.set("response_type", "code");
  consentUrl.searchParams.set("client_id", clientId);
  consentUrl.searchParams.set("redirect_uri", redirectUri);
  consentUrl.searchParams.set("state", state);
  consentUrl.searchParams.set("scope", scopes);
  consentUrl.searchParams.set("auth_type", "rerequest");

  return Response.redirect(consentUrl.toString(), 302);
});
