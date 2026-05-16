// ASVC — Stockage d'un Personal Access Token (PAT) chiffré.
//
// POST /asvc-oauth-pat-set { provider: "github", account: "username/org", token: "ghp_..." }
// Auth: JWT admin uniquement (la CEO saisit le PAT depuis l'UI)
//
// Validation: pour chaque provider, on appelle une endpoint de vérification
// pour s'assurer que le PAT marche AVANT de le stocker.

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";

type Provider = "github" | "vercel" | "sentry" | "apollo";
const VALID_PROVIDERS: Provider[] = ["github", "vercel", "sentry", "apollo"];

interface Body {
  provider?: Provider;
  account?: string;
  token?: string;
}

interface ValidationResult {
  ok: boolean;
  account_email: string;
  account_label: string;
  scope: string;
  error?: string;
}

/** Valide un PAT Vercel via /v2/user. */
async function validateVercelPat(token: string): Promise<ValidationResult> {
  try {
    const teamId = Deno.env.get("ASVC_VERCEL_TEAM_ID");
    const url = new URL("https://api.vercel.com/v2/user");
    if (teamId) url.searchParams.set("teamId", teamId);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        account_email: "",
        account_label: "",
        scope: "",
        error: `Vercel /v2/user (${res.status}): ${text.slice(0, 200)}`,
      };
    }
    const data = await res.json();
    const user = data.user ?? data;        // selon la version d'API
    const accountEmail = (user.email as string) ?? (user.username as string) ?? "vercel-user";
    const accountLabel = (user.name as string) ?? (user.username as string) ?? accountEmail;
    return {
      ok: true,
      account_email: accountEmail,
      account_label: accountLabel,
      scope: teamId ? `team:${teamId}` : "personal",
    };
  } catch (e) {
    return {
      ok: false,
      account_email: "",
      account_label: "",
      scope: "",
      error: (e as Error).message,
    };
  }
}

/** Valide un PAT Sentry via /api/0/. Récupère l'org si possible. */
async function validateSentryPat(token: string): Promise<ValidationResult> {
  try {
    const sentryHost = Deno.env.get("ASVC_SENTRY_HOST") ?? "https://sentry.io";
    const res = await fetch(`${sentryHost}/api/0/organizations/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        account_email: "",
        account_label: "",
        scope: "",
        error: `Sentry /organizations/ (${res.status}): ${text.slice(0, 200)}`,
      };
    }
    const orgs = await res.json();
    if (!Array.isArray(orgs) || orgs.length === 0) {
      return {
        ok: false,
        account_email: "",
        account_label: "",
        scope: "",
        error: "Aucune organisation Sentry accessible avec ce token",
      };
    }
    const org = orgs[0] as { slug: string; name: string };
    return {
      ok: true,
      account_email: org.slug,                  // slug = ID stable côté Sentry
      account_label: org.name,
      scope: "org:read project:read event:read",
    };
  } catch (e) {
    return {
      ok: false,
      account_email: "",
      account_label: "",
      scope: "",
      error: (e as Error).message,
    };
  }
}

/** Valide une API key Apollo en appelant /v1/auth/health. */
async function validateApolloKey(token: string): Promise<ValidationResult> {
  try {
    const res = await fetch("https://api.apollo.io/v1/auth/health", {
      method: "POST",
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
        "X-Api-Key": token,
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        account_email: "",
        account_label: "",
        scope: "",
        error: `Apollo /v1/auth/health (${res.status}): ${text.slice(0, 200)}`,
      };
    }
    const data = await res.json().catch(() => ({} as Record<string, unknown>));
    const ok = (data as { is_logged_in?: boolean }).is_logged_in !== false;
    if (!ok) {
      return {
        ok: false, account_email: "", account_label: "", scope: "",
        error: "Apollo: clé non authentifiée (is_logged_in=false)",
      };
    }
    return {
      ok: true,
      account_email: "apollo-default",   // Apollo n'expose pas l'email via auth/health
      account_label: "Apollo workspace",
      scope: "people:enrich people:search organizations:enrich",
    };
  } catch (e) {
    return {
      ok: false,
      account_email: "",
      account_label: "",
      scope: "",
      error: (e as Error).message,
    };
  }
}

/** Valide un PAT GitHub en appelant /user et en récupérant l'identité. */
async function validateGithubPat(token: string): Promise<ValidationResult> {
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "asvc-connector",
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        account_email: "",
        account_label: "",
        scope: "",
        error: `GitHub /user (${res.status}): ${text.slice(0, 200)}`,
      };
    }
    const user = await res.json();
    // Récupère les scopes via header (uniquement disponible pour les classic PAT)
    const scopes = res.headers.get("x-oauth-scopes") ?? "";
    const tokenType = scopes ? "classic" : "fine-grained";

    return {
      ok: true,
      account_email: user.login as string,
      account_label: (user.name as string | null) ?? (user.login as string),
      scope: scopes || `fine-grained:${tokenType}`,
    };
  } catch (e) {
    return {
      ok: false,
      account_email: "",
      account_label: "",
      scope: "",
      error: (e as Error).message,
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const authz = await authorizeRequest(req);
  if (!authz.ok) return errorResponse(authz.reason, 401);
  if (authz.isCron) return errorResponse("Saisie PAT réservée à la CEO", 403);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return errorResponse("Body JSON invalide", 400);
  }

  if (!body.provider || !VALID_PROVIDERS.includes(body.provider)) {
    return errorResponse(`provider invalide: ${body.provider}`, 400);
  }
  if (!body.token || body.token.length < 10) {
    return errorResponse("token manquant ou trop court", 400);
  }

  // Valide le PAT côté serveur
  let validation: ValidationResult;
  switch (body.provider) {
    case "github":
      validation = await validateGithubPat(body.token);
      break;
    case "vercel":
      validation = await validateVercelPat(body.token);
      break;
    case "sentry":
      validation = await validateSentryPat(body.token);
      break;
    case "apollo":
      validation = await validateApolloKey(body.token);
      break;
  }

  if (!validation.ok) {
    return errorResponse(`PAT invalide : ${validation.error}`, 400);
  }

  // Stocke chiffré (refresh_token_encrypted = le PAT, qui est durable comme un refresh)
  const masterKey = Deno.env.get("APP_ENCRYPTION_KEY");
  if (!masterKey || masterKey.length < 16) {
    return errorResponse("APP_ENCRYPTION_KEY manquante côté serveur", 500);
  }

  const { error: setErr } = await supabaseAdmin.rpc("asvc_oauth_set_token", {
    p_provider: body.provider,
    p_account_email: validation.account_email,
    p_refresh_token: body.token,
    p_master_key: masterKey,
    p_access_token: null,                  // PATs sont leur propre access token
    p_expires_at: null,
    p_scope: validation.scope,
    p_account_label: validation.account_label,
  });

  if (setErr) {
    return errorResponse(`Stockage PAT échoué: ${setErr.message}`, 500);
  }

  // Audit
  await supabaseAdmin.rpc("asvc_log_audit", {
    p_actor_type: "ceo",
    p_actor_id: authz.actor,
    p_event_type: "pat_stored",
    p_resource_type: "asvc_oauth_tokens",
    p_resource_id: null,
    p_payload: {
      provider: body.provider,
      account: validation.account_email,
      scope: validation.scope,
    },
  });

  return jsonResponse({
    ok: true,
    provider: body.provider,
    account_email: validation.account_email,
    account_label: validation.account_label,
    scope: validation.scope,
  });
});
