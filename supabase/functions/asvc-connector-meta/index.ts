// ASVC — Connecteur Meta (publish_post sur Facebook ou Instagram).
//
// POST /asvc-connector-meta { action_id, page_id? }
// Auth: JWT admin OU CRON_SHARED_SECRET
//
// action_type supporté : publish_post
//   - payload.channel='facebook' → publishFacebookPost (message + link optionnel)
//   - payload.channel='instagram' → publishInstagramPost (image_url requis)
//
// Si page_id non fourni : utilise la première Page connectée (getDefaultMetaPageId).

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import {
  fetchMetaCreds,
  getDefaultMetaPageId,
  publishFacebookPost,
  publishInstagramPost,
} from "../_shared/asvc/meta.ts";

interface Body {
  action_id?: string;
  page_id?: string;
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
  if (channel !== "facebook" && channel !== "instagram") {
    return errorResponse(`channel=${channel} non supporté par Meta connector (facebook|instagram attendu)`, 400);
  }

  const text = (payload.content as string | undefined)?.trim();
  if (!text) return errorResponse("content manquant dans payload", 400);

  const pageId = body.page_id ?? (await getDefaultMetaPageId());
  if (!pageId) {
    return errorResponse("Aucune Page Meta connectée. Configure-la dans /admin/asvc/connectors", 400);
  }

  let creds;
  try {
    creds = await fetchMetaCreds(pageId);
    if (!creds) return errorResponse(`Page Meta "${pageId}" introuvable`, 400);
  } catch (e) {
    return errorResponse((e as Error).message, 400);
  }

  // Construit le texte final avec hashtags (FB & IG les supportent)
  let finalText = text;
  const hashtags = payload.hashtags as string[] | undefined;
  if (hashtags && hashtags.length > 0) {
    const tagStr = hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
    finalText = `${finalText}\n\n${tagStr}`;
  }

  try {
    let executionResult: Record<string, unknown>;

    if (channel === "facebook") {
      const linkUrl = payload.link_url as string | undefined;
      // FB feed n'a pas de hard limit mais 5000 chars est une bonne pratique
      if (finalText.length > 4900) finalText = finalText.slice(0, 4895) + "[…]";
      const r = await publishFacebookPost(creds, finalText, linkUrl);
      executionResult = {
        connector: "meta",
        channel: "facebook",
        page_id: creds.page_id,
        page_name: creds.page_name,
        post_id: r.post_id,
        post_url: r.post_url,
        posted_at: r.posted_at,
      };
    } else {
      // Instagram : caption max 2200 chars (hard limit Meta)
      const imageUrl = (payload.image_url as string | undefined)
        ?? (payload.media_url as string | undefined);
      if (!imageUrl) {
        return errorResponse("Instagram requiert image_url (ou media_url) dans le payload", 400);
      }
      if (finalText.length > 2150) finalText = finalText.slice(0, 2145) + "[…]";
      const r = await publishInstagramPost(creds, imageUrl, finalText);
      executionResult = {
        connector: "meta",
        channel: "instagram",
        ig_user_id: creds.ig_user_id,
        page_id: creds.page_id,
        page_name: creds.page_name,
        media_id: r.media_id,
        container_id: r.container_id,
        post_url: r.post_url,
        posted_at: r.posted_at,
      };
    }

    // Update content_calendar si lié
    const contentId = payload.content_id as string | undefined;
    if (contentId) {
      await supabaseAdmin
        .from("asvc_content_calendar")
        .update({
          status: "published",
          published_at: executionResult.posted_at as string,
        })
        .eq("id", contentId);
    }

    // Mark action executed
    await supabaseAdmin
      .from("asvc_agent_actions")
      .update({
        status: "executed",
        executed_at: new Date().toISOString(),
        execution_result: executionResult,
      })
      .eq("id", body.action_id);

    await supabaseAdmin.rpc("asvc_oauth_mark_used", {
      p_provider: "meta",
      p_account_email: pageId,
    });

    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: `meta_${channel}_post_published`,
      p_resource_type: "asvc_agent_actions",
      p_resource_id: body.action_id,
      p_payload: executionResult,
    });

    return jsonResponse({ ok: true, action: executionResult });
  } catch (err) {
    const msg = (err as Error).message;
    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: `meta_${channel}_post_failed`,
      p_resource_type: "asvc_agent_actions",
      p_resource_id: body.action_id,
      p_payload: { channel, error: msg },
    });
    return errorResponse(`Meta ${channel} publish failed: ${msg}`, 500);
  }
});
