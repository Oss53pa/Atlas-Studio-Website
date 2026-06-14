// ASVC v2.1 — Tech Debt Agent orchestrator
//
// Run hebdo (cron lundi 6h) ou trigger manuel via cockpit.
// Produit 1 ligne dans asvc_code_health_audits par app + N items dans
// asvc_tech_debt_items selon scanners.
//
// SCANNERS IMPLEMENTES (réels) :
//   1. db_security : RLS missing, SECURITY DEFINER sans search_path (pg_catalog)
//   2. lighthouse  : PageSpeed Insights API si PAGESPEED_API_KEY env
//
// SCANNERS PLACEHOLDER (non implémentés en Deno edge — besoin CI Node) :
//   - sonarcloud   : duplications, complexité — requiert build environment
//   - npm_audit    : vulnérabilités CVE — requiert npm registry access
//   - bundle_size  : taille bundles — requiert Vite build
//
// Pour ces placeholders, à terme un GitHub Action Node tournant lundi 5h
// pourrait poster ses résultats via cette même Edge Function (mode "ingest").
// ───────────────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { supabaseAdmin } from "../supabase.ts";

export type ScanMode = "full" | "internal_only" | "lighthouse_only";

export type TechDebtCategory =
  | "duplication"
  | "complexity"
  | "unused_code"
  | "outdated_dep"
  | "vulnerability"
  | "perf_regression"
  | "arch_smell"
  | "bundle_bloat"
  | "rls_missing"
  | "security_definer_search_path"
  | "i18n_missing";

export type Severity = "low" | "medium" | "high" | "critical";
export type Priority = "P0" | "P1" | "P2" | "P3";

export interface ScanItem {
  category: TechDebtCategory;
  title: string;
  description?: string;
  severity: Severity;
  priority: Priority;
  file_paths?: string[];
  detected_metric?: Record<string, unknown>;
  effort_estimate?: "XS" | "S" | "M" | "L" | "XL";
}

export interface AppScanResult {
  app: string;
  items: ScanItem[];
  scanToolsUsed: string[];
  scanDurationMs: number;
  metrics: Record<string, unknown>;
}

export interface RunScanResult {
  ok: true;
  audits: { app: string; auditId: string; itemsCount: number; criticalCount: number; score: number }[];
  totalItems: number;
  totalCritical: number;
}

// ───────────────────────────────────────────────────────────────────────────
// Liste des apps à scanner (lue depuis asvc_agent_memory_shared OU default)
// ───────────────────────────────────────────────────────────────────────────

const DEFAULT_APPS: { app: string; url: string | null }[] = [
  { app: "asvc-platform", url: "https://atlas-studio.org" }, // virtuelle : checks DB system-wide
  { app: "atlas-finance",  url: "https://atlas-finance.atlas-studio.org" },
  { app: "liasspilot",     url: "https://liasspilot.atlas-studio.org" },
  { app: "cashpilot",      url: "https://cashpilot.atlas-studio.org" },
  { app: "wisehr",         url: "https://wisehr.atlas-studio.org" },
  { app: "wisefm",         url: "https://wisefm.atlas-studio.org" },
  { app: "atlasbanx",      url: "https://atlasbanx.atlas-studio.org" },
  { app: "advist",         url: "https://advist.atlas-studio.org" },
  { app: "docjourney",     url: "https://docjourney.atlas-studio.org" },
  { app: "duedeck",        url: "https://duedeck.atlas-studio.org" },
  { app: "atlastrade",     url: "https://atlastrade.atlas-studio.org" },
  { app: "tablesmart",     url: "https://tablesmart.atlas-studio.org" },
  { app: "atlas-lease",    url: "https://atlas-lease.atlas-studio.org" },
  { app: "cockpitjourney", url: "https://cockpitjourney.atlas-studio.org" },
  { app: "cockpit-fna",    url: "https://cockpit-fna.atlas-studio.org" },
  { app: "wedo",           url: "https://wedo.atlas-studio.org" }, // App mobile — Lighthouse sur la page de téléchargement
];

// ───────────────────────────────────────────────────────────────────────────
// MAIN ENTRY
// ───────────────────────────────────────────────────────────────────────────

