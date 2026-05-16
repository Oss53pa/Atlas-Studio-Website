// ASVC — OAuth callback (Google).
//
// GET /asvc-oauth-callback?code=...&state=...&scope=...
// Auth: PAS de JWT (callback Google). La protection vient de:
//   1. Vérification du state (signé/issued_at récent)
//   2. Vérif que GOOGLE_OAUTH_CLIENT_SECRET est connu (sinon échange échoue)
//   3. Connexion explicite à l'identité Google retournée
//
// Échange le code contre access_token + refresh_token, identifie le compte
// (via userinfo), stocke le refresh_token chiffré en DB, et redirige vers
// `return_to` côté frontend.

import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

function html(status: number, body: string): Response {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>ASVC OAuth</title>
     <style>body{font-family:system-ui;background:#0A0A0A;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px}
     .card{max-width:560px;background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:24px}
     h1{color:#EF9F27;margin:0 0 12px;font-size:18px}
     p{color:#aaa;font-size:14px;line-height:1.5;margin:6px 0}
     code{background:#000;padding:2px 6px;border-radius:4px;color:#EF9F27;font-size:12px}
     a{color:#EF9F27}</style></head>
     <body><div class="card">${body}</div></body></html>`,
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    },
  );
}

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

interface StateData {
  provider: string;
  actor: string;
  return_to: string;
  nonce: string;
  issued_at: number;
}

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return html(405, "<h1>Method not allowed</h1>");
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  if (errorParam) {
    return html(
      400,
      `<h1>Connexion refusée</h1>
       <p>Google a renvoyé l'erreur : <code>${errorParam}</code></p>
       <p>Tu peux fermer cette page et réessayer.</p>`,
    );
  }
  if (!code || !stateRaw) {
    return html(400, "<h1>Paramètres manquants</h1><p>code ou state absent.</p>");
  }

  // Décode le state
  let state: StateData;
  try {
    state = JSON.parse(atob(stateRaw)) as StateData;
  } catch {
    return html(400, "<h1>State invalide</h1>");
  }

  // Anti-replay: state pas plus vieux que 10 min
  if (Date.now() - state.issued_at > 10 * 60 * 1000) {
    return html(400, "<h1>State expiré</h1><p>Recommence le processus de connexion.</p>");
  }

  if (state.provider !== "gmail") {
    return html(400, `<h1>Provider non supporté: ${state.provider}</h1>`);
  }

  // Vérifie les secrets Google
  const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
  const masterKey = Deno.env.get("APP_ENCRYPTION_KEY");
  if (!clientId || !clientSecret) {
    return html(500, "<h1>OAuth non configuré côté serveur</h1>");
  }
  if (!masterKey || masterKey.length < 16) {
    return html(500, "<h1>APP_ENCRYPTION_KEY manquante (chiffrement DB)</h1>");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const redirectUri = `${supabaseUrl}/functions/v1/asvc-oauth-callback`;

  // Échange code → tokens
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    return html(
      400,
      `<h1>Échec récupération token</h1>
       <pre>${JSON.stringify(tokenData, null, 2).slice(0, 600)}</pre>`,
    );
  }

  const accessToken = tokenData.access_token as string;
  const refreshToken = tokenData.refresh_token as string | undefined;
  const expiresIn = (tokenData.expires_in as number) ?? 3600;
  const scope = tokenData.scope as string;

  if (!refreshToken) {
    return html(
      400,
      `<h1>Pas de refresh_token reçu</h1>
       <p>Cela arrive si tu avais déjà autorisé l'app. Va sur
       <a href="https://myaccount.google.com/permissions" target="_blank">myaccount.google.com/permissions</a>,
       révoque l'accès à Atlas Studio, puis recommence.</p>`,
    );
  }

  // Récupère l'identité du compte (email)
  const userinfoRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const userinfo = await userinfoRes.json();
  if (!userinfoRes.ok || !userinfo.email) {
    return html(400, `<h1>Échec userinfo</h1><pre>${JSON.stringify(userinfo).slice(0, 300)}</pre>`);
  }
  const accountEmail = userinfo.email as string;
  const accountName = (userinfo.name as string) ?? accountEmail;

  // Stocke en DB (refresh chiffré + access caché)
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  const { error: setErr } = await supabaseAdmin.rpc("asvc_oauth_set_token", {
    p_provider: "gmail",
    p_account_email: accountEmail,
    p_refresh_token: refreshToken,
    p_master_key: masterKey,
    p_access_token: accessToken,
    p_expires_at: expiresAt,
    p_scope: scope,
    p_account_label: accountName,
  });
  if (setErr) {
    return html(500, `<h1>Erreur stockage token</h1><pre>${setErr.message}</pre>`);
  }

  // Audit
  await supabaseAdmin.rpc("asvc_log_audit", {
    p_actor_type: "ceo",
    p_actor_id: state.actor,
    p_event_type: "oauth_connected",
    p_resource_type: "asvc_oauth_tokens",
    p_resource_id: null,
    p_payload: { provider: "gmail", account_email: accountEmail },
  });

  // Build URL frontend de retour
  const origin = req.headers.get("origin") ?? req.headers.get("referer") ?? "";
  // Préfère un origin propre si disponible (sinon le returnTo seul)
  const cleanReturn = state.return_to.startsWith("/") ? state.return_to : "/admin/asvc/config";
  const returnUrl = `${cleanReturn}?gmail_connected=${encodeURIComponent(accountEmail)}`;

  return html(
    200,
    `<h1>✓ Gmail connecté</h1>
     <p>Compte : <code>${accountEmail}</code></p>
     <p>Tu peux fermer cette fenêtre et retourner dans ASVC.</p>
     <script>
       try { window.opener && window.opener.postMessage({type:'asvc-oauth-connected',provider:'gmail',account:'${accountEmail}'}, '*'); } catch(e){}
       setTimeout(function(){
         if (window.opener) { window.close(); }
         else { window.location.href = ${JSON.stringify(returnUrl)}; }
       }, 1500);
     </script>
     <p><a href="${cleanReturn}">Revenir à ASVC</a></p>`,
  );
});
