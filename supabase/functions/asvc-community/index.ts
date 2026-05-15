// ASVC — Community Agent endpoint.
// Appelé par les webhooks réseaux sociaux (LinkedIn / X / Meta) OU manuellement.
//
// POST /asvc-community
// Body: { channel, author_handle, message, message_type, author_display_name?, original_post_url?, followers_count? }

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import { handleCommunityMessage, type SocialChannel, type CommunityInbound } from "../_shared/asvc/community.ts";

const VALID_CHANNELS: SocialChannel[] = ["linkedin", "x", "instagram", "facebook"];
const VALID_TYPES = ["comment", "dm", "mention"] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const authz = await authorizeRequest(req);
  if (!authz.ok) return errorResponse(authz.reason, 401);

  let body: Partial<CommunityInbound>;
  try {
    body = (await req.json()) as Partial<CommunityInbound>;
  } catch {
    return errorResponse("Body JSON invalide", 400);
  }

  if (!body.channel || !VALID_CHANNELS.includes(body.channel)) {
    return errorResponse(`channel invalide: ${body.channel}`, 400);
  }
  if (!body.author_handle) return errorResponse("author_handle requis", 400);
  if (!body.message || body.message.trim().length === 0) {
    return errorResponse("message requis", 400);
  }
  if (!body.message_type || !VALID_TYPES.includes(body.message_type)) {
    return errorResponse(`message_type invalide: ${body.message_type}`, 400);
  }

  try {
    const result = await handleCommunityMessage({
      channel: body.channel,
      author_handle: body.author_handle,
      author_display_name: body.author_display_name,
      message: body.message,
      message_type: body.message_type,
      original_post_url: body.original_post_url,
      followers_count: body.followers_count,
    });

    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "community_triggered",
      p_resource_type: "asvc_agent_actions",
      p_resource_id: result.actionId,
      p_payload: { channel: body.channel, author: body.author_handle },
    });

    return jsonResponse({
      ok: true,
      action: {
        id: result.actionId,
        classification: result.classification,
        reply_text: result.replyText,
        rationale: result.rationale,
        tokens_used: result.tokensUsed,
      },
    });
  } catch (err) {
    return errorResponse(`community failed: ${(err as Error).message}`);
  }
});
