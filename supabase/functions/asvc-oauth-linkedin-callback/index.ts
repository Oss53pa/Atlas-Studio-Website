// ASVC — OAuth callback LinkedIn.
// GET /asvc-oauth-linkedin-callback?code=...&state=...

import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

function html(status: number, body: string): Response {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>ASVC OAuth — LinkedIn</title>
     <style>body{font-family:system-ui;background:#0A0A0A;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px}
     .card{max-width:560px;background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:24px}
     h1{color:#EF9F27;margin:0 0 12px;font-size:18px}
     p{color:#aaa;font-size:14px;line-height:1.5;margin:6px 0}
     code{background:#000;padding:2px 6px;border-radius:4px;color:#EF9F27;font-size:12px}
     a{color:#EF9F27}</style></head>
     <body><div class="card">${body}</div></body></html>`,
    { status, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } },
  );
}

const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const USERINFO_URL = "https://api.linkedin.com/v2/userinfo";

interface StateData {
  provider: string;
  actor: string;
  return_to: string;
  nonce: string;
  issued_at: number;
}

Deno.serve(async (req) => {
  if (req.method !== "GET") return html(405, "<h1>Method not allowed</h1>");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");
  const errorDesc = url.searchParams.get("error_description");

  if (errorParam) {
    return html(400, `<h1>Connexion refusée</h1>
      <p>LinkedIn a renvoyé : <code>${errorParam}</code></p>
      <p>${errorDesc ?? ""}</p>`);
  }
  if (!code || !stateRaw) return html(400, "<h1>Paramètres manquants</h1><p>code ou state absent.</p>");

  let state: StateData;
  try {
    state = JSON.parse(atob(stateRaw)) as StateData;
  } catch {
    return html(400, "<h1>State invalide</h1>");
  }
  if (Date.now() - state.issued_at > 10 * 60 * 1000) {
    return html(400, "<h1>State expiré</h1><p>Recommence le flow de connexion.</p>");
  }
  if (state.provider !== "linkedin") {
    return html(400, `<h1>Provider non supporté: ${state.provider}</h1>`);
  }

  const clientId = Deno.env.get("LINKEDIN_OAUTH_CLIENT_ID");
  const clientSecret = Deno.env.get("LINKEDIN_OAUTH_CLIENT_SECRET");
  const masterKey = Deno.env.get("APP_ENCRYPTION_KEY");
  if (!clientId || !clientSecret) return html(500, "<h1>OAuth non configuré côté serveur</h1>");
  if (!masterKey || masterKey.length < 16) return html(500, "<h1>APP_ENCRYPTION_KEY manquante</h1>");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const redirectUri = `${supabaseUrl}/functions/v1/asvc-oauth-linkedin-callback`;

  // Exchange code → access_token
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    return html(400, `<h1>Échec récupération token</h1>
      <pre style="color:#aaa;font-size:11px">${JSON.stringify(tokenData, null, 2).slice(0, 800)}</pre>`);
  }

  const accessToken = tokenData.access_token as string;
  // LinkedIn n'émet pas de refresh_token par défaut. Access token = 60j.
  const expiresIn = (tokenData.expires_in as number) ?? 60 * 24 * 3600;
  const scope = (tokenData.scope as string) ?? "";

  // Récupère identité + member URN via /userinfo (OpenID Connect)
  const uiRes = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const ui = await uiRes.json();
  if (!uiRes.ok || !ui.email) {
    return html(400, `<h1>Échec userinfo LinkedIn</h1>
      <pre style="color:#aaa;font-size:11px">${JSON.stringify(ui).slice(0, 400)}</pre>`);
  }

  const memberSub = ui.sub as string;                       // ex: "abc123XYZ"
  const memberUrn = `urn:li:person:${memberSub}`;
  const accountEmail = ui.email as string;
  const accountName = (ui.name as string) ?? accountEmail;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  // Stocke en DB (refresh_token_encrypted = access token car LinkedIn n'a pas
  // de vrai refresh; access_token_cached = même valeur pour cohérence)
  // memberUrn embedded dans scope (lookup au send via parseScope)
  const scopeWithUrn = `${scope}|li_urn:${memberUrn}`;

  const { error: setErr } = await supabaseAdmin.rpc("asvc_oauth_set_token", {
    p_provider: "linkedin",
    p_account_email: accountEmail,
    p_refresh_token: accessToken,
    p_master_key: masterKey,
    p_access_token: accessToken,
    p_expires_at: expiresAt,
    p_scope: scopeWithUrn,
    p_account_label: accountName,
  });
  if (setErr) return html(500, `<h1>Erreur stockage token</h1><pre>${setErr.message}</pre>`);

  await supabaseAdmin.rpc("asvc_log_audit", {
    p_actor_type: "ceo",
    p_actor_id: state.actor,
    p_event_type: "oauth_connected",
    p_resource_type: "asvc_oauth_tokens",
    p_resource_id: null,
    p_payload: { provider: "linkedin", account_email: accountEmail, member_urn: memberUrn },
  });

  const cleanReturn = state.return_to.startsWith("/") ? state.return_to : "/admin/asvc/connectors";
  const returnUrl = `${cleanReturn}?linkedin_connected=${encodeURIComponent(accountEmail)}`;

  return html(200, `
    <h1>✓ LinkedIn connecté</h1>
    <p>Compte : <code>${accountEmail}</code></p>
    <p>Profil : <code>${accountName}</code></p>
    <p>Token valide 60 jours (LinkedIn n'émet pas de refresh token : reconnexion manuelle à expiration).</p>
    <script>
      try { window.opener && window.opener.postMessage({type:'asvc-oauth-connected',provider:'linkedin',account:'${accountEmail}'}, '*'); } catch(e){}
      setTimeout(function(){
        if (window.opener) { window.close(); }
        else { window.location.href = ${JSON.stringify(returnUrl)}; }
      }, 1500);
    </script>
    <p><a href="${cleanReturn}">Revenir à ASVC</a></p>`);
});
