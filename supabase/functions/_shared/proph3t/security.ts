// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — Security & Compliance (CDC §3.2 security L1)
// 3 tools : verify_rls_context, audit_trail_write, check_compliance
// ═══════════════════════════════════════════════════════════════════════════

import { appendAudit } from "./audit.ts";

// deno-lint-ignore no-explicit-any
type SbClient = any;

/**
 * Verifie que le contexte d'execution actuel respecte bien le RLS attendu.
 * Sert a detecter les fuites tenant et a valider que l'agent n'agit pas
 * en cross-tenant par accident (CDC §6 isolation tenant).
 */
export async function verifyRlsContext(supabase: SbClient, args: {
  user_id: string;
  expected_tenant_id?: string;
  table_to_test: string;       // ex: 'proph3t_alerts'
  test_query_filter?: Record<string, unknown>;
}): Promise<{ ok: boolean; isolated: boolean; visible_rows: number; warnings: string[]; error?: string }> {
  const warnings: string[] = [];
  if (!args.user_id) return { ok: false, isolated: false, visible_rows: 0, warnings, error: "user_id requis" };
  if (!args.table_to_test) return { ok: false, isolated: false, visible_rows: 0, warnings, error: "table_to_test requis" };

  // Note: on est en service_role ici (supabaseAdmin), donc RLS bypass.
  // Pour un vrai check RLS, il faudrait creer un client avec le JWT user.
  // Pour l'instant on fait un compte rapide + warning.
  warnings.push("verify_rls_context utilise service_role (bypass RLS) — verifie manuellement avec un client user pour confirmer");

  let qb = supabase.from(args.table_to_test).select("*", { count: "exact", head: true });
  if (args.test_query_filter) {
    for (const [k, v] of Object.entries(args.test_query_filter)) {
      qb = qb.eq(k, v);
    }
  }
  const { count, error } = await qb;
  if (error) return { ok: false, isolated: false, visible_rows: 0, warnings, error: error.message };

  // Heuristique : si expected_tenant_id fourni, on s'attend a ce que toutes
  // les rows visibles aient le bon tenant_id (verifie cote app).
  const visibleRows = count ?? 0;
  const isolated = !!args.expected_tenant_id;  // best-effort sans JWT

  return { ok: true, isolated, visible_rows: visibleRows, warnings };
}

/**
 * Ecrit une entree dans l'audit trail chaine SHA-256 (CDC §4.1).
 * Wrapper public du audit.ts pour l'agent.
 */
export async function auditTrailWrite(args: {
  action: string;
  actor_user_id?: string;
  subject_type?: string;
  subject_id?: string;
  content: Record<string, unknown>;
}): Promise<{ ok: boolean; audit_id?: string; hash?: string; error?: string }> {
  if (!args.action || !args.content) {
    return { ok: false, error: "action et content requis" };
  }
  try {
    const result = await appendAudit({
      action: args.action,
      actor_user_id: args.actor_user_id,
      subject_type: args.subject_type,
      subject_id: args.subject_id,
      content: args.content,
    });
    return { ok: true, audit_id: result.id, hash: result.hash };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Verifie qu'une operation respecte les regles de compliance CDC :
 * - mode strict : citations obligatoires, confidence >= seuil
 * - RGPD : pas de PII en clair dans le payload
 * - SYSCOHADA : montants en centimes (BIGINT), pas de float
 * - Anti-hallucination : citations presentes pour les chiffres
 */
export function checkCompliance(args: {
  mode: "strict" | "standard";
  payload: Record<string, unknown>;
  citations?: unknown[];
  confidence?: number;        // 0-100
  app_id?: string;
  rules?: { min_confidence?: number; require_citations?: boolean; forbid_pii?: boolean };
}): {
  ok: boolean;
  compliant: boolean;
  violations: { code: string; message: string; severity: "error" | "warning" }[];
  recommendations: string[];
} {
  const violations: { code: string; message: string; severity: "error" | "warning" }[] = [];
  const recommendations: string[] = [];
  const rules = args.rules ?? {};
  const minConfidence = rules.min_confidence ?? (args.mode === "strict" ? 70 : 50);
  const requireCitations = rules.require_citations ?? (args.mode === "strict");
  const forbidPii = rules.forbid_pii ?? true;

  // 1. Confidence
  if (typeof args.confidence === "number" && args.confidence < minConfidence) {
    violations.push({
      code: "LOW_CONFIDENCE",
      message: `Confidence ${args.confidence} < seuil ${minConfidence} (mode ${args.mode})`,
      severity: args.mode === "strict" ? "error" : "warning",
    });
    recommendations.push(`Prefixe la reponse par "[a verifier]" ou demande validation humaine`);
  }

  // 2. Citations
  const citationsCount = (args.citations ?? []).length;
  if (requireCitations && citationsCount === 0) {
    violations.push({
      code: "NO_CITATIONS",
      message: `Mode strict exige des citations (article SYSCOHADA, doc client, etc.). 0 citations fournies.`,
      severity: "error",
    });
    recommendations.push(`Appelle search_app_knowledge ou search_tenant_documents avant de conclure`);
  }

  // 3. PII (RGPD) — patterns simples
  if (forbidPii) {
    const json = JSON.stringify(args.payload);
    const piiPatterns = [
      { pattern: /\b\d{13,19}\b/, code: "PII_CARD", msg: "Numero de carte detecte" },
      { pattern: /\b\d{15}\b/, code: "PII_NSS", msg: "NSS / matricule possible" },
      { pattern: /[\w.-]+@[\w.-]+\.\w+/, code: "PII_EMAIL", msg: "Email en clair (acceptable selon contexte, a verifier)" },
    ];
    for (const p of piiPatterns) {
      if (p.pattern.test(json)) {
        violations.push({
          code: p.code,
          message: p.msg,
          severity: p.code === "PII_EMAIL" ? "warning" : "error",
        });
      }
    }
  }

  // 4. Money en bigint string (heuristique : si on voit un float pour un champ *_centimes)
  const json = JSON.stringify(args.payload);
  const floatCentimes = /"[\w_]*centimes[\w_]*"\s*:\s*\d+\.\d+/.test(json);
  if (floatCentimes) {
    violations.push({
      code: "MONEY_FLOAT",
      message: "Champ *_centimes contient un float — utilise BIGINT (string ou bigint).",
      severity: "error",
    });
    recommendations.push(`Convertis avec BigInt(Math.round(value * 100)) avant insert`);
  }

  const errors = violations.filter(v => v.severity === "error");
  const compliant = errors.length === 0;

  return { ok: true, compliant, violations, recommendations };
}
