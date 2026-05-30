// ASVC — SecOps Agent : passe CTEM (Continuous Threat Exposure Management).
//
// Pipeline:
//   1. (best-effort) Récupère un instantané de posture sécurité en base
//      (couverture RLS) via la RPC optionnelle asvc_security_posture.
//   2. Construit le contexte CTEM (périmètre, dépendances, signaux).
//   3. Demande à Claude une analyse CTEM structurée (JSON) :
//      summary, posture_score, findings[] (phase, asset, severity, risk, remediation…).
//   4. Insère une session + UNE action 'security_remediation_plan' (status='proposed',
//      criticité = sévérité max), soumise à validation CEO comme tout agent ASVC.
//   5. Journalise dans l'audit log.

import { supabaseAdmin } from "../supabase.ts";
import { asvcChat } from "./llm.ts";

type Severity = "critical" | "high" | "normal" | "low";
type CtemPhase = "scoping" | "discovery" | "prioritization" | "validation" | "mobilization";

export interface CtemScanInput {
  /** Périmètre libre (ex: "site public + portail + Supabase prod"). */
  scope?: string;
  /** Liste de dépendances à auditer (ex: ["react@18.3.1", "vite@5.4.21"]). */
  dependencies?: string[];
  /** Surface d'attaque connue (domaines, endpoints publics…). */
  surface?: string[];
  /** Notes / contexte additionnel pour orienter la passe. */
  notes?: string;
}

interface Finding {
  phase: CtemPhase;
  asset: string;
  category: "rls" | "cve" | "config" | "secret" | "auth" | "exposure" | "other";
  severity: Severity;
  exploitability: string;
  risk: string;
  remediation: string;
  cve: string | null;
}

interface CtemOutput {
  summary: string;
  posture_score: number; // 0–100
  findings: Finding[];
}

const SECOPS_SYSTEM = `Tu es le SecOps Agent d'Atlas Studio (suite SaaS OHADA/SYSCOHADA :
front React 18 + TypeScript, backend Supabase — Postgres + RLS + Edge Functions,
hébergement Vercel, données financières clients sensibles).

Tu réalises une passe CTEM (Continuous Threat Exposure Management) en 5 phases :
scoping → discovery → prioritization → validation → mobilization.
Priorise par RISQUE RÉEL (exploitabilité × valeur de l'actif × exposition), pas seulement le CVSS.
Mets en avant ce qui touche l'authentification, les clés/secrets, les politiques RLS et les
données financières clients.

CONTRAINTES
- Analyse NON destructive uniquement (raisonnement, revue de configs/politiques, corrélation CVE).
- N'invente pas de CVE : si tu n'es pas sûr, mets "cve": null et baisse la sévérité.
- Aucune donnée client réelle / PII dans ta sortie.

FORMAT DE SORTIE — STRICTEMENT un seul JSON (rien avant, rien après) :
{
  "summary": "<synthèse 1-3 phrases>",
  "posture_score": 0,                       // 0 (critique) à 100 (excellent)
  "findings": [
    {
      "phase": "scoping|discovery|prioritization|validation|mobilization",
      "asset": "<actif concerné, ex: 'Supabase RLS table invoices'>",
      "category": "rls|cve|config|secret|auth|exposure|other",
      "severity": "critical|high|normal|low",
      "exploitability": "<comment c'est exploitable, court>",
      "risk": "<impact métier concret>",
      "remediation": "<action de remédiation concrète>",
      "cve": "CVE-AAAA-NNNN ou null"
    }
  ]
}
Une faille touchant auth / clés / données clients = "critical".`;

const SEVERITY_RANK: Record<Severity, number> = { low: 0, normal: 1, high: 2, critical: 3 };

function maxCriticality(findings: Finding[]): Severity {
  let max: Severity = "low";
  for (const f of findings) {
    if (SEVERITY_RANK[f.severity] > SEVERITY_RANK[max]) max = f.severity;
  }
  return max;
}

function parseCtemOutput(raw: string): CtemOutput {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  const i0 = s.indexOf("{");
  const iN = s.lastIndexOf("}");
  if (i0 === -1 || iN === -1) throw new Error("CTEM output: pas de JSON détecté");
  const parsed = JSON.parse(s.slice(i0, iN + 1));

  const validSeverity = (v: unknown): Severity =>
    v === "critical" || v === "high" || v === "normal" || v === "low" ? v : "normal";
  const validPhase = (v: unknown): CtemPhase =>
    ["scoping", "discovery", "prioritization", "validation", "mobilization"].includes(v as string)
      ? (v as CtemPhase)
      : "discovery";

  const findings: Finding[] = Array.isArray(parsed.findings)
    ? parsed.findings.map((f: Record<string, unknown>) => ({
        phase: validPhase(f.phase),
        asset: String(f.asset ?? "inconnu").slice(0, 200),
        category: ["rls", "cve", "config", "secret", "auth", "exposure", "other"].includes(f.category as string)
          ? (f.category as Finding["category"])
          : "other",
        severity: validSeverity(f.severity),
        exploitability: String(f.exploitability ?? "").slice(0, 600),
        risk: String(f.risk ?? "").slice(0, 600),
        remediation: String(f.remediation ?? "").slice(0, 800),
        cve: typeof f.cve === "string" && /^CVE-\d{4}-\d+$/i.test(f.cve) ? f.cve : null,
      }))
    : [];

  const score = typeof parsed.posture_score === "number"
    ? Math.max(0, Math.min(100, Math.round(parsed.posture_score)))
    : 50;

  return {
    summary: String(parsed.summary ?? "Passe CTEM effectuée.").slice(0, 1000),
    posture_score: score,
    findings,
  };
}

