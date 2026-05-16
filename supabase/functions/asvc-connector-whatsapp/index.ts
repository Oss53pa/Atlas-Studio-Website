// ASVC — Connecteur WhatsApp Business (Meta Cloud API).
//
// POST /asvc-connector-whatsapp { action_id }
// Auth: JWT admin OU CRON_SHARED_SECRET
//
// action_types supportés :
//   - send_whatsapp_message    : SDR / Community / Support sur WA
//   - send_ticket_response     : SI le ticket source = 'whatsapp'
//
// 24h-rule Meta : si destinataire n'a pas écrit depuis 24h, Meta refuse
// le texte brut. L'erreur Meta est remontée tel quel pour visibilité CEO.

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import { sendWhatsappText, isWhatsappConfigured } from "../_shared/asvc/whatsapp.ts";

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

interface ExtractedMessage {
  to: string;
  body: string;
}

async function extractWhatsappFields(action: ActionRow): Promise<ExtractedMessage> {
  const p = (action.modified_payload ?? action.proposed_payload) as Record<string, unknown>;
  const get = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");

  switch (action.action_type) {
    case "send_whatsapp_message": {
      const to = get("contact_phone") || get("to_phone") || get("to") || get("author_handle");
      const body = get("body") || get("reply_text") || get("message") || "";
      if (!to) throw new Error("Numéro destinataire manquant dans payload (contact_phone / to)");
      if (!body) throw new Error("Body / message manquant dans payload");
      return { to, body };
    }
    case "send_ticket_response": {
      const ticketId = get("ticket_id");
      // Récupère le numéro depuis le ticket si pas dans le payload
      let to = get("client_phone") || get("client_email");          // client_email peut être un numéro
      if (!to && ticketId) {
        const { data: ticket } = await supabaseAdmin
          .from("asvc_tickets")
          .select("client_email, source, source_message_id")
          .eq("id", ticketId)
          .maybeSingle();
        if (ticket?.source !== "whatsapp") {
          throw new Error(`Ticket source != 'whatsapp' (source=${ticket?.source}) — route via Gmail`);
        }
        // Pour WhatsApp, le client_email stocke souvent le numéro
        to = (ticket?.client_email as string | null) ?? "";
      }
      const body = get("response_text");
      if (!to) throw new Error("client_phone introuvable (ticket non WhatsApp ?)");
      if (!body) throw new Error("response_text manquant");
      return { to, body };
    }
    default:
      throw new Error(`action_type non supporté par WhatsApp connector: ${action.action_type}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const authz = await authorizeRequest(req);
  if (!authz.ok) return errorResponse(authz.reason, 401);

  let body: Body;
  try { body = await req.json(); } catch { return errorResponse("Body JSON invalide", 400); }
  if (!body.action_id) return errorResponse("action_id requis", 400);

  if (!isWhatsappConfigured()) {
    return errorResponse(
      "WhatsApp non configuré (WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID manquants)",
      400,
    );
  }

  // Charge l'action
  const { data: actionData, error: actErr } = await supabaseAdmin
    .from("asvc_agent_actions")
    .select("id, action_type, status, proposed_payload, modified_payload")
    .eq("id", body.action_id)
    .single();
  if (actErr || !actionData) {
    return errorResponse(`Action introuvable: ${actErr?.message ?? body.action_id}`, 404);
  }
  const action = actionData as ActionRow;

  if (!["approved", "modified"].includes(action.status)) {
    return errorResponse(`Action non approuvée (status=${action.status})`, 400);
  }

  let extracted: ExtractedMessage;
  try {
    extracted = await extractWhatsappFields(action);
  } catch (e) {
    return errorResponse((e as Error).message, 400);
  }

  try {
    const result = await sendWhatsappText(extracted);

    await supabaseAdmin
      .from("asvc_agent_actions")
      .update({
        status: "executed",
        executed_at: new Date().toISOString(),
        execution_result: {
          connector: "whatsapp",
          message_id: result.message_id,
          to: result.to,
          sent_at: result.sent_at,
        },
      })
      .eq("id", body.action_id);

    // Side-effects pour send_ticket_response WhatsApp
    if (action.action_type === "send_ticket_response") {
      const ticketId = (action.proposed_payload as { ticket_id?: string }).ticket_id;
      if (ticketId) {
        await supabaseAdmin.from("asvc_ticket_messages").insert({
          ticket_id: ticketId,
          sender_type: "agent",
          sender_id: "support_n1",
          content: extracted.body,
          related_action_id: body.action_id,
          attachments: [{ type: "whatsapp_message_id", value: result.message_id }],
        });
        await supabaseAdmin
          .from("asvc_tickets")
          .update({ status: "waiting_client", updated_at: new Date().toISOString() })
          .eq("id", ticketId);
      }
    }

    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "whatsapp_sent",
      p_resource_type: "asvc_agent_actions",
      p_resource_id: body.action_id,
      p_payload: { message_id: result.message_id, to: result.to, action_type: action.action_type },
    });

    return jsonResponse({
      ok: true,
      action: {
        id: body.action_id,
        message_id: result.message_id,
        to: result.to,
      },
    });
  } catch (err) {
    const msg = (err as Error).message;
    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "whatsapp_send_failed",
      p_resource_type: "asvc_agent_actions",
      p_resource_id: body.action_id,
      p_payload: { error: msg, to: extracted.to, action_type: action.action_type },
    });
    return errorResponse(`WhatsApp send failed: ${msg}`, 500);
  }
});
