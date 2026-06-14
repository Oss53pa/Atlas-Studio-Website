// ASVC — Customer Success Agent: draft d'email d'outreach client.
//
// Pipeline:
//   1. Charge le profile + souscriptions + derniers tickets
//   2. Sélectionne le mode du prompt selon goal (onboarding_d1, d7, d30,
//      trial_ending, churn_check, upsell)
//   3. Demande à Claude un email français personnalisé (style Pame: chaleureux pro)
//   4. Insère action_proposed (action_type='send_customer_email')
//   5. Criticality dérivée du goal (churn → high, upsell → normal, etc.)

import { supabaseAdmin } from "../supabase.ts";
import { asvcChat } from "./llm.ts";
import { loadAgentSystemPrompt } from "./prompts.ts";
import { parseJsonOutput } from "./sales-common.ts";

export type OutreachGoal =
  | "onboarding_d1"
  | "onboarding_d7"
  | "onboarding_d30"
  | "trial_ending"
  | "churn_check"
  | "upsell";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  company_name: string | null;
  phone: string | null;
  created_at: string;
}

interface Subscription {
  app_id: string;
  plan: string;
  status: string;
  price_at_subscription: number;
  trial_ends_at: string | null;
  current_period_end: string;
  cancelled_at: string | null;
}

interface RecentTicket {
  ticket_number: string;
  subject: string | null;
  category: string | null;
  sentiment_score: number | null;
  created_at: string;
}

const CUSTOMER_SUCCESS_SYSTEM = `Tu es Customer Success Agent de Atlas Studio.
Tu rédiges des emails personnalisés pour les clients SaaS B2B francophones d'Afrique
de l'Ouest et Centrale (UEMOA + CEMAC).

VOIX
- Français professionnel et chaleureux. Vouvoiement par défaut.
- Tu signes "L'équipe Atlas Studio" — jamais un nom personnel.
- Phrases courtes, paragraphes aérés. 150-220 mots.
- Pas d'emoji (sauf 😊 en clôture si contexte positif).
- Vocabulaire local quand pertinent: FCFA, OHADA, SYSCOHADA, CNPS, BCEAO, DGI.

PRINCIPES
- Tu n'envoies JAMAIS rien sans validation Pame. Tu drafts uniquement.
- Tu n'invoques jamais de feature inexistante.
- Tu ne donnes jamais de prix sans le payload.
- Tu cites le nom de l'entreprise / du contact s'ils sont fournis.
- Tu termines TOUJOURS par une étape suivante claire (CTA: répondre, planifier
  un appel, tester une fonctionnalité, voir un lien).

FORMAT DE SORTIE
Tu produis STRICTEMENT un JSON unique (rien autour):
{
  "subject": "Objet email (max 80 chars, sans emoji)",
  "body": "Corps complet de l'email en texte brut, prêt à envoyer",
  "rationale": "1 phrase: pourquoi cet angle a été choisi (interne, pas envoyé)",
  "tone": "warm_welcome|checkin|retention|upsell"
}`;

const GOAL_PROMPTS: Record<OutreachGoal, string> = {
  onboarding_d1:
    "Email J+1 d'arrivée: souhaite la bienvenue, rappelle 1-2 actions clés à réaliser dans la première semaine (configurer l'app, importer données, inviter un collègue), propose de répondre à toute question.",
  onboarding_d7:
    "Email J+7 de check-in: demande comment se passe la prise en main, rappelle 1 ressource utile (centre d'aide / tutoriel), propose un mini-appel de 15min si blocage.",
  onboarding_d30:
    "Email J+30 d'activation: célèbre 1 mois ensemble, suggère une fonctionnalité avancée à explorer, ouvre la porte à un retour (NPS court, témoignage).",
  trial_ending:
    "Email trial expirant: rappelle la fin de période d'essai dans quelques jours, met en valeur la valeur démontrée (gain de temps, conformité OHADA, etc.), propose la conversion en abonnement payant avec étapes simples.",
  churn_check:
    "Email rétention: signal de risque détecté (sentiment ticket négatif ou désengagement). Ton empathique, sans pression. Reconnais la difficulté, propose un échange pour comprendre, offre support prioritaire. NE PROMETS PAS de geste commercial — c'est à Pame de décider à l'arbitrage.",
  upsell:
    "Email upsell: le client utilise UNE app depuis >60j. Suggère 1 app complémentaire pertinente selon son profil (cabinet compta → AtlasBanx, PME retail → AtlasTrade, etc.). Format: 1 phrase sur la valeur, 1 lien démo, 1 invitation à en discuter. PAS de prix.",
};

interface DraftEmailOutput {
  subject: string;
  body: string;
  rationale: string;
  tone: string;
}

function parseEmailOutput(raw: string): DraftEmailOutput {
  // parseJsonOutput gère les fences ```json ET répare les caractères de contrôle
  // bruts dans les chaînes (fréquents avec Groq/llama → "Bad control character").
  const parsed = parseJsonOutput<Record<string, unknown>>(raw);
  if (typeof parsed.subject !== "string" || typeof parsed.body !== "string") {
    throw new Error("subject/body manquants");
  }
  return {
    subject: (parsed.subject as string).slice(0, 200),
    body: parsed.body as string,
    rationale: typeof parsed.rationale === "string" ? parsed.rationale : "",
    tone: typeof parsed.tone === "string" ? parsed.tone : "checkin",
  };
}

function criticalityFor(goal: OutreachGoal): "low" | "normal" | "high" | "critical" {
  if (goal === "churn_check") return "high";
  if (goal === "trial_ending") return "high";
  if (goal === "upsell") return "normal";
  return "normal";
}