/** Instantané de posture (best-effort) : couverture RLS via RPC optionnelle. */
async function fetchPostureSnapshot(): Promise<Record<string, unknown> | null> {
  try {
    const { data, error } = await supabaseAdmin.rpc("asvc_security_posture");
    if (error) return null;
    return (data as Record<string, unknown>) ?? null;
  } catch {
    return null; // RPC absente → on dégrade proprement
  }
}

export interface SecOpsScanResult {
  actionId: string;
  sessionId: string;
  postureScore: number;
  findingsCount: number;
  criticalCount: number;
  criticality: Severity;
  summary: string;
  tokensUsed: number;
}

export async function runCtemScan(input: CtemScanInput = {}): Promise<SecOpsScanResult> {
  const apiKey = Deno.env.get("GROQ_API_KEY") ?? Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("ASVC_ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquante");
  const model = Deno.env.get("ASVC_SECOPS_MODEL") ?? "claude-sonnet-4-6";

  // Agent
  const { data: agent } = await supabaseAdmin
    .from("asvc_agents")
    .select("id, is_active")
    .eq("code", "secops")
    .single();
  if (!agent) throw new Error("Agent 'secops' introuvable (migration appliquée ?)");
  if (agent.is_active === false) throw new Error("Agent 'secops' en pause");

  // Kill-switch (global ou département sécurité ou agent secops)
  const { data: switches } = await supabaseAdmin
    .from("asvc_kill_switch")
    .select("scope, target")
    .eq("is_active", true);
  const blocked = (switches ?? []).some(
    (k: { scope: string; target: string | null }) =>
      k.scope === "all" ||
      (k.scope === "department" && k.target === "securite") ||
      (k.scope === "agent" && k.target === "secops"),
  );
  if (blocked) throw new Error("Kill-switch actif — passe CTEM annulée");

  // Contexte
  const posture = await fetchPostureSnapshot();
  const userPrompt = `PÉRIMÈTRE: ${input.scope ?? "Atlas Studio (site public, portail client, console admin, Supabase prod, Vercel)"}

SURFACE D'ATTAQUE CONNUE:
${(input.surface ?? []).map((s) => `- ${s}`).join("\n") || "(non fournie — déduis les actifs typiques de la stack)"}

DÉPENDANCES À AUDITER:
${(input.dependencies ?? []).map((d) => `- ${d}`).join("\n") || "(non fournies — raisonne sur les paquets clés React/Vite/Supabase si pertinent)"}

INSTANTANÉ POSTURE (best-effort, peut être vide):
${posture ? JSON.stringify(posture).slice(0, 2000) : "(indisponible)"}

NOTES: ${input.notes ?? "(aucune)"}

Effectue la passe CTEM et produis le JSON.`;

  const chat = await asvcChat({
    apiKey,
    model,
    messages: [
      { role: "system", content: SECOPS_SYSTEM },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.2,
    maxTokens: 3000,
  });

  const raw = (chat.message?.content as string | undefined)?.trim() ?? "";
  const out = parseCtemOutput(raw);
  const tokensUsed = (chat.prompt_eval_count ?? 0) + (chat.eval_count ?? 0);
  const criticality = maxCriticality(out.findings);
  const criticalCount = out.findings.filter((f) => f.severity === "critical").length;

  // Session
  const { data: session, error: sErr } = await supabaseAdmin
    .from("asvc_agent_sessions")
    .insert({
      agent_id: agent.id,
      trigger_type: "ctem_scan",
      trigger_payload: { scope: input.scope ?? null, deps: input.dependencies?.length ?? 0 },
      status: "completed",
      ended_at: new Date().toISOString(),
      tokens_used: tokensUsed,
    })
    .select("id")
    .single();
  if (sErr) throw new Error(`session: ${sErr.message}`);

  // Action (plan de remédiation, soumise à validation)
  const { data: action, error: aErr } = await supabaseAdmin
    .from("asvc_agent_actions")
    .insert({
      session_id: session!.id,
      agent_id: agent.id,
      action_type: "security_remediation_plan",
      criticality,
      title: `CTEM — ${out.findings.length} findings (${criticalCount} critique${criticalCount > 1 ? "s" : ""}) · posture ${out.posture_score}/100`,
      description: out.summary,
      proposed_payload: {
        posture_score: out.posture_score,
        findings: out.findings,
        scope: input.scope ?? null,
      },
      context: { model, has_posture_snapshot: !!posture, surface_count: input.surface?.length ?? 0 },
      status: "proposed",
    })
    .select("id")
    .single();
  if (aErr) throw new Error(`action: ${aErr.message}`);

  // Audit
  await supabaseAdmin.rpc("asvc_log_audit", {
    p_actor_type: "agent",
    p_actor_id: "secops",
    p_event_type: "ctem_scan_completed",
    p_resource_type: "asvc_agent_actions",
    p_resource_id: action!.id,
    p_payload: {
      posture_score: out.posture_score,
      findings_count: out.findings.length,
      critical_count: criticalCount,
      tokens_used: tokensUsed,
    },
  });

  return {
    actionId: action!.id,
    sessionId: session!.id,
    postureScore: out.posture_score,
    findingsCount: out.findings.length,
    criticalCount,
    criticality,
    summary: out.summary,
    tokensUsed,
  };
}
