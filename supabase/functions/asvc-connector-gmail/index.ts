// ASVC — Connecteur Gmail (exécute une action approuvée via Gmail).
//
// POST /asvc-connector-gmail { action_id, account_email? }
// Auth: JWT admin OU CRON_SHARED_SECRET
//
// Extrait { to, subject, body } du payload selon action_type, envoie via Gmail,
// marque l'action 'executed' avec gmail_message_id dans execution_result.
//
// action_types supportés :
//   - send_ticket_response       (payload: ticket_id, client_email, response_text + meta)
//   - send_customer_email        (payload: to_email, to_name, subject, body)
//   - send_sdr_email             (payload: contact_email, subject, body)
//   - send_invoice_reminder      (payload: client_email, subject, body)
//   - send_commercial_proposal   (payload: contact_email, contact_name, proposal_markdown)

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import { sendGmailMessage, getDefaultGmailAccount } from "../_shared/asvc/gmail.ts";
import {
  ensureCinetpayPaymentLink,
  ensureStripePaymentLink,
  isCinetpayConfigured,
  isStripeConfigured,
  getInvoicePaymentUrl,
  pickDefaultProvider,
} from "../_shared/asvc/payments.ts";

interface Body {
  action_id?: string;
  account_email?: string;        // Override du compte d'envoi (sinon premier compte actif)
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
  bodyHtml?: string;
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
      const subject = ticketNumber
        ? `Re: ${ticketNumber}${subjectCat}`
        : `Réponse Atlas Studio${subjectCat}`;
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
      if (!to || !subject || !body) {
        throw new Error("client_email / subject / body manquants");
      }
      return { to, subject, body };
    }
    case "send_commercial_proposal": {
      const to = get("contact_email");
      const company = get("company");
      const proposalMd = get("proposal_markdown");
      const subject = `Proposition commerciale — ${company || "Atlas Studio"}`;
      if (!to) throw new Error("contact_email manquant");
      if (!proposalMd) throw new Error("proposal_markdown manquant");
      // Pour l'instant on envoie le markdown en text/plain. HTML rendu via PDF
      // attachment sera ajouté quand on câblera la génération PDF (Closer/ADVIST).
      return { to, subject, body: proposalMd };
    }
    default:
      throw new Error(`action_type non supporté par Gmail connector: ${action.action_type}`);
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

  // Charge l'action
  const { data: action, error: actErr } = await supabaseAdmin
    .from("asvc_agent_actions")
    .select("id, action_type, status, proposed_payload, modified_payload")
    .eq("id", body.action_id)
    .single();
  if (actErr || !action) {
    return errorResponse(`Action introuvable: ${actErr?.message ?? body.action_id}`, 404);
  }
  if (!["approved", "modified"].includes((action as ActionRow).status)) {
    return errorResponse(
      `Action non approuvée (status=${(action as ActionRow).status})`,
      400,
    );
  }

  // Détermine le compte d'envoi
  const accountEmail = body.account_email ?? (await getDefaultGmailAccount());
  if (!accountEmail) {
    return errorResponse(
      "Aucun compte Gmail connecté. Configure d'abord la connexion dans /admin/asvc/connectors",
      400,
    );
  }

  // Extrait les champs email selon action_type
  let fields: EmailFields;
  try {
    fields = extractEmailFields(action as ActionRow);
  } catch (e) {
    return errorResponse((e as Error).message, 400);
  }

  // ⭐ Auto-append payment URL pour les relances factures
  if ((action as ActionRow).action_type === "send_invoice_reminder") {
    const invoiceId = ((action as ActionRow).proposed_payload as { invoice_id?: string }).invoice_id;
    if (invoiceId) {
      let paymentUrl = await getInvoicePaymentUrl(invoiceId).catch(() => null);

      if (!paymentUrl) {
        // Sélectionne provider selon pays client + ce qui est configuré
        const cinetpayCfg = isCinetpayConfigured();
        const stripeCfg = isStripeConfigured();
        let provider: "cinetpay" | "stripe" | null = null;

        if (cinetpayCfg && stripeCfg) {
          try { provider = await pickDefaultProvider(invoiceId); }
          catch { provider = "cinetpay"; }
        } else if (cinetpayCfg) provider = "cinetpay";
        else if (stripeCfg) provider = "stripe";

        if (provider) {
          try {
            const generated = provider === "stripe"
              ? await ensureStripePaymentLink(invoiceId)
              : await ensureCinetpayPaymentLink(invoiceId);
            paymentUrl = generated.payment_url;
          } catch (e) {
            await supabaseAdmin.rpc("asvc_log_audit", {
              p_actor_type: authz.isCron ? "system" : "ceo",
              p_actor_id: authz.actor,
              p_event_type: `${provider}_link_generation_failed_in_reminder`,
              p_resource_type: "asvc_invoices",
              p_resource_id: invoiceId,
              p_payload: { error: (e as Error).message },
            });
          }
        }
      }

      if (paymentUrl) {
        fields.body =
          fields.body +
          `\n\n---\n` +
          `💳 Pour régler en ligne : ${paymentUrl}\n` +
          `\nMerci de votre confiance,\nL'équipe Atlas Studio`;
      }
    }
  }

  // Envoie via Gmail
  try {
    const result = await sendGmailMessage({
      accountEmail,
      to: fields.to,
      subject: fields.subject,
      body: fields.body,
      bodyHtml: fields.bodyHtml,
      fromName: "L'équipe Atlas Studio",
    });

    // Marque l'action exécutée
    await supabaseAdmin
      .from("asvc_agent_actions")
      .update({
        status: "executed",
        executed_at: new Date().toISOString(),
        execution_result: {
          connector: "gmail",
          message_id: result.message_id,
          thread_id: result.thread_id,
          from_account: accountEmail,
          to: fields.to,
          sent_at: result.sent_at,
        },
      })
      .eq("id", body.action_id);

    // Side-effect: si c'est une relance facture, increment compteur
    if ((action as ActionRow).action_type === "send_invoice_reminder") {
      const invoiceId = (action as ActionRow).proposed_payload.invoice_id as string | undefined;
      if (invoiceId) {
        await supabaseAdmin
          .from("asvc_invoices")
          .update({
            reminder_count: (
              await supabaseAdmin
                .from("asvc_invoices")
                .select("reminder_count")
                .eq("id", invoiceId)
                .single()
            ).data?.reminder_count ?? 0,
            last_reminder_at: new Date().toISOString(),
          })
          .eq("id", invoiceId);
      }
    }

    // Side-effect: si c'est une réponse ticket, ajoute le message dans le fil
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

    // Audit
    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "gmail_sent",
      p_resource_type: "asvc_agent_actions",
      p_resource_id: body.action_id,
      p_payload: {
        message_id: result.message_id,
        to: fields.to,
        from: accountEmail,
        action_type: (action as ActionRow).action_type,
      },
    });

    return jsonResponse({
      ok: true,
      action: {
        id: body.action_id,
        executed: true,
        gmail_message_id: result.message_id,
        to: fields.to,
      },
    });
  } catch (err) {
    const msg = (err as Error).message;
    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "gmail_send_failed",
      p_resource_type: "asvc_agent_actions",
      p_resource_id: body.action_id,
      p_payload: { error: msg, to: fields.to, action_type: (action as ActionRow).action_type },
    });
    return errorResponse(`Gmail send failed: ${msg}`, 500);
  }
});
