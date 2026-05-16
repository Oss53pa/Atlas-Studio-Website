// ASVC — Connecteur Mintlify (publish_documentation).
//
// POST /asvc-connector-mintlify { action_id }
// Auth: JWT admin OU CRON_SHARED_SECRET
//
// action_type supporté : publish_documentation
//   payload requis : app_name, doc_type, language, version, title, content_markdown
//   payload optionnel : screenshots_suggested
//
// Push le MDX dans le repo configuré ASVC_MINTLIFY_DOCS_REPO via GitHub PAT,
// crée une branche, ouvre une PR. Mintlify auto-rebuild au merge.

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import { publishDocToMintlifyRepo, type DocPayload } from "../_shared/asvc/mintlify.ts";

interface Body {
  action_id?: string;
}

interface ActionRow {
  id: string;
  action_type: string;
  status: string;
  proposed_payload: Record<string, unknown>;
  modified_payload: Record<string, unknown> | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const authz = await authorizeRequest(req);
  if (!authz.ok) return errorResponse(authz.reason, 401);

  let body: Body;
  try { body = await req.json(); } catch { return errorResponse("Body JSON invalide", 400); }
  if (!body.action_id) return errorResponse("action_id requis", 400);

  const { data, error } = await supabaseAdmin
    .from("asvc_agent_actions")
    .select("id, action_type, status, proposed_payload, modified_payload")
    .eq("id", body.action_id)
    .single();
  if (error || !data) return errorResponse(`Action introuvable: ${error?.message ?? body.action_id}`, 404);
  const action = data as ActionRow;
  if (!["approved", "modified"].includes(action.status)) {
    return errorResponse(`Action non approuvée (status=${action.status})`, 400);
  }
  if (action.action_type !== "publish_documentation") {
    return errorResponse(`action_type non supporté: ${action.action_type}`, 400);
  }

  const payload = (action.modified_payload ?? action.proposed_payload) as Record<string, unknown>;

  // Validation payload
  const p: DocPayload = {
    app_name: String(payload.app_name ?? "").trim(),
    doc_type: String(payload.doc_type ?? "").trim(),
    language: String(payload.language ?? "fr").trim() as DocPayload["language"],
    version: String(payload.version ?? "0.0.0").trim(),
    title: String(payload.title ?? "").trim(),
    content_markdown: String(payload.content_markdown ?? "").trim(),
    screenshots_suggested: payload.screenshots_suggested as DocPayload["screenshots_suggested"],
  };
  if (!p.app_name) return errorResponse("payload.app_name manquant", 400);
  if (!p.doc_type) return errorResponse("payload.doc_type manquant", 400);
  if (!p.title) return errorResponse("payload.title manquant", 400);
  if (!p.content_markdown) return errorResponse("payload.content_markdown manquant", 400);

  try {
    const result = await publishDocToMintlifyRepo(p);

    // Update asvc_documentation_artifacts si lié
    const docId = payload.doc_id as string | undefined;
    if (docId) {
      await supabaseAdmin
        .from("asvc_documentation_artifacts")
        .update({
          status: "published",
          published_url: result.pr_url,
          published_at: new Date().toISOString(),
        })
        .eq("id", docId);
    }

    // Mark action executed
    await supabaseAdmin
      .from("asvc_agent_actions")
      .update({
        status: "executed",
        executed_at: new Date().toISOString(),
        execution_result: {
          connector: "mintlify",
          repo: result.repo,
          pr_number: result.pr_number,
          pr_url: result.pr_url,
          branch: result.branch,
          file_path: result.file_path,
        },
      })
      .eq("id", body.action_id);

    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "mintlify_doc_published",
      p_resource_type: "asvc_agent_actions",
      p_resource_id: body.action_id,
      p_payload: {
        repo: result.repo,
        pr_number: result.pr_number,
        pr_url: result.pr_url,
        file_path: result.file_path,
        app_name: p.app_name,
        doc_type: p.doc_type,
        language: p.language,
      },
    });

    return jsonResponse({ ok: true, action: result });
  } catch (err) {
    const msg = (err as Error).message;
    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "mintlify_doc_failed",
      p_resource_type: "asvc_agent_actions",
      p_resource_id: body.action_id,
      p_payload: { error: msg },
    });
    return errorResponse(`Mintlify publish failed: ${msg}`, 500);
  }
});
