// ASVC — Compta Agent: suggestion d'écriture SYSCOHADA pour une facture.
//
// Pas d'écriture directe en compta (réservée à Atlas Finance + validation CEO).
// L'agent propose les lignes d'écriture (compte / libellé / débit / crédit) pour
// que la CEO valide avant import dans Atlas Finance.

import { supabaseAdmin } from "../supabase.ts";
import { anthropicChat } from "../proph3t/anthropic.ts";
import { fetchAgentIdByCode, parseJsonOutput, fcfa } from "./sales-common.ts";

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  amount_ht_fcfa: number;
  amount_tva_fcfa: number;
  amount_ttc_fcfa: number;
  issued_date: string;
  paid_date: string | null;
  payment_method: string | null;
  status: string;
}

const ACCOUNTING_SYSTEM = `Tu es Compta Agent de Atlas Studio. Tu maîtrises le plan comptable SYSCOHADA.

CONTEXTE
Tu proposes des écritures comptables conformes SYSCOHADA pour les flux Atlas Studio.
Tu ne valides JAMAIS rien — la CEO importe ensuite dans Atlas Finance après validation.

PLAN COMPTABLE SYSCOHADA — comptes principaux
- 411 : Clients
- 4111 : Clients - ventes de services
- 4191 : Clients - avances reçues
- 443 : État, TVA facturée
- 4431 : TVA facturée sur ventes
- 445 : État, TVA récupérable
- 521 : Banques (locales)
- 522 : Banques (autres établissements)
- 531 : Chèques postaux
- 571 : Caisse
- 706 : Services vendus (SaaS = services)
- 7060 : Ventes prestations Atlas Studio SaaS
- 758 : Produits divers de gestion courante

FLUX TYPES
A) Émission facture SaaS (HT + TVA)
   Débit  4111 — Clients ventes services       <TTC>
   Crédit 7060 — Ventes prestations SaaS       <HT>
   Crédit 4431 — TVA facturée sur ventes       <TVA>

B) Encaissement facture (mobile money / virement)
   Débit  521  — Banques (ou 522/531 selon canal)    <TTC>
   Crédit 4111 — Clients ventes services             <TTC>

C) Encaissement partiel — même flux mais montants partiels (saisir uniquement la fraction encaissée).

RÈGLES
- Tu cites les libellés SYSCOHADA exacts.
- Tu équilibres TOUJOURS débit = crédit.
- Tu inscris la référence facture en libellé.
- Tu signales si la TVA semble non standard (taux ≠ 18% UEMOA / 19.25% CMR).
- Tu produis STRICTEMENT un JSON unique (rien autour):
{
  "lines": [
    { "account": "4111", "label": "...", "debit_fcfa": <int>, "credit_fcfa": <int> },
    ...
  ],
  "balance_check": "ok|mismatch",
  "journal": "VTE|BNQ|OD",
  "date": "YYYY-MM-DD",
  "rationale": "1-2 phrases",
  "open_questions": ["question CEO 1", ...]
}`;

interface AccountingLine {
  account: string;
  label: string;
  debit_fcfa: number;
  credit_fcfa: number;
}

interface AccountingOutput {
  lines: AccountingLine[];
  balance_check: "ok" | "mismatch";
  journal: "VTE" | "BNQ" | "OD" | string;
  date: string;
  rationale: string;
  open_questions: string[];
}

export type AccountingFlowKind = "invoice_issued" | "invoice_paid" | "invoice_partial_payment";

export interface SuggestEntryParams {
  invoiceId: string;
  flowKind: AccountingFlowKind;
  paidAmountFcfa?: number;
}

export interface SuggestEntryResult {
  actionId: string;
  invoiceId: string;
  flowKind: AccountingFlowKind;
  lines: AccountingLine[];
  journal: string;
  balanceCheck: string;
  openQuestions: string[];
  tokensUsed: number;
}

function checkBalance(lines: AccountingLine[]): boolean {
  const totalDebit = lines.reduce((s, l) => s + (l.debit_fcfa || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.credit_fcfa || 0), 0);
  return Math.abs(totalDebit - totalCredit) < 1; // tolérance arrondi 1 FCFA
}

