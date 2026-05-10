// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — Domain L2 : SUPPORT / Customer service
// ═══════════════════════════════════════════════════════════════════════════
// 5 tools metier :
//   1. compute_csat_nps           : CSAT/NPS scoring + decomposition
//   2. score_ticket_priority      : priorite ticket (P0-P4) selon impact + urgence
//   3. compute_sla_compliance     : taux respect SLA + breach detection
//   4. predict_resolution_time    : estimation duree resolution (heuristique)
//   5. analyze_ticket_categories  : top issues par categorie + tendances
// ═══════════════════════════════════════════════════════════════════════════

// ─── 1. CSAT / NPS ──────────────────────────────────────────────────────────
/**
 * CSAT (Customer Satisfaction) = nb_satisfaits / total × 100
 *   Norme : >85% bon, >90% excellent
 *
 * NPS (Net Promoter Score) = %promoteurs (9-10) - %detracteurs (0-6)
 *   Norme : >0 OK, >30 bon, >50 excellent, >70 world-class
 *
 * NPS et CSAT mesurent des choses differentes :
 *   - CSAT : satisfaction sur une interaction
 *   - NPS : loyaute / probabilite de recommander
 */
export function computeCsatNps(args: {
  scores: number[];            // notes 0-10
  type: "csat" | "nps" | "both";
  csat_threshold?: number;      // note min pour "satisfait" (defaut 7)
}): {
  ok: boolean;
  total_responses: number;
  csat?: { note_moyenne: number; pct_satisfaits: number; pct_neutres: number; pct_insatisfaits: number };
  nps?: { score: number; pct_promoteurs: number; pct_passifs: number; pct_detracteurs: number; niveau: "world_class" | "excellent" | "bon" | "ok" | "negatif" };
  interpretation: string;
} {
  if (args.scores.length === 0) {
    return { ok: false, total_responses: 0, interpretation: "Aucune reponse" };
  }
  const total = args.scores.length;
  const result: any = { ok: true, total_responses: total };

  if (args.type === "csat" || args.type === "both") {
    const threshold = args.csat_threshold ?? 7;
    const moy = args.scores.reduce((s, n) => s + n, 0) / total;
    const satis = args.scores.filter(n => n >= threshold).length;
    const insatis = args.scores.filter(n => n <= 4).length;
    result.csat = {
      note_moyenne: Math.round(moy * 100) / 100,
      pct_satisfaits: Math.round((satis / total) * 100),
      pct_neutres: Math.round(((total - satis - insatis) / total) * 100),
      pct_insatisfaits: Math.round((insatis / total) * 100),
    };
  }

  if (args.type === "nps" || args.type === "both") {
    const prom = args.scores.filter(n => n >= 9).length;
    const det = args.scores.filter(n => n <= 6).length;
    const pas = total - prom - det;
    const score = Math.round((prom / total - det / total) * 100);
    const niveau: "world_class" | "excellent" | "bon" | "ok" | "negatif" =
      score >= 70 ? "world_class" : score >= 50 ? "excellent" : score >= 30 ? "bon" : score >= 0 ? "ok" : "negatif";
    result.nps = {
      score,
      pct_promoteurs: Math.round((prom / total) * 100),
      pct_passifs: Math.round((pas / total) * 100),
      pct_detracteurs: Math.round((det / total) * 100),
      niveau,
    };
  }

  let interp = "";
  if (result.csat) {
    interp += result.csat.pct_satisfaits >= 90 ? "CSAT excellent. " : result.csat.pct_satisfaits >= 80 ? "CSAT correct. " : "CSAT a ameliorer. ";
  }
  if (result.nps) {
    interp += `NPS ${result.nps.niveau} (${result.nps.score}). `;
    if (result.nps.score < 30) interp += "Identifier les detracteurs et leurs raisons.";
  }
  result.interpretation = interp.trim();

  return result;
}

// ─── 2. Score ticket priority ───────────────────────────────────────────────
/**
 * Priorisation P0-P4 selon (impact business × urgence) :
 *
 *   P0 (Critique)   : prod down, securite, > 50% users impactes
 *   P1 (Eleve)      : feature critique cassee, 10-50% users
 *   P2 (Normal)     : bug genant mais workaround, < 10% users
 *   P3 (Faible)     : amelioration UX, 1 user
 *   P4 (Backlog)    : nice-to-have
 *
 * Multiplicateurs :
 *   - Client VIP / contrat critique : +1 niveau
 *   - SLA en infraction : +1 niveau
 *   - Securite / RGPD : force P0
 */
