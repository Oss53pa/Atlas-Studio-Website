// ASVC — COO Agent: génération de briefs.
//
// Endpoint POST: génère un brief (morning|evening|weekly).
//
// Auth (2 modes acceptés):
//   1. JWT admin (header Authorization: Bearer <jwt>) — déclenchement manuel
//      depuis l'UI. Vérifié via supabase.auth.getUser() + is_admin().
//   2. Shared secret cron — Authorization: Bearer <CRON_SHARED_SECRET> —
//      pour pg_cron / GitHub Actions.
//
// Body: { type: "morning" | "evening" | "weekly" }
//
// Réponse: { ok: true, brief: { id, type, date, summary, tokens_used, model } }

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import { generateBrief, type BriefType } from "../_shared/asvc/brief.ts";

interface Body {
  type?: BriefType;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const authz = await authorizeRequest(req);
  if (!authz.ok) return errorResponse(authz.reason, 401);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return errorResponse("Body JSON invalide", 400);
  }

  const type = body.type ?? "morning";
  if (!["morning", "evening", "weekly"].includes(type)) {
    return errorResponse(`type invalide: ${type}`, 400);
  }

  try {
    const result = await generateBrief(type);

    // Audit du déclenchement (séparé de l'audit interne de generateBrief
    // qui logge le succès de la génération côté COO).
    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "brief_triggered",
      p_resource_type: "asvc_coo_briefs",
      p_resource_id: result.briefId,
      p_payload: { type },
    });

    return jsonResponse({
      ok: true,
      brief: {
        id: result.briefId,
        type: result.briefType,
        date: result.briefDate,
        summary: result.summary,
        tokens_used: result.tokensUsed,
        model: result.model,
      },
    });
  } catch (err) {
    const msg = (err as Error).message;
    return errorResponse(`brief generation failed: ${msg}`);
  }
});
