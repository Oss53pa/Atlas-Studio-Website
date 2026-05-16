// ASVC — Orchestrateur d'exécution des actions approuvées.
//
// POST /asvc-execute-action
//   Body unitaire: { action_id }
//   Body batch:    { action_ids: [...] }
// Auth: JWT admin OU CRON_SHARED_SECRET
//
// Dispatch:
// - Pour les action_type "internal" → appelle RPC asvc_execute_action_internal
//   (qui fait l'INSERT/UPDATE in-DB approprié et marque l'action 'executed')
// - Pour les action_type "external" → renvoie un payload "external_required"
//   structuré pour le futur connecteur, et ne marque PAS 'executed' (l'action
//   reste 'approved' pour être picked up par le connecteur)

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import { isGmailConfigured } from "../_shared/asvc/gmail.ts";
import { isGithubConfigured } from "../_shared/asvc/github.ts";
import { isVercelConfigured } from "../_shared/asvc/vercel.ts";
import { isCinetpayConfigured, isStripeConfigured, pickDefaultProvider } from "../_shared/asvc/payments.ts";
import { isWhatsappConfigured } from "../_shared/asvc/whatsapp.ts";
import { isLinkedinConfigured } from "../_shared/asvc/linkedin.ts";
import { isMetaConfigured } from "../_shared/asvc/meta.ts";
import { isMintlifyConfigured } from "../_shared/asvc/mintlify.ts";

interface SingleBody { action_id?: string }
interface BatchBody { action_ids?: string[] }
type Body = SingleBody & BatchBody;

// Action types qui peuvent être routés via Gmail si un compte est connecté.
const GMAIL_ROUTED_TYPES = new Set([
  "send_ticket_response",
  "send_customer_email",
  "send_sdr_email",
  "send_invoice_reminder",
  "send_commercial_proposal",
]);

// Action types qui peuvent être routés via GitHub si un compte est connecté.
const GITHUB_ROUTED_TYPES = new Set([
  "create_pull_request",
  "create_github_issue",
]);

// Action types qui peuvent être routés via Vercel si un compte est connecté.
const VERCEL_ROUTED_TYPES = new Set([
  "deploy_to_preview",
  "deploy_to_staging",
  "deploy_to_production",
]);

// Action types "paiement" routables via CinetPay OU Stripe selon le payload.
const PAYMENT_ROUTED_TYPES = new Set([
  "generate_invoice_payment_link",
]);

// Action types qui peuvent être routés via WhatsApp si configuré.
const WHATSAPP_ROUTED_TYPES = new Set([
  "send_whatsapp_message",
]);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function callConnector(
  name:
    | "asvc-connector-gmail"
    | "asvc-connector-github"
    | "asvc-connector-vercel"
    | "asvc-connector-cinetpay"
    | "asvc-connector-stripe"
    | "asvc-connector-whatsapp"
    | "asvc-connector-linkedin"
    | "asvc-connector-meta"
    | "asvc-connector-mintlify",
  actionId: string,
): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action_id: actionId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.error ?? `HTTP ${res.status}` };
    return { ok: true, result: data };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

interface ExecutionResult {
  action_id: string;
  ok: boolean;
  kind?: "internal" | "external_required";
  result?: unknown;
  error?: string;
}

