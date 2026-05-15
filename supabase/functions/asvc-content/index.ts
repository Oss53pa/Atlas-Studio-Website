// ASVC — Content Agent endpoint.
// POST /asvc-content
// Body: { channel, topic, scheduled_at?, context? }

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import { draftPost, type ContentChannel } from "../_shared/asvc/content.ts";

interface Body {
  channel?: ContentChannel;
  topic?: string;
  scheduled_at?: string;
  context?: string;
}

const VALID_CHANNELS: ContentChannel[] = [
  "linkedin", "x", "instagram", "facebook", "newsletter", "blog",
];

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
  if (!body.channel || !VALID_CHANNELS.includes(body.channel)) {
    return errorResponse(`channel invalide: ${body.channel}`, 400);
  }
  if (!body.topic || body.topic.trim().length < 5) {
    return errorResponse("topic requis (5 caractères min)", 400);
  }

  try {
    const result = await draftPost({
      channel: body.channel,
      topic: body.topic.trim(),
      scheduledAt: body.scheduled_at,
      context: body.context,
    });

    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "content_triggered",
      p_resource_type: "asvc_content_calendar",
      p_resource_id: result.contentId,
      p_payload: { action_id: result.actionId, channel: result.channel },
    });

    return jsonResponse({
      ok: true,
      action: {
        id: result.actionId,
        content_id: result.contentId,
        channel: result.channel,
        title: result.title,
        content: result.content,
        hashtags: result.hashtags,
        image_prompt: result.imagePrompt,
        subject_line: result.subjectLine,
        rationale: result.rationale,
        tokens_used: result.tokensUsed,
      },
    });
  } catch (err) {
    return errorResponse(`content draft failed: ${(err as Error).message}`);
  }
});
