// ASVC — Connecteur LinkedIn (publish_post sur LinkedIn).
//
// POST /asvc-connector-linkedin { action_id, account? }
// Auth: JWT admin OU CRON_SHARED_SECRET
//
// action_type supporté : publish_post — uniquement si payload.channel='linkedin'

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import {
  fetchLinkedinCreds,
  getDefaultLinkedinAccount,
  publishLinkedinUgcPost,
} from "../_shared/asvc/linkedin.ts";

interface Body {
  action_id?: string;
  account?: string;
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
  if (action.action_type !== "publish_post") {
    return errorResponse(`action_type non supporté: ${action.action_type}`, 400);
  }

  const payload = (action.modified_payload ?? action.proposed_payload) as Record<string, unknown>;
  const channel = payload.channel as string | undefined;
  if (channel !== "linkedin") {
    return errorResponse(`channel=${channel} non supporté par LinkedIn connector`, 400);
  }

  const text = (payload.content as string | undefined)?.trim();
  if (!text) return errorResponse("content manquant dans payload", 400);

  const account = body.account ?? (await getDefaultLinkedinAccount());
  if (!account) {
    return errorResponse(
      "Aucun compte LinkedIn connecté. Configure-le dans /admin/asvc/connectors",
      400,
    );
  }

  let creds;
  try {
    creds = await fetchLinkedinCreds(account);
    if (!creds) return errorResponse(`Compte LinkedIn "${account}" introuvable`, 400);
  } catch (e) {
    return errorResponse((e as Error).message, 400);
  }

  try {
    // LinkedIn limite à ~3000 chars dans shareCommentary. On tronque par sécurité.
    let finalText = text;
    const hashtags = payload.hashtags as string[] | undefined;
    if (hashtags && hashtags.length > 0) {
      const tagStr = hashtags
        .map((h) => (h.startsWith("#") ? h : `#${h}`))
        .join(" ");
      finalText = `${finalText}\n\n${tagStr}`;
    }
    if (finalText.length > 2900) finalText = finalText.slice(0, 2895) + "[…]";

    const result = await publishLinkedinUgcPost(creds, finalText);

    // Update content_calendar
    const contentId = payload.content_id as string | undefined;
    if (contentId) {
      await supabaseAdmin
        .from("asvc_content_calendar")
        .update({
          status: "published",
          published_at: result.posted_at,
        })
        .eq("id", contentId);
    }

    // Mark action executed
    await supabaseAdmin
      .from("asvc_agent_actions")
      .update({
        status: "executed",
        executed_at: new Date().toISOString(),
        execution_result: {
          connector: "linkedin",
          ugc_post_id: result.ugc_post_id,
          post_url: result.post_url,
          from_account: account,
          posted_at: result.posted_at,
        },
      })
      .eq("id", body.action_id);

    await supabaseAdmin.rpc("asvc_oauth_mark_used", {
      p_provider: "linkedin",
      p_account_email: account,
    });

    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "linkedin_post_published",
      p_resource_type: "asvc_agent_actions",
      p_resource_id: body.action_id,
      p_payload: {
        ugc_post_id: result.ugc_post_id,
        post_url: result.post_url,
        chars: finalText.length,
      },
    });

    return jsonResponse({
      ok: true,
      action: {
        id: body.action_id,
        ugc_post_id: result.ugc_post_id,
        post_url: result.post_url,
      },
    });
  } catch (err) {
    const msg = (err as Error).message;
    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "linkedin_post_failed",
      p_resource_type: "asvc_agent_actions",
      p_resource_id: body.action_id,
      p_payload: { error: msg },
    });
    return errorResponse(`LinkedIn publish failed: ${msg}`, 500);
  }
});
