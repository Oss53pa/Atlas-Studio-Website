// ASVC — Connecteur Resend (envoie une action email approuvée via Resend).
//
// POST /asvc-connector-resend { action_id }
// Auth: JWT admin OU CRON_SHARED_SECRET OU service-role (authorizeRequest)
//
// Alternative à Gmail : envoi transactionnel depuis un domaine vérifié
// (notifications@atlas-studio.org) — pas d'OAuth, réutilise RESEND_API_KEY déjà
// configurée. Sens unique (pas de boîte de réception / suivi des réponses) —
// idéal pour onboarding, relances, notifications, propositions.
//
// Mêmes action_types que le connecteur Gmail :
//   send_ticket_response | send_customer_email | send_sdr_email
//   send_invoice_reminder | send_commercial_proposal

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
// NB: on n'importe PAS payments.ts (→ stripe.ts) : il initialise Stripe au
// top-level avec STRIPE_SECRET_KEY non-null-asserté → crash au boot si la clé
// est absente (projet en CinetPay). L'envoi Resend n'en a pas besoin.

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
interface EmailFields {
  to: string;
  subject: string;
  body: string;
}

const RESEND_FROM = Deno.env.get("ASVC_RESEND_FROM") ?? "Atlas Studio <notifications@atlas-studio.org>";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function sendResend(opts: { to: string; subject: string; body: string }): Promise<{ id: string }> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY manquante côté serveur");
  const html =
    `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;font-size:14px;line-height:1.6;color:#222;white-space:pre-wrap">` +
    escapeHtml(opts.body) +
    `</div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: RESEND_FROM, to: [opts.to], subject: opts.subject, text: opts.body, html }),
  });
  const data = await res.json().catch(() => ({} as { id?: string; message?: string; name?: string }));
  if (!res.ok) {
    const msg = (data as { message?: string }).message ?? `HTTP ${res.status}`;
    throw new Error(`Resend (${res.status}): ${msg}`);
  }
  return { id: (data as { id?: string }).id ?? "" };
}

function extractEmailFields(action: ActionRow): EmailFields {
  const p = (action.modified_payload ?? action.proposed_payload) as Record<string, unknown>;
  const get = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");

  switch (action.action_type) {
    case "send_ticket_response": {
      const to = get("client_email");
      const ticketNumber = get("ticket_number");
      const meta = p.meta as { category?: string } | undefined;
      const subjectCat = meta?.category ? ` [${meta.category}]` : "";
      const subject = ticketNumber ? `Re: ${ticketNumber}${subjectCat}` : `Réponse Atlas Studio${subjectCat}`;
      const body = get("response_text");
      if (!to) throw new Error("client_email manquant dans payload");
      if (!body) throw new Error("response_text manquant dans payload");
      return { to, subject, body };
    }
    case "send_customer_email": {
      const to = get("to_email");
      const subject = get("subject");
      const body = get("body");
      if (!to || !subject || !body) throw new Error("to_email / subject / body manquants");
      return { to, subject, body };
    }
    case "send_sdr_email": {
      const to = get("contact_email");
      const subject = get("subject");
      const body = get("body");
      if (!to || !subject || !body) throw new Error("contact_email / subject / body manquants");
      return { to, subject, body };
    }
    case "send_invoice_reminder": {
      const to = get("client_email");
      const subject = get("subject");
      const body = get("body");
      if (!to || !subject || !body) throw new Error("client_email / subject / body manquants");
      return { to, subject, body };
    }
    case "send_commercial_proposal": {
      const to = get("contact_email");
      const company = get("company");
      const proposalMd = get("proposal_markdown");
      const subject = `Proposition commerciale — ${company || "Atlas Studio"}`;
      if (!to) throw new Error("contact_email manquant");
      if (!proposalMd) throw new Error("proposal_markdown manquant");
      return { to, subject, body: proposalMd };
    }
    default:
      throw new Error(`action_type non supporté par Resend connector: ${action.action_type}`);
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

  const { data: action, error: actErr } = await supabaseAdmin
    .from("asvc_agent_actions")
    .select("id, action_type, status, proposed_payload, modified_payload")
    .eq("id", body.action_id)
    .single();
  if (actErr || !action) {
    return errorResponse(`Action introuvable: ${actErr?.message ?? body.action_id}`, 404);
  }
  if (!["approved", "modified"].includes((action as ActionRow).status)) {
    return errorResponse(`Action non approuvée (status=${(action as ActionRow).status})`, 400);
  }

  let fields: EmailFields;
  try {
    fields = extractEmailFields(action as ActionRow);
  } catch (e) {
    return errorResponse((e as Error).message, 400);
  }

  // (Le lien de paiement auto pour les relances factures est géré ailleurs —
  // non inclus ici pour éviter d'importer Stripe au boot.)

  try {
    const result = await sendResend({ to: fields.to, subject: fields.subject, body: fields.body });

    await supabaseAdmin
      .from("asvc_agent_actions")
      .update({
        status: "executed",
        executed_at: new Date().toISOString(),
        execution_result: {
          connector: "resend",
          message_id: result.id,
          from: RESEND_FROM,
          to: fields.to,
          sent_at: new Date().toISOString(),
        },
      })
      .eq("id", body.action_id);

    // Side-effect : relance facture → maj last_reminder_at
    if ((action as ActionRow).action_type === "send_invoice_reminder") {
      const invoiceId = (action as ActionRow).proposed_payload.invoice_id as string | undefined;
      if (invoiceId) {
        await supabaseAdmin
          .from("asvc_invoices")
          .update({ last_reminder_at: new Date().toISOString() })
          .eq("id", invoiceId);
      }
    }

    // Side-effect : réponse ticket → ajoute au fil + statut
    if ((action as ActionRow).action_type === "send_ticket_response") {
      const ticketId = (action as ActionRow).proposed_payload.ticket_id as string | undefined;
      if (ticketId) {
        await supabaseAdmin.from("asvc_ticket_messages").insert({
          ticket_id: ticketId,
          sender_type: "agent",
          sender_id: "support_n1",
          content: fields.body,
          related_action_id: body.action_id,
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
      p_event_type: "resend_sent",
      p_resource_type: "asvc_agent_actions",
      p_resource_id: body.action_id,
      p_payload: { message_id: result.id, to: fields.to, from: RESEND_FROM, action_type: (action as ActionRow).action_type },
    });

    return jsonResponse({ ok: true, action: { id: body.action_id, executed: true, resend_message_id: result.id, to: fields.to } });
  } catch (err) {
    const msg = (err as Error).message;
    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "resend_send_failed",
      p_resource_type: "asvc_agent_actions",
      p_resource_id: body.action_id,
      p_payload: { error: msg, to: fields.to, action_type: (action as ActionRow).action_type },
    });
    return errorResponse(`Resend send failed: ${msg}`, 500);
  }
});
