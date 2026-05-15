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

type Provider = "github";
const VALID_PROVIDERS: Provider[] = ["github"];

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
