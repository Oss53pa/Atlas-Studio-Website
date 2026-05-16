// ASVC — OAuth start LinkedIn.
// GET /asvc-oauth-linkedin-start?return_to=/admin/asvc/connectors
// Auth: JWT admin

import { corsHeaders } from "../_shared/cors.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";

function html(status: number, body: string): Response {
  return new Response(body, {
    status,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}

const LI_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return html(405, "<h1>Method not allowed</h1>");

  const authz = await authorizeRequest(req);
  if (!authz.ok || authz.isCron) {
    return html(401, `<h1>Unauthorized</h1><p>${authz.ok ? "Cron secret non autorisé" : authz.reason}</p>`);
  }

  const clientId = Deno.env.get("LINKEDIN_OAUTH_CLIENT_ID");
  if (!clientId) {
    return html(500, `<h1>OAuth non configuré</h1><p>LINKEDIN_OAUTH_CLIENT_ID manquant côté Supabase.</p>`);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const redirectUri = `${supabaseUrl}/functions/v1/asvc-oauth-linkedin-callback`;

  const url = new URL(req.url);
  const returnTo = url.searchParams.get("return_to") ?? "/admin/asvc/connectors";

  const state = btoa(JSON.stringify({
    provider: "linkedin",
    actor: authz.actor,
    return_to: returnTo,
    nonce: crypto.randomUUID(),
    issued_at: Date.now(),
  }));

  // Scopes nécessaires :
  // - openid + profile + email : pour /userinfo (identifier le compte)
  // - w_member_social : pour publier des UGC Posts au nom du membre
  const scopes = ["openid", "profile", "email", "w_member_social"].join(" ");

  const consentUrl = new URL(LI_AUTH_URL);
  consentUrl.searchParams.set("response_type", "code");
  consentUrl.searchParams.set("client_id", clientId);
  consentUrl.searchParams.set("redirect_uri", redirectUri);
  consentUrl.searchParams.set("state", state);
  consentUrl.searchParams.set("scope", scopes);

  return Response.redirect(consentUrl.toString(), 302);
});