export function scoreTicketPriority(args: {
  impact_users_pct: number;
  service_status: "operational" | "degraded" | "down" | "data_loss";
  has_workaround: boolean;
  client_vip?: boolean;
  sla_breached?: boolean;
  is_security_or_rgpd?: boolean;
}): {
  ok: boolean;
  priority: "P0" | "P1" | "P2" | "P3" | "P4";
  score_brut: number;
  modifiers: string[];
  sla_target_hours: number;
  notification_immediate: boolean;
} {
  let score = 0;
  const modifiers: string[] = [];

  // Status
  if (args.service_status === "data_loss") { score += 100; modifiers.push("Data loss = P0 force"); }
  else if (args.service_status === "down") score += 50;
  else if (args.service_status === "degraded") score += 25;

  // Impact users
  if (args.impact_users_pct >= 50) score += 50;
  else if (args.impact_users_pct >= 10) score += 30;
  else if (args.impact_users_pct >= 1) score += 10;

  // Workaround
  if (!args.has_workaround) score += 15;

  // Modifiers
  if (args.client_vip) { score += 20; modifiers.push("VIP +20"); }
  if (args.sla_breached) { score += 25; modifiers.push("SLA breach +25"); }
  if (args.is_security_or_rgpd) { score += 100; modifiers.push("Securite/RGPD = P0"); }

  let priority: "P0" | "P1" | "P2" | "P3" | "P4";
  if (score >= 100) priority = "P0";
  else if (score >= 70) priority = "P1";
  else if (score >= 40) priority = "P2";
  else if (score >= 15) priority = "P3";
  else priority = "P4";

  const slaHours = priority === "P0" ? 1 : priority === "P1" ? 4 : priority === "P2" ? 24 : priority === "P3" ? 72 : 168;
  const notif = priority === "P0" || priority === "P1";

  return {
    ok: true,
    priority,
    score_brut: score,
    modifiers,
    sla_target_hours: slaHours,
    notification_immediate: notif,
  };
}

// ─── 3. SLA compliance ──────────────────────────────────────────────────────
/**
 * Calcule le taux de respect du SLA sur une periode :
 *   - taux respect = tickets respectes / total
 *   - breach detection : tickets ouverts dont le SLA est expire
 *
 * SLA standard B2B :
 *   First response : 1h (P0), 4h (P1), 1j (P2), 3j (P3)
 *   Resolution : 4h, 1j, 5j, 30j
 */
const SLA_DEFAULT_HOURS: Record<string, { first_response: number; resolution: number }> = {
  P0: { first_response: 1, resolution: 4 },
  P1: { first_response: 4, resolution: 24 },
  P2: { first_response: 24, resolution: 120 },
  P3: { first_response: 72, resolution: 720 },
  P4: { first_response: 168, resolution: 2160 },
};