async function executeOne(
  actionId: string,
  actorIsCron: boolean,
  actorId: string,
  gmailReady: boolean,
  githubReady: boolean,
  vercelReady: boolean,
  cinetpayReady: boolean,
  stripeReady: boolean,
  whatsappReady: boolean,
  linkedinReady: boolean,
  metaReady: boolean,
  mintlifyReady: boolean,
): Promise<ExecutionResult> {
  try {
    // Récupère le type pour décider du chemin
    const { data: action, error: aErr } = await supabaseAdmin
      .from("asvc_agent_actions")
      .select("id, action_type, status")
      .eq("id", actionId)
      .single();

    if (aErr || !action) {
      return { action_id: actionId, ok: false, error: aErr?.message ?? "Action introuvable" };
    }

    if (!["approved", "modified"].includes(action.status)) {
      return {
        action_id: actionId,
        ok: false,
        error: `Status="${action.status}", attendu "approved" ou "modified"`,
      };
    }

    // Si action_type est publish_post ET payload.channel='linkedin' ET LinkedIn connecté
    if (linkedinReady && action.action_type === "publish_post") {
      const { data: full } = await supabaseAdmin
        .from("asvc_agent_actions")
        .select("proposed_payload, modified_payload")
        .eq("id", actionId)
        .single();
      const p = (full?.modified_payload ?? full?.proposed_payload ?? {}) as Record<string, unknown>;
      if (p.channel === "linkedin") {
        const li = await callConnector("asvc-connector-linkedin", actionId);
        if (li.ok) {
          return {
            action_id: actionId,
            ok: true,
            kind: "internal",
            result: { connector: "linkedin", ...((li.result as Record<string, unknown>) ?? {}) },
          };
        }
        await supabaseAdmin.rpc("asvc_log_audit", {
          p_actor_type: actorIsCron ? "system" : "ceo",
          p_actor_id: actorId,
          p_event_type: "linkedin_failed_fallback_internal",
          p_resource_type: "asvc_agent_actions",
          p_resource_id: actionId,
          p_payload: { linkedin_error: li.error },
        });
      }
    }

    // publish_documentation via connecteur Mintlify (push GitHub + PR)
    if (mintlifyReady && action.action_type === "publish_documentation") {
      const mt = await callConnector("asvc-connector-mintlify", actionId);
      if (mt.ok) {
        return {
          action_id: actionId,
          ok: true,
          kind: "internal",
          result: { connector: "mintlify", ...((mt.result as Record<string, unknown>) ?? {}) },
        };
      }
      await supabaseAdmin.rpc("asvc_log_audit", {
        p_actor_type: actorIsCron ? "system" : "ceo",
        p_actor_id: actorId,
        p_event_type: "mintlify_failed_fallback_internal",
        p_resource_type: "asvc_agent_actions",
        p_resource_id: actionId,
        p_payload: { mintlify_error: mt.error },
      });
    }

    // publish_post sur Facebook ou Instagram via connecteur Meta
    if (metaReady && action.action_type === "publish_post") {
      const { data: full } = await supabaseAdmin
        .from("asvc_agent_actions")
        .select("proposed_payload, modified_payload")
        .eq("id", actionId)
        .single();
      const p = (full?.modified_payload ?? full?.proposed_payload ?? {}) as Record<string, unknown>;
      if (p.channel === "facebook" || p.channel === "instagram") {
        const m = await callConnector("asvc-connector-meta", actionId);
        if (m.ok) {
          return {
            action_id: actionId,
            ok: true,
            kind: "internal",
            result: { connector: "meta", ...((m.result as Record<string, unknown>) ?? {}) },
          };
        }
        await supabaseAdmin.rpc("asvc_log_audit", {
          p_actor_type: actorIsCron ? "system" : "ceo",
          p_actor_id: actorId,
          p_event_type: "meta_failed_fallback_internal",
          p_resource_type: "asvc_agent_actions",
          p_resource_id: actionId,
          p_payload: { meta_error: m.error, channel: p.channel },
        });
      }
    }

    // Si action_type est send_whatsapp_message ET WhatsApp configuré → connecteur
    if (whatsappReady && WHATSAPP_ROUTED_TYPES.has(action.action_type)) {
      const wa = await callConnector("asvc-connector-whatsapp", actionId);
      if (wa.ok) {
        return {
          action_id: actionId,
          ok: true,
          kind: "internal",
          result: { connector: "whatsapp", ...((wa.result as Record<string, unknown>) ?? {}) },
        };
      }
      await supabaseAdmin.rpc("asvc_log_audit", {
        p_actor_type: actorIsCron ? "system" : "ceo",
        p_actor_id: actorId,
        p_event_type: "whatsapp_failed_fallback_internal",
        p_resource_type: "asvc_agent_actions",
        p_resource_id: actionId,
        p_payload: { whatsapp_error: wa.error },
      });
    }

    // Pour send_ticket_response : si le ticket source=whatsapp ET WhatsApp configuré,
    // route via WhatsApp AU LIEU de Gmail.
    if (whatsappReady && action.action_type === "send_ticket_response") {
      const { data: full } = await supabaseAdmin
        .from("asvc_agent_actions")
        .select("proposed_payload")
        .eq("id", actionId)
        .single();
      const tid = (full?.proposed_payload as { ticket_id?: string } | null)?.ticket_id;
      if (tid) {
        const { data: t } = await supabaseAdmin
          .from("asvc_tickets")
          .select("source")
          .eq("id", tid)
          .maybeSingle();
        if (t?.source === "whatsapp") {
          const wa = await callConnector("asvc-connector-whatsapp", actionId);
          if (wa.ok) {
            return {
              action_id: actionId,
              ok: true,
              kind: "internal",
              result: { connector: "whatsapp", ...((wa.result as Record<string, unknown>) ?? {}) },
            };
          }
          // Si fail, on tombe sur Gmail comme fallback (si dispo)
          await supabaseAdmin.rpc("asvc_log_audit", {
            p_actor_type: actorIsCron ? "system" : "ceo",
            p_actor_id: actorId,
            p_event_type: "whatsapp_ticket_failed_fallback_gmail",
            p_resource_type: "asvc_agent_actions",
            p_resource_id: actionId,
            p_payload: { whatsapp_error: wa.error },
          });
        }
      }
    }

    // Si action_type routable via Gmail ET un compte est connecté → connecteur
    if (gmailReady && GMAIL_ROUTED_TYPES.has(action.action_type)) {
      const gmail = await callConnector("asvc-connector-gmail", actionId);
      if (gmail.ok) {
        return {
          action_id: actionId,
          ok: true,
          kind: "internal",
          result: { connector: "gmail", ...((gmail.result as Record<string, unknown>) ?? {}) },
        };
      }
      await supabaseAdmin.rpc("asvc_log_audit", {
        p_actor_type: actorIsCron ? "system" : "ceo",
        p_actor_id: actorId,
        p_event_type: "gmail_failed_fallback_internal",
        p_resource_type: "asvc_agent_actions",
        p_resource_id: actionId,
        p_payload: { gmail_error: gmail.error },
      });
    }

    // Si action_type routable via GitHub ET un compte est connecté → connecteur
    if (githubReady && GITHUB_ROUTED_TYPES.has(action.action_type)) {
      const github = await callConnector("asvc-connector-github", actionId);
      if (github.ok) {
        return {
          action_id: actionId,
          ok: true,
          kind: "internal",
          result: { connector: "github", ...((github.result as Record<string, unknown>) ?? {}) },
        };
      }
      // Fallback: dispatcher SQL marquera la PR 'preview_ready' (stub interne)
      await supabaseAdmin.rpc("asvc_log_audit", {
        p_actor_type: actorIsCron ? "system" : "ceo",
        p_actor_id: actorId,
        p_event_type: "github_failed_fallback_internal",
        p_resource_type: "asvc_agent_actions",
        p_resource_id: actionId,
        p_payload: { github_error: github.error },
      });
    }

    // Si action_type est de la famille "paiement" → choisit cinetpay vs stripe
    // selon payload.payment_provider (override) ou pickDefaultProvider(country).
    if (PAYMENT_ROUTED_TYPES.has(action.action_type)) {
      // Charge le payload pour décider
      const { data: full } = await supabaseAdmin
        .from("asvc_agent_actions")
        .select("proposed_payload, modified_payload")
        .eq("id", actionId)
        .single();
      const p = (full?.modified_payload ?? full?.proposed_payload ?? {}) as Record<string, unknown>;
      const explicitProvider = p.payment_provider as "stripe" | "cinetpay" | undefined;
      const invoiceId = p.invoice_id as string | undefined;

      let provider: "stripe" | "cinetpay" =
        explicitProvider === "stripe" || explicitProvider === "cinetpay"
          ? explicitProvider
          : "cinetpay";

      if (!explicitProvider && invoiceId) {
        try {
          provider = await pickDefaultProvider(invoiceId);
        } catch { /* fallback cinetpay */ }
      }

      // Bascule si le provider choisi n'est pas configuré
      if (provider === "stripe" && !stripeReady && cinetpayReady) provider = "cinetpay";
      if (provider === "cinetpay" && !cinetpayReady && stripeReady) provider = "stripe";

      if ((provider === "cinetpay" && cinetpayReady) || (provider === "stripe" && stripeReady)) {
        const connectorName = provider === "stripe" ? "asvc-connector-stripe" : "asvc-connector-cinetpay";
        const pay = await callConnector(connectorName, actionId);
        if (pay.ok) {
          return {
            action_id: actionId,
            ok: true,
            kind: "internal",
            result: { connector: provider, ...((pay.result as Record<string, unknown>) ?? {}) },
          };
        }
        await supabaseAdmin.rpc("asvc_log_audit", {
          p_actor_type: actorIsCron ? "system" : "ceo",
          p_actor_id: actorId,
          p_event_type: `${provider}_failed_fallback_internal`,
          p_resource_type: "asvc_agent_actions",
          p_resource_id: actionId,
          p_payload: { error: pay.error },
        });
      }
    }

    // Si action_type routable via Vercel ET un compte est connecté → connecteur
    if (vercelReady && VERCEL_ROUTED_TYPES.has(action.action_type)) {
      const vercel = await callConnector("asvc-connector-vercel", actionId);
      if (vercel.ok) {
        return {
          action_id: actionId,
          ok: true,
          kind: "internal",
          result: { connector: "vercel", ...((vercel.result as Record<string, unknown>) ?? {}) },
        };
      }
      // Fallback: dispatcher SQL marquera le deployment 'success' (stub interne)
      await supabaseAdmin.rpc("asvc_log_audit", {
        p_actor_type: actorIsCron ? "system" : "ceo",
        p_actor_id: actorId,
        p_event_type: "vercel_failed_fallback_internal",
        p_resource_type: "asvc_agent_actions",
        p_resource_id: actionId,
        p_payload: { vercel_error: vercel.error },
      });
    }

    // Dispatcher SQL (in-system OU external_required pour types non couverts)
    const { data, error } = await supabaseAdmin.rpc("asvc_execute_action_internal", {
      p_action_id: actionId,
    });

    if (error) {
      await supabaseAdmin.rpc("asvc_log_audit", {
        p_actor_type: actorIsCron ? "system" : "ceo",
        p_actor_id: actorId,
        p_event_type: "action_execution_failed",
        p_resource_type: "asvc_agent_actions",
        p_resource_id: actionId,
        p_payload: { error: error.message },
      });
      return { action_id: actionId, ok: false, error: error.message };
    }

    const result = data as { kind?: string };
    return {
      action_id: actionId,
      ok: true,
      kind: result?.kind === "external_required" ? "external_required" : "internal",
      result,
    };
  } catch (err) {
    return {
      action_id: actionId,
      ok: false,
      error: (err as Error).message,
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const authz = await authorizeRequest(req);
  if (!authz.ok) return errorResponse(authz.reason, 401);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return errorResponse("Body JSON invalide", 400);
  }

  // Mode batch ou unitaire
  const ids: string[] = body.action_ids ?? (body.action_id ? [body.action_id] : []);
  if (ids.length === 0) {
    return errorResponse("action_id ou action_ids requis", 400);
  }
  if (ids.length > 50) {
    return errorResponse("Maximum 50 actions par batch", 400);
  }

  // Audit du déclenchement global
  await supabaseAdmin.rpc("asvc_log_audit", {
    p_actor_type: authz.isCron ? "system" : "ceo",
    p_actor_id: authz.actor,
    p_event_type: "execution_orchestrator_triggered",
    p_resource_type: "asvc_agent_actions",
    p_resource_id: null,
    p_payload: { batch_size: ids.length },
  });

  // Pré-check connecteurs (1 fois pour tout le batch)
  const [gmailReady, githubReady, vercelReady, linkedinReady, metaReady, mintlifyReady] = await Promise.all([
    isGmailConfigured().catch(() => false),
    isGithubConfigured().catch(() => false),
    isVercelConfigured().catch(() => false),
    isLinkedinConfigured().catch(() => false),
    isMetaConfigured().catch(() => false),
    isMintlifyConfigured().catch(() => false),
  ]);
  const cinetpayReady = isCinetpayConfigured();
  const stripeReady = isStripeConfigured();
  const whatsappReady = isWhatsappConfigured();

  // Exécute en série (séquentiel pour ordre déterministe et éviter contentions)
  const results: ExecutionResult[] = [];
  for (const id of ids) {
    results.push(await executeOne(
      id, authz.isCron, authz.actor,
      gmailReady, githubReady, vercelReady, cinetpayReady, stripeReady, whatsappReady, linkedinReady, metaReady, mintlifyReady,
    ));
  }

  const summary = {
    total: results.length,
    succeeded_internal: results.filter((r) => r.ok && r.kind === "internal").length,
    pending_external: results.filter((r) => r.ok && r.kind === "external_required").length,
    failed: results.filter((r) => !r.ok).length,
  };

  return jsonResponse({ ok: true, summary, results });
});