export async function suggestJournalEntry(params: SuggestEntryParams): Promise<SuggestEntryResult> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("ASVC_ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquante");
  const model = Deno.env.get("ASVC_ACCOUNTING_MODEL") ?? "claude-sonnet-4-6";

  const { data: invoice, error: iErr } = await supabaseAdmin
    .from("asvc_invoices")
    .select(
      "id, invoice_number, client_name, amount_ht_fcfa, amount_tva_fcfa, amount_ttc_fcfa, issued_date, paid_date, payment_method, status",
    )
    .eq("id", params.invoiceId)
    .single();
  if (iErr || !invoice) throw new Error(`Facture introuvable: ${iErr?.message ?? params.invoiceId}`);
  const inv = invoice as Invoice;

  const agentId = await fetchAgentIdByCode("compta");

  const flowDescription = {
    invoice_issued: "Émission de la facture (HT + TVA collectée)",
    invoice_paid: "Encaissement intégral de la facture",
    invoice_partial_payment: "Encaissement PARTIEL de la facture",
  }[params.flowKind];

  const userPrompt = `FACTURE
- N°: ${inv.invoice_number}
- Client: ${inv.client_name}
- HT: ${fcfa(inv.amount_ht_fcfa)}
- TVA: ${fcfa(inv.amount_tva_fcfa)}
- TTC: ${fcfa(inv.amount_ttc_fcfa)}
- Émise: ${inv.issued_date}
- Encaissée: ${inv.paid_date ?? "(pas encore)"}
- Moyen paiement: ${inv.payment_method ?? "(non précisé)"}
- Statut: ${inv.status}

FLUX DEMANDÉ: ${params.flowKind} — ${flowDescription}
${params.paidAmountFcfa !== undefined ? `Montant encaissé: ${fcfa(params.paidAmountFcfa)}` : ""}

Produis l'écriture SYSCOHADA équilibrée maintenant.`;

  const chat = await anthropicChat({
    apiKey,
    model,
    messages: [
      { role: "system", content: ACCOUNTING_SYSTEM },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.1,
    maxTokens: 1500,
  });

  const raw = (chat.message?.content as string | undefined)?.trim() ?? "";
  const out = parseJsonOutput<AccountingOutput>(raw);
  const tokensUsed = (chat.prompt_eval_count ?? 0) + (chat.eval_count ?? 0);

  // Vérification équilibre côté serveur (override le balance_check du LLM si faux)
  const balanced = checkBalance(out.lines ?? []);
  const balanceCheck = balanced ? "ok" : "mismatch";

  // Session
  const { data: session, error: sErr } = await supabaseAdmin
    .from("asvc_agent_sessions")
    .insert({
      agent_id: agentId,
      trigger_type: "manual_journal_entry",
      trigger_payload: { invoice_id: params.invoiceId, flow_kind: params.flowKind },
      status: "completed",
      ended_at: new Date().toISOString(),
      tokens_used: tokensUsed,
    })
    .select("id")
    .single();
  if (sErr) throw new Error(`session: ${sErr.message}`);

  // Criticality : mismatch = critical (jamais importer un déséquilibre)
  const criticality: "low" | "normal" | "high" | "critical" =
    !balanced ? "critical" : "normal";

  const { data: action, error: aErr } = await supabaseAdmin
    .from("asvc_agent_actions")
    .insert({
      session_id: session!.id,
      agent_id: agentId,
      action_type: "import_journal_entry_atlas_finance",
      criticality,
      title: `Écriture ${out.journal ?? "OD"} — ${inv.invoice_number} (${params.flowKind})${!balanced ? " ⚠️ déséquilibrée" : ""}`,
      description: out.rationale || `Écriture proposée pour ${flowDescription}.`,
      proposed_payload: {
        invoice_id: params.invoiceId,
        invoice_number: inv.invoice_number,
        flow_kind: params.flowKind,
        journal: out.journal,
        date: out.date,
        lines: out.lines,
        balance_check: balanceCheck,
        open_questions: out.open_questions,
      },
      context: {
        amount_ttc_fcfa: inv.amount_ttc_fcfa,
        rationale: out.rationale,
        server_balance_check: balanceCheck,
        model,
      },
      status: "proposed",
    })
    .select("id")
    .single();
  if (aErr) throw new Error(`action: ${aErr.message}`);

  await supabaseAdmin.rpc("asvc_log_audit", {
    p_actor_type: "agent",
    p_actor_id: "compta",
    p_event_type: "journal_entry_suggested",
    p_resource_type: "asvc_invoices",
    p_resource_id: params.invoiceId,
    p_payload: {
      action_id: action!.id,
      flow_kind: params.flowKind,
      balance_check: balanceCheck,
      tokens_used: tokensUsed,
    },
  });

  return {
    actionId: action!.id,
    invoiceId: params.invoiceId,
    flowKind: params.flowKind,
    lines: out.lines ?? [],
    journal: out.journal,
    balanceCheck,
    openQuestions: out.open_questions ?? [],
    tokensUsed,
  };
}