export async function runScan(opts: {
  apps?: string[];        // restreindre à un sous-ensemble (codes apps)
  mode?: ScanMode;        // default 'full'
  agentId?: string | null;
}): Promise<RunScanResult> {
  const mode = opts.mode ?? "full";
  const allApps = await loadAppList();
  const targets = opts.apps && opts.apps.length > 0
    ? allApps.filter((a) => opts.apps!.includes(a.app))
    : allApps;

  if (targets.length === 0) {
    throw new Error("Aucune app à scanner");
  }

  const agentId = opts.agentId ?? await loadTechDebtAgentId();
  const audits: RunScanResult["audits"] = [];
  let totalItems = 0;
  let totalCritical = 0;

  for (const target of targets) {
    const startedAt = Date.now();
    const scanResult: AppScanResult = {
      app: target.app,
      items: [],
      scanToolsUsed: [],
      scanDurationMs: 0,
      metrics: {},
    };

    // ─── Scanner 1 : DB internal security (system-wide, attribué à asvc-platform) ───
    if (mode !== "lighthouse_only" && target.app === "asvc-platform") {
      const dbItems = await scanDbSecurity();
      scanResult.items.push(...dbItems);
      scanResult.scanToolsUsed.push("supabase_pg_catalog");
      scanResult.metrics.db_security_items = dbItems.length;
    }

    // ─── Scanner 1b : DB security WeDo (projet Supabase dédié, schéma `wedo`) ───
    if (mode !== "lighthouse_only" && target.app === "wedo") {
      const dbItems = await scanWedoDbSecurity();
      scanResult.items.push(...dbItems);
      scanResult.scanToolsUsed.push("wedo_pg_catalog");
      scanResult.metrics.db_security_items = dbItems.length;
    }

    // ─── Scanner 2 : Lighthouse (per app URL) ───
    if (mode !== "internal_only" && target.url) {
      const lighthouseItems = await scanLighthouse(target.url, scanResult);
      scanResult.items.push(...lighthouseItems);
    }

    // ─── Placeholders (loggés mais 0 item) ───
    if (mode === "full" && target.app !== "asvc-platform") {
      scanResult.scanToolsUsed.push("placeholder_sonarcloud");
      scanResult.scanToolsUsed.push("placeholder_npm_audit");
      scanResult.metrics.placeholder_note = "Scanners externes non câblés (SonarCloud, npm audit) — ingest via GitHub Action à venir";
    }

    scanResult.scanDurationMs = Date.now() - startedAt;

    // ─── Compute score ───
    const score = computeScore(scanResult.items, scanResult.metrics);
    const criticalCount = scanResult.items.filter((i) => i.severity === "critical").length;

    // ─── Trend vs audit précédent ───
    const trend = await computeTrend(target.app, score);

    // ─── Insert audit + items ───
    const auditId = await persistAudit({
      agentId,
      app: target.app,
      score,
      itemsCount: scanResult.items.length,
      criticalCount,
      trend: trend.trend,
      previousScore: trend.previousScore,
      metrics: scanResult.metrics,
      scanToolsUsed: scanResult.scanToolsUsed,
      scanDurationSeconds: Math.ceil(scanResult.scanDurationMs / 1000),
    });

    if (scanResult.items.length > 0) {
      await persistItems(agentId, auditId, target.app, scanResult.items);
    }

    audits.push({ app: target.app, auditId, itemsCount: scanResult.items.length, criticalCount, score });
    totalItems += scanResult.items.length;
    totalCritical += criticalCount;
  }

  return { ok: true, audits, totalItems, totalCritical };
}

// ───────────────────────────────────────────────────────────────────────────
// SCANNER 1 : DB security (pg_catalog)
// ───────────────────────────────────────────────────────────────────────────

