// ASVC — WhatsApp webhook public (Meta Cloud API).
//
// GET /asvc-whatsapp-webhook — handshake initial Meta (verify_token)
// POST /asvc-whatsapp-webhook — messages entrants (signed via X-Hub-Signature-256)
//
// Side-effect des POST: crée un asvc_ticket avec source='whatsapp' si message
// d'un nouveau contact, ou ajoute un asvc_ticket_message à un ticket existant.

import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { verifyMetaSignature } from "../_shared/asvc/whatsapp.ts";

function plain(status: number, msg: string): Response {
  return new Response(msg, { status, headers: { ...corsHeaders, "Content-Type": "text/plain" } });
}
function jsonRes(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface IncomingMessage {
  from: string;                                // "221770000000" sans +
  id: string;
  timestamp: string;
  type: "text" | "image" | "audio" | "video" | "document" | "interactive" | string;
  text?: { body: string };
  image?: { id: string; caption?: string };
}

interface WebhookValue {
  metadata?: { display_phone_number?: string; phone_number_id?: string };
  contacts?: Array<{ profile?: { name?: string }; wa_id: string }>;
  messages?: IncomingMessage[];
  statuses?: Array<{ id: string; status: string; recipient_id?: string }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // ─── GET: handshake Meta (verify_token) ─────────────────────────────────
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const expectedToken = Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN");

    if (mode === "subscribe" && token && expectedToken && token === expectedToken && challenge) {
      return new Response(challenge, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }
    return plain(403, "verify failed");
  }

  if (req.method !== "POST") return plain(405, "method not allowed");

  // ─── POST: incoming message ─────────────────────────────────────────────
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  const sigOk = await verifyMetaSignature(rawBody, signature);
  if (!sigOk) {
    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: "external",
      p_actor_id: "whatsapp_webhook",
      p_event_type: "whatsapp_webhook_signature_failed",
      p_resource_type: null,
      p_resource_id: null,
      p_payload: { signature_header_present: !!signature },
    });
    return plain(401, "invalid signature");
  }

  let payload: { entry?: Array<{ changes?: Array<{ value?: WebhookValue }> }> };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return plain(400, "invalid json");
  }

  const results: Array<{ from: string; ticket_id?: string; action?: string; error?: string }> = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const messages = value?.messages ?? [];
      const contacts = value?.contacts ?? [];

      for (const msg of messages) {
        try {
          const fromPhone = `+${msg.from}`;
          const contact = contacts.find((c) => c.wa_id === msg.from);
          const contactName = contact?.profile?.name ?? null;

          // Récupère le contenu du message (texte uniquement pour ce MVP)
          let content: string | null = null;
          if (msg.type === "text") {
            content = msg.text?.body ?? null;
          } else if (msg.type === "image" && msg.image?.caption) {
            content = `[image] ${msg.image.caption}`;
          } else {
            content = `[message ${msg.type}]`;
          }
          if (!content) {
            results.push({ from: fromPhone, action: "skipped_no_content" });
            continue;
          }

          // Cherche un ticket open/in_progress existant pour ce numéro
          const { data: existing } = await supabaseAdmin
            .from("asvc_tickets")
            .select("id, status")
            .eq("source", "whatsapp")
            .eq("client_email", fromPhone)   // client_email stocke le tel pour WA
            .in("status", ["open", "in_progress", "waiting_client"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          let ticketId: string;
          if (existing?.id) {
            ticketId = existing.id;
            await supabaseAdmin.from("asvc_ticket_messages").insert({
              ticket_id: ticketId,
              sender_type: "client",
              sender_id: msg.from,
              content,
              attachments: [{ type: "whatsapp_message_id", value: msg.id }],
            });
            // Réouvre si attendait le client
            if (existing.status === "waiting_client") {
              await supabaseAdmin
                .from("asvc_tickets")
                .update({ status: "in_progress", updated_at: new Date().toISOString() })
                .eq("id", ticketId);
            }
            results.push({ from: fromPhone, ticket_id: ticketId, action: "appended_message" });
          } else {
            // Nouveau ticket
            const ticketNumber = `WA-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)
              .toString()
              .padStart(3, "0")}`;
            const { data: created, error: insErr } = await supabaseAdmin
              .from("asvc_tickets")
              .insert({
                ticket_number: ticketNumber,
                source: "whatsapp",
                source_message_id: msg.id,
                client_email: fromPhone,
                client_name: contactName,
                initial_message: content,
                category: "question",
                priority: "normal",
                status: "open",
              })
              .select("id")
              .single();
            if (insErr) throw new Error(`Insert ticket: ${insErr.message}`);
            ticketId = created!.id as string;
            results.push({ from: fromPhone, ticket_id: ticketId, action: "ticket_created" });
          }

          // Audit
          await supabaseAdmin.rpc("asvc_log_audit", {
            p_actor_type: "external",
            p_actor_id: "whatsapp_webhook",
            p_event_type: "whatsapp_message_received",
            p_resource_type: "asvc_tickets",
            p_resource_id: ticketId,
            p_payload: {
              from: fromPhone,
              wa_message_id: msg.id,
              message_type: msg.type,
            },
          });
        } catch (e) {
          results.push({ from: msg.from, error: (e as Error).message });
        }
      }

      // Status updates (delivered/read pour nos messages sortants) — log uniquement
      for (const s of value?.statuses ?? []) {
        await supabaseAdmin.rpc("asvc_log_audit", {
          p_actor_type: "external",
          p_actor_id: "whatsapp_webhook",
          p_event_type: `whatsapp_status_${s.status}`,
          p_resource_type: null,
          p_resource_id: null,
          p_payload: { wa_message_id: s.id, recipient: s.recipient_id },
        });
      }
    }
  }

  return jsonRes({ ok: true, results });
});