function titleFor(goal: OutreachGoal): string {
  switch (goal) {
    case "onboarding_d1": return "Email J+1 onboarding";
    case "onboarding_d7": return "Email J+7 check-in";
    case "onboarding_d30": return "Email J+30 activation";
    case "trial_ending": return "Email trial expirant";
    case "churn_check": return "Email rétention (signal churn)";
    case "upsell": return "Email upsell";
  }
}

export interface CustomerOutreachResult {
  actionId: string;
  clientId: string;
  goal: OutreachGoal;
  subject: string;
  body: string;
  rationale: string;
  tokensUsed: number;
}

export async function draftCustomerOutreach(
  clientId: string,
  goal: OutreachGoal,
): Promise<CustomerOutreachResult> {
  const apiKey = Deno.env.get("GROQ_API_KEY") ?? Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("ASVC_ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquante");
  const model = Deno.env.get("ASVC_CS_MODEL") ?? "claude-sonnet-4-6";

  // 1. Profile
  const { data: profile, error: pErr } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, company_name, phone, created_at")
    .eq("id", clientId)
    .single();
  if (pErr || !profile) throw new Error(`Client introuvable: ${pErr?.message ?? clientId}`);
  const p = profile as Profile;

  // 2. Subs
  const { data: subs } = await supabaseAdmin
    .from("subscriptions")
    .select("app_id, plan, status, price_at_subscription, trial_ends_at, current_period_end, cancelled_at")
    .eq("user_id", clientId)
    .order("created_at", { ascending: false });
  const subscriptions = (subs as Subscription[] | null) ?? [];

  // 3. Tickets récents (5 derniers)
  const { data: tix } = await supabaseAdmin
    .from("asvc_tickets")
    .select("ticket_number, subject, category, sentiment_score, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(5);
  const tickets = (tix as RecentTicket[] | null) ?? [];

  // 4. Agent
  const { data: agent } = await supabaseAdmin
    .from("asvc_agents")
    .select("id")
    .eq("code", "customer_success")
    .single();
  if (!agent) throw new Error("Agent 'customer_success' introuvable");

  // 5. Construit le prompt
  const subsFmt = subscriptions.length
    ? subscriptions
        .map(
          (s) =>
            `- ${s.app_id} (plan ${s.plan}, ${s.status}${s.trial_ends_at ? `, trial→${s.trial_ends_at}` : ""}${s.cancelled_at ? `, annulé ${s.cancelled_at}` : ""})`,
        )
        .join("\n")
    : "(aucune souscription)";

  const tixFmt = tickets.length
    ? tickets
        .map(
          (t) =>
            `- ${t.ticket_number} [${t.category ?? "?"}] sentiment=${t.sentiment_score ?? "n/a"}: ${t.subject ?? "(sans objet)"}`,
        )
        .join("\n")
    : "(aucun ticket récent)";

  const userPrompt = `Génère l'email selon l'objectif suivant.

OBJECTIF
${GOAL_PROMPTS[goal]}

CLIENT
- Contact: ${p.full_name || "(prénom inconnu)"}
- Entreprise: ${p.company_name || "(non précisée)"}
- Email destination: ${p.email}
- Inscrit depuis: ${p.created_at}

SOUSCRIPTIONS
${subsFmt}

TICKETS RÉCENTS (5 derniers)
${tixFmt}

Produis le JSON maintenant.`;

  // 6. Appel Claude
  const chat = await asvcChat({
    apiKey,
    model,
    messages: [
      { role: "system", content: await loadAgentSystemPrompt("customer_success", CUSTOMER_SUCCESS_SYSTEM) },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.5,
    maxTokens: 1200,
  });

  const raw = (chat.message?.content as string | undefined)?.trim() ?? "";
  const out = parseEmailOutput(raw);
  const tokensUsed = (chat.prompt_eval_count ?? 0) + (chat.eval_count ?? 0);
  const criticality = criticalityFor(goal);

  // 7. Session + action
  const { data: session, error: sErr } = await supabaseAdmin
    .from("asvc_agent_sessions")
    .insert({
      agent_id: agent.id,
      trigger_type: "manual_customer_outreach",
      trigger_payload: { client_id: clientId, goal },
      status: "completed",
      ended_at: new Date().toISOString(),
      tokens_used: tokensUsed,
    })
    .select("id")
    .single();
  if (sErr) throw new Error(`session: ${sErr.message}`);

  const { data: action, error: aErr } = await supabaseAdmin
    .from("asvc_agent_actions")
    .insert({
      session_id: session!.id,
      agent_id: agent.id,
      action_type: "send_customer_email",
      criticality,
      title: `${titleFor(goal)} — ${p.company_name || p.full_name || p.email}`,
      description: out.rationale || `Email ${goal} drafté pour ${p.full_name || p.email}.`,
      proposed_payload: {
        client_id: clientId,
        to_email: p.email,
        to_name: p.full_name,
        company: p.company_name,
        subject: out.subject,
        body: out.body,
        goal,
        tone: out.tone,
      },
      context: {
        goal,
        rationale: out.rationale,
        subscriptions_count: subscriptions.length,
        recent_tickets_count: tickets.length,
        model,
      },
      status: "proposed",
    })
    .select("id")
    .single();
  if (aErr) throw new Error(`action: ${aErr.message}`);

  // 8. Audit
  await supabaseAdmin.rpc("asvc_log_audit", {
    p_actor_type: "agent",
    p_actor_id: "customer_success",
    p_event_type: "customer_outreach_drafted",
    p_resource_type: "profiles",
    p_resource_id: clientId,
    p_payload: { action_id: action!.id, goal, tokens_used: tokensUsed },
  });

  return {
    actionId: action!.id,
    clientId,
    goal,
    subject: out.subject,
    body: out.body,
    rationale: out.rationale,
    tokensUsed,
  };
}