export function computeSlaCompliance(args: {
  tickets: { id: string; priority: "P0" | "P1" | "P2" | "P3" | "P4"; created_at: string; first_response_at?: string; resolved_at?: string; status: "open" | "in_progress" | "resolved" | "closed" }[];
  current_time?: string;
}): {
  ok: boolean;
  total_tickets: number;
  first_response_compliance_pct: number;
  resolution_compliance_pct: number;
  breaches_currently: { id: string; priority: string; type: "first_response" | "resolution"; hours_overdue: number }[];
  by_priority: Record<string, { count: number; first_resp_ok: number; resolution_ok: number; resp_pct: number; resol_pct: number }>;
} {
  const now = args.current_time ? new Date(args.current_time) : new Date();
  const byPrio: Record<string, { count: number; first_resp_ok: number; resolution_ok: number; resp_pct: number; resol_pct: number }> = {};
  const breaches: any[] = [];
  let totalRespOk = 0, totalResolOk = 0, totalRespEval = 0, totalResolEval = 0;

  for (const t of args.tickets) {
    const sla = SLA_DEFAULT_HOURS[t.priority];
    if (!sla) continue;
    byPrio[t.priority] ??= { count: 0, first_resp_ok: 0, resolution_ok: 0, resp_pct: 0, resol_pct: 0 };
    byPrio[t.priority].count++;

    const created = new Date(t.created_at);
    const slaRespDeadline = new Date(created.getTime() + sla.first_response * 3600000);
    const slaResolDeadline = new Date(created.getTime() + sla.resolution * 3600000);

    // First response
    if (t.first_response_at) {
      totalRespEval++;
      if (new Date(t.first_response_at) <= slaRespDeadline) {
        byPrio[t.priority].first_resp_ok++;
        totalRespOk++;
      }
    } else if (t.status === "open" && now > slaRespDeadline) {
      const overdue = (now.getTime() - slaRespDeadline.getTime()) / 3600000;
      breaches.push({ id: t.id, priority: t.priority, type: "first_response", hours_overdue: Math.round(overdue * 10) / 10 });
    }

    // Resolution
    if (t.resolved_at) {
      totalResolEval++;
      if (new Date(t.resolved_at) <= slaResolDeadline) {
        byPrio[t.priority].resolution_ok++;
        totalResolOk++;
      }
    } else if ((t.status === "open" || t.status === "in_progress") && now > slaResolDeadline) {
      const overdue = (now.getTime() - slaResolDeadline.getTime()) / 3600000;
      breaches.push({ id: t.id, priority: t.priority, type: "resolution", hours_overdue: Math.round(overdue * 10) / 10 });
    }
  }

  for (const k of Object.keys(byPrio)) {
    byPrio[k].resp_pct = byPrio[k].count > 0 ? Math.round((byPrio[k].first_resp_ok / byPrio[k].count) * 100) : 0;
    byPrio[k].resol_pct = byPrio[k].count > 0 ? Math.round((byPrio[k].resolution_ok / byPrio[k].count) * 100) : 0;
  }

  return {
    ok: true,
    total_tickets: args.tickets.length,
    first_response_compliance_pct: totalRespEval > 0 ? Math.round((totalRespOk / totalRespEval) * 100) : 100,
    resolution_compliance_pct: totalResolEval > 0 ? Math.round((totalResolOk / totalResolEval) * 100) : 100,
    breaches_currently: breaches.sort((a, b) => b.hours_overdue - a.hours_overdue),
    by_priority: byPrio,
  };
}

// ─── 4. Predict resolution time ────────────────────────────────────────────
/**
 * Estimation duree de resolution selon heuristiques :
 *   - Categorie + complexite (si historique fournis, moyenne / median)
 *   - Charge actuelle de la team
 *   - Heure de creation (jour ouvre vs nuit/weekend)
 */
export function predictResolutionTime(args: {
  category: string;
  complexity?: "simple" | "medium" | "complex";
  team_load_pct?: number;          // % capacite utilisee
  created_at: string;
  historical_resolutions_hours?: number[];   // historiques meme categorie
}): {
  ok: boolean;
  estimated_hours: number;
  confidence: "low" | "medium" | "high";
  factors: { factor: string; impact_hours: number }[];
  predicted_resolution_at: string;
} {
  const factors: { factor: string; impact_hours: number }[] = [];
  let baseHours = 4;  // defaut

  // Si historique : utiliser median
  if (args.historical_resolutions_hours && args.historical_resolutions_hours.length >= 5) {
    const sorted = [...args.historical_resolutions_hours].sort((a, b) => a - b);
    baseHours = sorted[Math.floor(sorted.length / 2)];
    factors.push({ factor: `Mediane historique (${sorted.length} samples)`, impact_hours: baseHours });
  } else {
    factors.push({ factor: "Estimation par defaut", impact_hours: 4 });
  }

  // Complexity multiplier
  const compMult = args.complexity === "complex" ? 2.5 : args.complexity === "medium" ? 1.5 : args.complexity === "simple" ? 0.7 : 1;
  if (args.complexity) {
    const adj = baseHours * (compMult - 1);
    factors.push({ factor: `Complexite ${args.complexity} ×${compMult}`, impact_hours: Math.round(adj * 10) / 10 });
    baseHours *= compMult;
  }

  // Team load
  if (args.team_load_pct !== undefined) {
    let loadMult = 1;
    if (args.team_load_pct > 90) loadMult = 1.8;
    else if (args.team_load_pct > 75) loadMult = 1.4;
    else if (args.team_load_pct > 60) loadMult = 1.2;
    if (loadMult > 1) {
      const adj = baseHours * (loadMult - 1);
      factors.push({ factor: `Charge equipe ${args.team_load_pct}% ×${loadMult}`, impact_hours: Math.round(adj * 10) / 10 });
      baseHours *= loadMult;
    }
  }

  // Weekend / nuit
  const created = new Date(args.created_at);
  const dow = created.getUTCDay();
  const hour = created.getUTCHours();
  if (dow === 0 || dow === 6) {
    const adj = baseHours * 0.5;
    factors.push({ factor: "Cree le weekend ×1.5", impact_hours: Math.round(adj * 10) / 10 });
    baseHours *= 1.5;
  } else if (hour < 8 || hour >= 19) {
    const adj = baseHours * 0.3;
    factors.push({ factor: "Cree hors heures bureau ×1.3", impact_hours: Math.round(adj * 10) / 10 });
    baseHours *= 1.3;
  }

  const finalHours = Math.round(baseHours * 10) / 10;
  const confidence: "low" | "medium" | "high" =
    args.historical_resolutions_hours && args.historical_resolutions_hours.length >= 10 ? "high"
    : args.historical_resolutions_hours && args.historical_resolutions_hours.length >= 5 ? "medium"
    : "low";

  const predicted = new Date(created.getTime() + finalHours * 3600000);

  return {
    ok: true,
    estimated_hours: finalHours,
    confidence,
    factors,
    predicted_resolution_at: predicted.toISOString(),
  };
}

