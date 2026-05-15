// ASVC — Facturation Agent: drafting de relances graduées d'impayés.
//
// Niveaux:
//   level_1_friendly : J+0 à J+7 — rappel courtois "peut-être un oubli"
//   level_2_firm     : J+8 à J+15 — relance professionnelle, demande retour
//   level_3_formal   : J+16 à J+30 — formelle, mention CG
//   level_4_final    : J+31 à J+60 — dernière relance amiable avant contentieux
//   level_5_legal    : > J+60 — mise en demeure (TOUJOURS escalade CEO)

import { supabaseAdmin } from "../supabase.ts";
import { anthropicChat } from "../proph3t/anthropic.ts";
import { fetchAgentIdByCode, parseJsonOutput, fcfa } from "./sales-common.ts";

export type ReminderLevel =
  | "pre_due"
  | "level_1_friendly"
  | "level_2_firm"
  | "level_3_formal"
  | "level_4_final"
  | "level_5_legal";

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  client_name: string;
  amount_ht_fcfa: number;
  amount_tva_fcfa: number;
  amount_ttc_fcfa: number;
  issued_date: string;
  due_date: string;
  status: string;
  reminder_count: number;
  payment_method: string | null;
}

const BILLING_SYSTEM = `Tu es Facturation Agent de Atlas Studio.
Tu draftes des relances client pour des factures impayées. Contexte OHADA / UEMOA.

PRINCIPES
- Français professionnel. Vouvoiement.
- Tu n'invoques JAMAIS de pénalités chiffrées sans la grille (laisse "selon CG").
- Tu signes "L'équipe Atlas Studio" — jamais un nom personnel.
- Tu proposes TOUJOURS un moyen de paiement clair (CinetPay, virement, etc.).
- Tu cites le numéro de facture et le montant TTC EXACTS du payload.

TONS PAR NIVEAU
- pre_due         : rappel amical 5j avant échéance, pas de pression
- level_1_friendly: "Vous avez peut-être oublié...", ton léger, propose lien paiement
- level_2_firm    : "Nous n'avons pas reçu votre règlement", direct sans agressivité
- level_3_formal  : ton formel, mention CG, demande accusé de réception
- level_4_final   : dernière relance amiable, mention contentieux possible
- level_5_legal   : N'ÉCRIS PAS l'email. Renvoie reply_text="" et escalate=true

CONTENU REQUIS
- N° facture, montant TTC, date d'échéance
- 1-2 moyens de paiement (selon payment_method si fourni, sinon génériques)
- 1 invitation à confirmer le règlement OU à signaler une difficulté
- Subject line < 60 chars qui ne hurle pas (pas de "URGENT" en majuscules)

FORMAT DE SORTIE
JSON unique (rien autour):
{
  "subject":      "objet email",
  "body":         "corps complet, ou empty si escalade",
  "escalate":     true|false,
  "escalate_reason": "raison si escalade, sinon null",
  "rationale":    "1 phrase: angle (interne)"
}`;

interface BillingOutput {
  subject: string;
  body: string;
  escalate: boolean;
  escalate_reason: string | null;
  rationale: string;
}

function criticalityFor(level: ReminderLevel, escalating: boolean): "low" | "normal" | "high" | "critical" {
  if (level === "level_5_legal" || escalating) return "critical";
  if (level === "level_4_final" || level === "level_3_formal") return "high";
  return "normal";
}

export interface DraftReminderResult {
  actionId: string;
  invoiceId: string;
  level: ReminderLevel;
  subject: string;
  body: string;
  escalate: boolean;
  escalateReason: string | null;
  tokensUsed: number;
}