async function scanDbSecurity(): Promise<ScanItem[]> {
  const items: ScanItem[] = [];

  // 1.a — Tables publiques sans RLS activé
  const { data: noRls, error: noRlsErr } = await supabaseAdmin.rpc("asvc_scan_rls_missing");
  if (noRlsErr) {
    console.warn("[scanDbSecurity] asvc_scan_rls_missing RPC missing — fallback skip:", noRlsErr.message);
  } else if (Array.isArray(noRls)) {
    for (const row of noRls as { table_name: string }[]) {
      items.push({
        category: "rls_missing",
        title: `Table \`${row.table_name}\` sans RLS`,
        description:
          "Cette table publique n'a pas Row Level Security activée. Tout utilisateur authentifié peut potentiellement lire/écrire toutes les lignes. Activer ENABLE ROW LEVEL SECURITY + policies appropriées.",
        severity: row.table_name.includes("audit") || row.table_name.includes("payment") || row.table_name.includes("invoice")
          ? "critical"
          : "high",
        priority: row.table_name.includes("audit") || row.table_name.includes("payment") ? "P0" : "P1",
        file_paths: [`supabase/migrations/*${row.table_name}*.sql`],
        detected_metric: { table: row.table_name },
        effort_estimate: "S",
      });
    }
  }

  // 1.b — SECURITY DEFINER sans search_path explicite
  const { data: sdNoPath, error: sdErr } = await supabaseAdmin.rpc("asvc_scan_security_definer_search_path");
  if (sdErr) {
    console.warn("[scanDbSecurity] asvc_scan_security_definer_search_path RPC missing — fallback skip:", sdErr.message);
  } else if (Array.isArray(sdNoPath)) {
    for (const row of sdNoPath as { function_name: string }[]) {
      items.push({
        category: "security_definer_search_path",
        title: `Fonction \`${row.function_name}\` SECURITY DEFINER sans search_path`,
        description:
          "Fonction SECURITY DEFINER sans SET search_path explicite. Risque d'attaque par injection de schema (recherche dans le schema de l'attaquant). Ajouter `SET search_path = public` dans la définition.",
        severity: "high",
        priority: "P1",
        file_paths: [`supabase/migrations/*${row.function_name}*.sql`],
        detected_metric: { function: row.function_name },
        effort_estimate: "XS",
      });
    }
  }

  return items;
}

// ───────────────────────────────────────────────────────────────────────────
// SCANNER 1b : DB security WeDo (cross-projet — projet Supabase dédié `easoqo…`)
// WeDo est géré par la console mais vit dans un autre projet Supabase. On scanne
// son schéma applicatif `wedo` via un client service-role WeDo + 2 RPC dédiées
// (wedo_scan_*). Si le secret WEDO_SERVICE_ROLE_KEY n'est pas configuré côté
// Edge Function, le scan est sauté proprement (l'audit Lighthouse reste fait).
// ───────────────────────────────────────────────────────────────────────────

