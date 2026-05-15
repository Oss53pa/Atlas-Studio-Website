// ASVC v2.0 — Documentation Agent endpoint.
// POST /asvc-documentation { app_name, doc_type, language, version, spec_id?, pr_id?, custom_brief? }

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import { draftDocumentation, type DocType } from "../_shared/asvc/documentation.ts";

const VALID_TYPES: DocType[] = [
  "user_guide", "api_reference", "changelog", "tutorial_script",
  "release_notes", "admin_guide", "troubleshooting",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const authz = await authorizeRequest(req);
  if (!authz.ok) return errorResponse(authz.reason, 401);

  let body: {
    app_name?: string;
    doc_type?: DocType;
    language?: "fr" | "en";
    version?: string;
    spec_id?: string;
    pr_id?: string;
    custom_brief?: string;
  };
  try { body = await req.json(); } catch { return errorResponse("Body JSON invalide", 400); }
  if (!body.app_name) return errorResponse("app_name requis", 400);
  if (!body.doc_type || !VALID_TYPES.includes(body.doc_type)) {
    return errorResponse(`doc_type invalide: ${body.doc_type}`, 400);
  }
  if (!body.language || !["fr", "en"].includes(body.language)) {
    return errorResponse(`language invalide: ${body.language}`, 400);
  }
  if (!body.version) return errorResponse("version requis", 400);

  try {
    const result = await draftDocumentation({
      appName: body.app_name,
      docType: body.doc_type,
      language: body.language,
      version: body.version,
      specId: body.spec_id,
      prId: body.pr_id,
      customBrief: body.custom_brief,
    });
    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "documentation_triggered",
      p_resource_type: "asvc_documentation_artifacts",
      p_resource_id: result.docId,
      p_payload: { action_id: result.actionId, doc_type: result.docType, language: result.language },
    });
    return jsonResponse({ ok: true, action: result });
  } catch (err) {
    return errorResponse(`documentation failed: ${(err as Error).message}`);
  }
});