export async function draftInvoiceReminder(
  invoiceId: string,
  level: ReminderLevel,
): Promise<DraftReminderResult> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("ASVC_ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquante");
  const model = Deno.env.get("ASVC_BILLING_MODEL") ?? "claude-sonnet-4-6";

  const { data: invoice, error: iErr } = await supabaseAdmin
    .from("asvc_invoices")
    .select(
      "id, invoice_number, client_id, client_name, amount_ht_fcfa, amount_tva_fcfa, amount_ttc_fcfa, issued_date, due_date, status, reminder_count, payment_method",
    )
    .eq("id", invoiceId)
    .single();
  if (iErr || !invoice) throw new Error(`Facture introuvable: ${iErr?.message ?? invoiceId}`);
  const inv = invoice as Invoice;

  // Récupère le contact client depuis profiles
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, email, company_name")
    .eq("id", inv.client_id)
    .maybeSingle();

  const agentId = await fetchAgentIdByCode("facturation");

  const daysOverdue =
    Math.floor(
      (Date.now() - new Date(inv.due_date).getTime()) / (24 * 3600 * 1000),
    );

  const userPrompt = `FACTURE
- Numéro: ${inv.invoice_number}
- Montant TTC: ${fcfa(inv.amount_ttc_fcfa)} (HT ${fcfa(inv.amount_ht_fcfa)}, TVA ${fcfa(inv.amount_tva_fcfa)})
- Émise le: ${inv.issued_date}
- Échéance: ${inv.due_date} (${daysOverdue >= 0 ? `${daysOverdue}j de retard` : `${-daysOverdue}j avant échéance`})
- Statut: ${inv.status}
- Relances déjà envoyées: ${inv.reminder_count}
- Moyen de paiement attendu: ${inv.payment_method ?? "non précisé"}

CLIENT
- Société: ${inv.client_name}
- Contact: ${profile?.full_name ?? "(non renseigné)"}
- Email: ${profile?.email ?? "(non renseigné)"}

NIVEAU DEMANDÉ: ${level}

Draft la relance maintenant selon le niveau.`;

  const chat = await anthropicChat({
    apiKey,
    model,
    messages: [
      { role: "system", content: BILLING_SYSTEM },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    maxTokens: 1200,
  });

  const raw = (chat.message?.content as string | undefined)?.trim() ?? "";
  const out = parseJsonOutput<BillingOutput>(raw);
  const tokensUsed = (chat.prompt_eval_count ?? 0) + (chat.eval_count ?? 0);

  const escalating = out.escalate || level === "level_5_legal";
  const criticality = criticalityFor(level, escalating);

  // Session
  const { data: session, error: sErr } = await supabaseAdmin
    .from("asvc_agent_sessions")
    .insert({
      agent_id: agentId,
      trigger_type: "manual_invoice_reminder",
      trigger_payload: { invoice_id: invoiceId, level },
      status: "completed",
      ended_at: new Date().toISOString(),
      tokens_used: tokensUsed,
    })
    .select("id")
    .single();
  if (sErr) throw new Error(`session: ${sErr.message}`);

  const title = escalating
    ? `🚨 Escalade impayé ${inv.invoice_number} — ${inv.client_name}`
    : `Relance ${level.replace("level_", "L").replace("_", " ")} — ${inv.invoice_number} (${inv.client_name})`;

  const description = escalating
    ? `${out.escalate_reason ?? "niveau 5 (contentieux)"} — montant ${fcfa(inv.amount_ttc_fcfa)}, ${daysOverdue}j de retard.`
    : out.rationale || `Relance ${level} draftée — ${fcfa(inv.amount_ttc_fcfa)}.`;

  const { data: action, error: aErr } = await supabaseAdmin
    .from("asvc_agent_actions")
    .insert({
      session_id: session!.id,
      agent_id: agentId,
      action_type: escalating ? "billing_escalation" : "send_invoice_reminder",
      criticality,
      title,
      description,
      proposed_payload: {
        invoice_id: invoiceId,
        invoice_number: inv.invoice_number,
        client_id: inv.client_id,
        client_email: profile?.email ?? null,
        client_name: inv.client_name,
        level,
        subject: out.subject,
        body: out.body,
        amount_ttc_fcfa: inv.amount_ttc_fcfa,
        days_overdue: daysOverdue,
      },
      context: {
        reminder_count_before: inv.reminder_count,
        rationale: out.rationale,
        escalate_reason: out.escalate_reason,
        model,
      },
      status: "proposed",
    })
    .select("id")
    .single();
  if (aErr) throw new Error(`action: ${aErr.message}`);

  await supabaseAdmin.rpc("asvc_log_audit", {
    p_actor_type: "agent",
    p_actor_id: "facturation",
    p_event_type: escalating ? "billing_escalated" : "invoice_reminder_drafted",
    p_resource_type: "asvc_invoices",
    p_resource_id: invoiceId,
    p_payload: { action_id: action!.id, level, days_overdue: daysOverdue, tokens_used: tokensUsed },
  });

  return {
    actionId: action!.id,
    invoiceId,
    level,
    subject: out.subject,
    body: out.body,
    escalate: escalating,
    escalateReason: out.escalate_reason,
    tokensUsed,
  };
}