let wedoClient: ReturnType<typeof createClient> | null = null;
function getWedoClient(): ReturnType<typeof createClient> | null {
  const url = Deno.env.get("WEDO_SUPABASE_URL") ?? "https://easoqoswtmvtkdwwkqtc.supabase.co";
  const key = Deno.env.get("WEDO_SERVICE_ROLE_KEY");
  if (!key) return null;
  if (!wedoClient) {
    wedoClient = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return wedoClient;
}

async function scanWedoDbSecurity(): Promise<ScanItem[]> {
  const items: ScanItem[] = [];
  const client = getWedoClient();
  if (!client) {
    console.warn("[scanWedoDbSecurity] WEDO_SERVICE_ROLE_KEY manquante — scan DB WeDo sauté");
    return items;
  }

  // 1.a — Tables du schéma `wedo` sans RLS
  const { data: noRls, error: noRlsErr } = await client.rpc("wedo_scan_rls_missing");
  if (noRlsErr) {
    console.warn("[scanWedoDbSecurity] wedo_scan_rls_missing:", noRlsErr.message);
  } else if (Array.isArray(noRls)) {
    for (const row of noRls as { table_name: string }[]) {
      const sensitive = /audit|payment|sequestre|mouvement|contribution|transaction|compte/.test(row.table_name);
      items.push({
        category: "rls_missing",
        title: `Table \`wedo.${row.table_name}\` sans RLS`,
        description:
          "Table du schéma applicatif `wedo` sans Row Level Security activée. Activer ENABLE ROW LEVEL SECURITY + policies appropriées.",
        severity: sensitive ? "critical" : "high",
        priority: /audit|payment|sequestre|mouvement|transaction/.test(row.table_name) ? "P0" : "P1",
        file_paths: [`mobile/supabase/migrations/*${row.table_name}*.sql`],
        detected_metric: { schema: "wedo", table: row.table_name },
        effort_estimate: "S",
      });
    }
  }

  // 1.b — SECURITY DEFINER sans search_path dans `wedo`
  const { data: sdNoPath, error: sdErr } = await client.rpc("wedo_scan_security_definer_search_path");
  if (sdErr) {
    console.warn("[scanWedoDbSecurity] wedo_scan_security_definer_search_path:", sdErr.message);
  } else if (Array.isArray(sdNoPath)) {
    for (const row of sdNoPath as { function_name: string }[]) {
      items.push({
        category: "security_definer_search_path",
        title: `Fonction \`wedo.${row.function_name}\` SECURITY DEFINER sans search_path`,
        description:
          "Fonction SECURITY DEFINER du schéma `wedo` sans SET search_path explicite. Risque d'injection de schema. Ajouter `SET search_path = wedo, public`.",
        severity: "high",
        priority: "P1",
        file_paths: [`mobile/supabase/migrations/*${row.function_name}*.sql`],
        detected_metric: { schema: "wedo", function: row.function_name },
        effort_estimate: "XS",
      });
    }
  }

  return items;
}

// ───────────────────────────────────────────────────────────────────────────
// SCANNER 2 : Lighthouse via PageSpeed Insights API
// ───────────────────────────────────────────────────────────────────────────

async function scanLighthouse(url: string, scanResult: AppScanResult): Promise<ScanItem[]> {
  const apiKey = Deno.env.get("PAGESPEED_API_KEY");
  if (!apiKey) {
    scanResult.metrics.lighthouse_note = "PAGESPEED_API_KEY non configurée, scan skip";
    return [];
  }

  scanResult.scanToolsUsed.push("lighthouse_psi");

  const items: ScanItem[] = [];

  for (const strategy of ["mobile", "desktop"] as const) {
    const psiUrl = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
    psiUrl.searchParams.set("url", url);
    psiUrl.searchParams.set("key", apiKey);
    psiUrl.searchParams.set("strategy", strategy);
    psiUrl.searchParams.append("category", "performance");
    psiUrl.searchParams.append("category", "accessibility");
    psiUrl.searchParams.append("category", "best-practices");
    psiUrl.searchParams.append("category", "seo");

    let psi: PsiResponse;
    try {
      const res = await fetch(psiUrl.toString(), { signal: AbortSignal.timeout(60_000) });
      if (!res.ok) {
        scanResult.metrics[`lighthouse_${strategy}_error`] = `HTTP ${res.status}`;
        continue;
      }
      psi = await res.json() as PsiResponse;
    } catch (err) {
      scanResult.metrics[`lighthouse_${strategy}_error`] = (err as Error).message;
      continue;
    }

    const categories = psi.lighthouseResult?.categories ?? {};
    const perfScore = Math.round((categories.performance?.score ?? 0) * 100);
    const a11yScore = Math.round((categories.accessibility?.score ?? 0) * 100);
    const bestScore = Math.round((categories["best-practices"]?.score ?? 0) * 100);

    scanResult.metrics[`lighthouse_${strategy}_perf`] = perfScore;
    scanResult.metrics[`lighthouse_${strategy}_a11y`] = a11yScore;
    scanResult.metrics[`lighthouse_${strategy}_bp`] = bestScore;

    if (perfScore < 50) {
      items.push({
        category: "perf_regression",
        title: `Performance ${strategy} critique : Lighthouse score ${perfScore}/100`,
        description: `Le score Lighthouse Performance ${strategy} est en-dessous du seuil acceptable (50). Optimiser : code splitting, lazy loading, compression images, suppression JS bloquant.`,
        severity: "high",
        priority: "P1",
        detected_metric: { strategy, score: perfScore, threshold: 50 },
        effort_estimate: "M",
      });
    } else if (perfScore < 75) {
      items.push({
        category: "perf_regression",
        title: `Performance ${strategy} dégradée : Lighthouse score ${perfScore}/100`,
        description: `Le score Lighthouse Performance ${strategy} est en-dessous de l'objectif Atlas Studio (75). Voir les opportunités dans le rapport PSI complet.`,
        severity: "medium",
        priority: "P2",
        detected_metric: { strategy, score: perfScore, threshold: 75 },
        effort_estimate: "S",
      });
    }

    if (a11yScore < 90) {
      items.push({
        category: "arch_smell",
        title: `Accessibilité ${strategy} en-dessous WCAG AA : ${a11yScore}/100`,
        description: `Le score Lighthouse Accessibilité ${strategy} est ${a11yScore}/100 (cible 90+ pour WCAG AA min). Vérifier contraste, ARIA labels, navigation clavier.`,
        severity: a11yScore < 75 ? "high" : "medium",
        priority: a11yScore < 75 ? "P1" : "P2",
        detected_metric: { strategy, score: a11yScore, threshold: 90 },
        effort_estimate: "S",
      });
    }
  }

  return items;
}

// ───────────────────────────────────────────────────────────────────────────
// Score code health (0-100)
// ───────────────────────────────────────────────────────────────────────────

function computeScore(items: ScanItem[], metrics: Record<string, unknown>): number {
  // Base = moyenne des scores Lighthouse si présents, sinon 100
  const lighthouseScores: number[] = [];
  for (const k of Object.keys(metrics)) {
    if (k.startsWith("lighthouse_") && (k.endsWith("_perf") || k.endsWith("_a11y") || k.endsWith("_bp"))) {
      const v = metrics[k];
      if (typeof v === "number") lighthouseScores.push(v);
    }
  }
  let base = lighthouseScores.length > 0
    ? lighthouseScores.reduce((a, b) => a + b, 0) / lighthouseScores.length
    : 100;

  // Pénalités par severity d'item
  const penalties: Record<Severity, number> = { critical: 10, high: 5, medium: 2, low: 0.5 };
  for (const item of items) {
    base -= penalties[item.severity];
  }

  return Math.max(0, Math.min(100, Math.round(base * 10) / 10));
}

async function computeTrend(
  app: string,
  newScore: number,
): Promise<{ trend: "improving" | "stable" | "degrading" | null; previousScore: number | null }> {
  const { data: prev } = await supabaseAdmin
    .from("asvc_code_health_audits")
    .select("score")
    .eq("app_concerned", app)
    .order("audit_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!prev || prev.score === null) return { trend: null, previousScore: null };

  const prevScore = Number(prev.score);
  const delta = newScore - prevScore;
  const trend = delta >= 3 ? "improving" : delta <= -3 ? "degrading" : "stable";
  return { trend, previousScore: prevScore };
}

// ───────────────────────────────────────────────────────────────────────────
// Persistence
// ───────────────────────────────────────────────────────────────────────────

async function persistAudit(opts: {
  agentId: string | null;
  app: string;
  score: number;
  itemsCount: number;
  criticalCount: number;
  trend: "improving" | "stable" | "degrading" | null;
  previousScore: number | null;
  metrics: Record<string, unknown>;
  scanToolsUsed: string[];
  scanDurationSeconds: number;
}): Promise<string> {
  // Upsert : 1 audit par app par jour (contrainte UNIQUE en BDD)
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabaseAdmin
    .from("asvc_code_health_audits")
    .upsert(
      {
        agent_id: opts.agentId,
        app_concerned: opts.app,
        audit_date: today,
        score: opts.score,
        metrics: opts.metrics,
        items_detected_count: opts.itemsCount,
        items_critical_count: opts.criticalCount,
        trend: opts.trend,
        previous_score: opts.previousScore,
        scan_tools_used: opts.scanToolsUsed,
        scan_duration_seconds: opts.scanDurationSeconds,
      },
      { onConflict: "app_concerned,audit_date" },
    )
    .select("id")
    .single();

  if (error) throw new Error(`persistAudit failed: ${error.message}`);
  return data.id as string;
}

async function persistItems(
  agentId: string | null,
  auditId: string,
  app: string,
  items: ScanItem[],
): Promise<void> {
  const rows = items.map((item) => ({
    detected_by_agent_id: agentId,
    audit_id: auditId,
    app_concerned: app,
    category: item.category,
    title: item.title,
    description: item.description ?? null,
    severity: item.severity,
    priority: item.priority,
    file_paths: item.file_paths ?? null,
    detected_metric: item.detected_metric ?? null,
    effort_estimate: item.effort_estimate ?? null,
    status: "detected",
  }));
  const { error } = await supabaseAdmin.from("asvc_tech_debt_items").insert(rows);
  if (error) throw new Error(`persistItems failed: ${error.message}`);
}

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

async function loadTechDebtAgentId(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("asvc_agents")
    .select("id")
    .eq("code", "tech_debt")
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

async function loadAppList(): Promise<{ app: string; url: string | null }[]> {
  // Override possible via asvc_agent_memory_shared.key = 'tech_debt_app_list'
  const { data } = await supabaseAdmin
    .from("asvc_agent_memory_shared")
    .select("value")
    .eq("key", "tech_debt_app_list")
    .maybeSingle();

  if (data?.value && Array.isArray(data.value)) {
    return data.value as { app: string; url: string | null }[];
  }
  return DEFAULT_APPS;
}

// ───────────────────────────────────────────────────────────────────────────
// Types PageSpeed Insights (subset)
// ───────────────────────────────────────────────────────────────────────────

interface PsiResponse {
  lighthouseResult?: {
    categories?: Record<string, { score?: number | null }>;
  };
}
