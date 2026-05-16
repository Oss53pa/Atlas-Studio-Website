// ASVC — OAuth callback Meta.
// GET /asvc-oauth-meta-callback?code=...&state=...
//
// Flow:
//   1. Échange code → short-lived user access token
//   2. Échange short-lived → long-lived user token (60 jours)
//   3. GET /me/accounts → liste les Pages admin (chacune a son own page access token)
//   4. Avec business_management granted, les page access tokens sont never-expiring
//   5. Pour chaque Page, GET /{page-id}?fields=instagram_business_account → IG Biz ID
//   6. Stocke 1 entry par Page (account_email = page_id, scope encode page_name + ig_id)
//
// Si l'utilisateur n'admin aucune Page : on stocke quand même 0 page = erreur claire.

import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

const GRAPH = "https://graph.facebook.com/v21.0";

function html(status: number, body: string): Response {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>ASVC OAuth — Meta</title>
     <style>body{font-family:system-ui;background:#0A0A0A;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px}
     .card{max-width:560px;background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:24px}
     h1{color:#EF9F27;margin:0 0 12px;font-size:18px}
     p{color:#aaa;font-size:14px;line-height:1.5;margin:6px 0}
     code{background:#000;padding:2px 6px;border-radius:4px;color:#EF9F27;font-size:12px}
     a{color:#EF9F27}
     .page{background:#000;border:1px solid #333;border-radius:6px;padding:8px 10px;margin:6px 0;font-size:12px;color:#aaa}
     .ok{color:#34d399} .warn{color:#fbbf24}</style></head>
     <body><div class="card">${body}</div></body></html>`,
    { status, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } },
  );
}

interface StateData {
  provider: string;
  actor: string;
  return_to: string;
  nonce: string;
  issued_at: number;
}

interface FbPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
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
      <p>Meta a renvoyé : <code>${errorParam}</code></p><p>${errorDesc ?? ""}</p>`);
  }
  if (!code || !stateRaw) return html(400, "<h1>Paramètres manquants</h1><p>code ou state absent.</p>");

  let state: StateData;
  try {
    state = JSON.parse(atob(stateRaw)) as StateData;
  } catch {
    return html(400, "<h1>State invalide</h1>");
  }
  if (Date.now() - state.issued_at > 10 * 60 * 1000) {
    return html(400, "<h1>State expiré</h1><p>Recommence le flow.</p>");
  }
  if (state.provider !== "meta") return html(400, `<h1>Provider non supporté: ${state.provider}</h1>`);

  const clientId = Deno.env.get("META_OAUTH_CLIENT_ID");
  const clientSecret = Deno.env.get("META_OAUTH_CLIENT_SECRET");
  const masterKey = Deno.env.get("APP_ENCRYPTION_KEY");
  if (!clientId || !clientSecret) return html(500, "<h1>OAuth non configuré côté serveur</h1>");
  if (!masterKey || masterKey.length < 16) return html(500, "<h1>APP_ENCRYPTION_KEY manquante</h1>");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const redirectUri = `${supabaseUrl}/functions/v1/asvc-oauth-meta-callback`;

  // 1. Short-lived user token
  const tokenUrl = new URL(`${GRAPH}/oauth/access_token`);
  tokenUrl.searchParams.set("client_id", clientId);
  tokenUrl.searchParams.set("client_secret", clientSecret);
  tokenUrl.searchParams.set("redirect_uri", redirectUri);
  tokenUrl.searchParams.set("code", code);
  const tokenRes = await fetch(tokenUrl.toString());
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    return html(400, `<h1>Échec récupération token</h1>
      <pre style="color:#aaa;font-size:11px">${JSON.stringify(tokenData, null, 2).slice(0, 800)}</pre>`);
  }
  const shortToken = tokenData.access_token as string;

  // 2. Exchange for long-lived user token (60j)
  const llUrl = new URL(`${GRAPH}/oauth/access_token`);
  llUrl.searchParams.set("grant_type", "fb_exchange_token");
  llUrl.searchParams.set("client_id", clientId);
  llUrl.searchParams.set("client_secret", clientSecret);
  llUrl.searchParams.set("fb_exchange_token", shortToken);
  const llRes = await fetch(llUrl.toString());
  const llData = await llRes.json();
  const userLongToken = (llData.access_token as string | undefined) ?? shortToken;

  // 3. /me/accounts → liste des Pages
  const pagesRes = await fetch(`${GRAPH}/me/accounts?fields=id,name,access_token,category&access_token=${encodeURIComponent(userLongToken)}`);
  const pagesData = await pagesRes.json();
  if (!pagesRes.ok) {
    return html(400, `<h1>Échec récupération Pages</h1>
      <pre style="color:#aaa;font-size:11px">${JSON.stringify(pagesData, null, 2).slice(0, 800)}</pre>`);
  }
  const pages: FbPage[] = (pagesData.data as FbPage[] | undefined) ?? [];
  if (pages.length === 0) {
    return html(400, `<h1>Aucune Page Facebook admin</h1>
      <p>Le compte connecté n'admin aucune Page Facebook. Crée d'abord une Page sur facebook.com,
      puis recommence la connexion.</p>`);
  }

  // Récupère identité user pour label
  const meRes = await fetch(`${GRAPH}/me?fields=id,name,email&access_token=${encodeURIComponent(userLongToken)}`);
  const meData = await meRes.json();
  const userName = (meData?.name as string | undefined) ?? "Meta User";

  // 4 + 5. Pour chaque Page : récupère l'IG Business Account si lié, stocke 1 entry par Page
  const stored: Array<{ page_id: string; page_name: string; ig_user_id: string | null }> = [];
  for (const p of pages) {
    let igUserId: string | null = null;
    try {
      const igRes = await fetch(
        `${GRAPH}/${p.id}?fields=instagram_business_account&access_token=${encodeURIComponent(p.access_token)}`,
      );
      const igData = await igRes.json();
      igUserId = (igData?.instagram_business_account?.id as string | undefined) ?? null;
    } catch {
      igUserId = null;
    }

    // Encode metadata dans le champ scope (cohérent avec le pattern LinkedIn)
    const scopeEncoded = [
      "pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish",
      `meta_page_id:${p.id}`,
      `meta_page_name:${encodeURIComponent(p.name)}`,
      igUserId ? `meta_ig_user_id:${igUserId}` : null,
    ].filter(Boolean).join("|");

    const { error: setErr } = await supabaseAdmin.rpc("asvc_oauth_set_token", {
      p_provider: "meta",
      p_account_email: p.id,                    // account_email = Page ID (unique)
      p_refresh_token: p.access_token,          // Page Access Token (never-expiring avec business_management)
      p_master_key: masterKey,
      p_access_token: p.access_token,
      p_expires_at: null,                       // never-expiring
      p_scope: scopeEncoded,
      p_account_label: `${p.name} (${p.category ?? "Page"})${igUserId ? " + IG" : ""}`,
    });
    if (setErr) {
      return html(500, `<h1>Erreur stockage token</h1><pre>${setErr.message}</pre>`);
    }
    stored.push({ page_id: p.id, page_name: p.name, ig_user_id: igUserId });
  }

  await supabaseAdmin.rpc("asvc_log_audit", {
    p_actor_type: "ceo",
    p_actor_id: state.actor,
    p_event_type: "oauth_connected",
    p_resource_type: "asvc_oauth_tokens",
    p_resource_id: null,
    p_payload: {
      provider: "meta",
      user_name: userName,
      pages_count: stored.length,
      pages: stored.map((s) => ({ page_id: s.page_id, page_name: s.page_name, has_ig: !!s.ig_user_id })),
    },
  });

  const cleanReturn = state.return_to.startsWith("/") ? state.return_to : "/admin/asvc/connectors";
  const returnUrl = `${cleanReturn}?meta_connected=${encodeURIComponent(stored.map((s) => s.page_name).join(", "))}`;

  const pagesHtml = stored.map((s) => `
    <div class="page">
      <strong style="color:#fff">${s.page_name}</strong> · <code>${s.page_id}</code>
      <span class="${s.ig_user_id ? "ok" : "warn"}">${s.ig_user_id ? "✓ Instagram lié" : "○ Pas d'Instagram lié"}</span>
    </div>`).join("");

  return html(200, `
    <h1>✓ Meta connecté (${stored.length} Page${stored.length > 1 ? "s" : ""})</h1>
    <p>Utilisateur : <code>${userName}</code></p>
    ${pagesHtml}
    <p>Page Access Tokens stockés never-expiring (grâce au scope business_management).</p>
    <script>
      try { window.opener && window.opener.postMessage({type:'asvc-oauth-connected',provider:'meta',count:${stored.length}}, '*'); } catch(e){}
      setTimeout(function(){
        if (window.opener) { window.close(); }
        else { window.location.href = ${JSON.stringify(returnUrl)}; }
      }, 1800);
    </script>
    <p><a href="${cleanReturn}">Revenir à ASVC</a></p>`);
});
