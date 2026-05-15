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

interface SingleBody { action_id?: string }
interface BatchBody { action_ids?: string[] }
type Body = SingleBody & BatchBody;

interface ExecutionResult {
  action_id: string;
  ok: boolean;
  kind?: "internal" | "external_required";
  result?: unknown;
  error?: string;
}

async function executeOne(actionId: string, actorIsCron: boolean, actorId: string): Promise<ExecutionResult> {
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

    // Appel du dispatcher SQL
    const { data, error } = await supabaseAdmin.rpc("asvc_execute_action_internal", {
      p_action_id: actionId,
    });

    if (error) {
      // Log l'échec dans audit
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

  // Exécute en série (séquentiel pour ordre déterministe et éviter contentions)
  const results: ExecutionResult[] = [];
  for (const id of ids) {
    results.push(await executeOne(id, authz.isCron, authz.actor));
  }

  const summary = {
    total: results.length,
    succeeded_internal: results.filter((r) => r.ok && r.kind === "internal").length,
    pending_external: results.filter((r) => r.ok && r.kind === "external_required").length,
    failed: results.filter((r) => !r.ok).length,
  };

  return jsonResponse({ ok: true, summary, results });
});
