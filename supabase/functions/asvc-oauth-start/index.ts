// ASVC — OAuth flow start.
//
// GET /asvc-oauth-start?provider=gmail&return_to=/admin/asvc/connectors
// Auth: JWT admin (le state nonce inclut l'identité pour callback)
//
// Redirige (302) vers la page de consentement Google. Le callback ramène
// vers /functions/v1/asvc-oauth-callback?provider=gmail.

import { corsHeaders } from "../_shared/cors.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";

function html(status: number, body: string): Response {
  return new Response(body, {
    status,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

function buildGoogleConsentUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
  scope: string;
  loginHint?: string;
}): string {
  const params = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: opts.scope,
    access_type: "offline",         // pour obtenir un refresh_token
    prompt: "consent",              // force la délivrance d'un refresh_token
    state: opts.state,
  });
  if (opts.loginHint) params.set("login_hint", opts.loginHint);
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") {
    return html(405, "<h1>Method not allowed</h1>");
  }

  // Auth via JWT admin (la page Connecteurs UI déclenche cette redirection)
  const authz = await authorizeRequest(req);
  if (!authz.ok || authz.isCron) {
    return html(401, `<h1>Unauthorized</h1><p>${authz.ok ? "Cron secret non autorisé" : authz.reason}</p>`);
  }

  const url = new URL(req.url);
  const provider = url.searchParams.get("provider") ?? "gmail";
  const returnTo = url.searchParams.get("return_to") ?? "/admin/asvc/config";
  const loginHint = url.searchParams.get("login_hint") ?? undefined;

  if (provider !== "gmail") {
    return html(400, `<h1>Provider non supporté: ${provider}</h1>`);
  }

  const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
  if (!clientId) {
    return html(
      500,
      `<h1>OAuth non configuré</h1>
       <p>La variable GOOGLE_OAUTH_CLIENT_ID n'est pas définie côté Supabase.</p>
       <p>Configure-la dans le dashboard Supabase → Edge Functions → Secrets.</p>`,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const redirectUri = `${supabaseUrl}/functions/v1/asvc-oauth-callback`;

  // Le state contient le provider, l'actor (user_id) et returnTo
  const state = btoa(
    JSON.stringify({
      provider,
      actor: authz.actor,
      return_to: returnTo,
      nonce: crypto.randomUUID(),
      issued_at: Date.now(),
    }),
  );

  const scope = "https://www.googleapis.com/auth/gmail.send openid email";
  const consentUrl = buildGoogleConsentUrl({
    clientId,
    redirectUri,
    state,
    scope,
    loginHint,
  });

  return Response.redirect(consentUrl, 302);
});