// ─── 5. Analyze ticket categories ──────────────────────────────────────────
/**
 * Analyse la repartition des tickets par categorie :
 *   - Top 5 categories
 *   - Tendance (comparaison avec periode precedente)
 *   - Categories avec resolution lente (median > seuil)
 */
export function analyzeTicketCategories(args: {
  tickets_current: { id: string; category: string; resolution_hours?: number; status: string }[];
  tickets_previous?: { id: string; category: string; resolution_hours?: number }[];
  slow_resolution_threshold_hours?: number;
}): {
  ok: boolean;
  total_current: number;
  top_categories: { category: string; count: number; pct: number; median_resolution_hours?: number; tendance?: "hausse" | "baisse" | "stable" }[];
  slow_categories: { category: string; median_hours: number; count: number }[];
  recommendations: string[];
} {
  const slowThreshold = args.slow_resolution_threshold_hours ?? 48;

  const grouper = (tickets: any[]) => {
    const map = new Map<string, { count: number; resolutions: number[] }>();
    for (const t of tickets) {
      const cat = t.category || "Sans categorie";
      const cur = map.get(cat) ?? { count: 0, resolutions: [] };
      cur.count++;
      if (t.resolution_hours !== undefined) cur.resolutions.push(t.resolution_hours);
      map.set(cat, cur);
    }
    return map;
  };

  const median = (arr: number[]): number | undefined => {
    if (arr.length === 0) return undefined;
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };

  const cur = grouper(args.tickets_current);
  const prev = args.tickets_previous ? grouper(args.tickets_previous) : null;
  const total = args.tickets_current.length;

  const top = Array.from(cur.entries())
    .map(([category, v]) => {
      const med = median(v.resolutions);
      let tendance: "hausse" | "baisse" | "stable" | undefined;
      if (prev && prev.has(category)) {
        const pCount = prev.get(category)!.count;
        const ratio = pCount > 0 ? v.count / pCount : 1;
        tendance = ratio > 1.2 ? "hausse" : ratio < 0.8 ? "baisse" : "stable";
      }
      return {
        category,
        count: v.count,
        pct: total > 0 ? Math.round((v.count / total) * 100) : 0,
        median_resolution_hours: med !== undefined ? Math.round(med * 10) / 10 : undefined,
        tendance,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const slow = Array.from(cur.entries())
    .map(([cat, v]) => ({ category: cat, median_hours: median(v.resolutions) ?? 0, count: v.count }))
    .filter(c => c.median_hours > slowThreshold)
    .sort((a, b) => b.median_hours - a.median_hours)
    .slice(0, 5);

  const recs: string[] = [];
  for (const t of top) {
    if (t.tendance === "hausse" && t.pct >= 15) {
      recs.push(`Categorie '${t.category}' en hausse (${t.pct}% volume) — investiguer cause racine`);
    }
  }
  if (slow.length > 0) {
    recs.push(`${slow.length} categorie(s) avec resolution lente (>${slowThreshold}h) — KB articles ou formation team`);
  }
  if (recs.length === 0) recs.push("Repartition stable, equipes bien dimensionnees");

  return {
    ok: true,
    total_current: total,
    top_categories: top,
    slow_categories: slow,
    recommendations: recs,
  };
}
