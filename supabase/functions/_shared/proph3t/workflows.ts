// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — Workflows orchestrés (multi-tool en un appel)
// ═══════════════════════════════════════════════════════════════════════════
// Un workflow appelle plusieurs tools en sequence et agrege les resultats
// dans un rapport unique. Permet a l'utilisateur de declencher un audit
// complet, un closing mensuel, etc. en UN SEUL appel LLM.
//
// Note : la fonction runTool est passee par l'orchestrateur pour eviter
// l'import circulaire entre workflows.ts et tools.ts.
// ═══════════════════════════════════════════════════════════════════════════

export type RunToolFn = (name: string, args: Record<string, unknown>) => Promise<unknown>;

interface WorkflowStep {
  tool: string;
  args: Record<string, unknown>;
  label: string;
  optional?: boolean;
}

async function runWorkflow(
  runTool: RunToolFn,
  steps: WorkflowStep[],
): Promise<{ steps_results: { label: string; tool: string; ok: boolean; result?: unknown; error?: string; duration_ms: number }[]; total_duration_ms: number }> {
  const t0 = Date.now();
  const results: any[] = [];
  for (const s of steps) {
    const start = Date.now();
    try {
      const r = await runTool(s.tool, s.args);
      results.push({ label: s.label, tool: s.tool, ok: true, result: r, duration_ms: Date.now() - start });
    } catch (e) {
      results.push({ label: s.label, tool: s.tool, ok: false, error: (e as Error).message, duration_ms: Date.now() - start });
      if (!s.optional) {
        // Continue meme si non-optionnel — on rapporte juste l'erreur
      }
    }
  }
  return { steps_results: results, total_duration_ms: Date.now() - t0 };
}

// ─── 1. Audit complet societe ──────────────────────────────────────────────
/**
 * Workflow d'audit comptable complet :
 *   1. validate_journal_entry      : check partie double
 *   2. test_balance_general        : equilibre + soldes anormaux
 *   3. apply_benford_law           : detection fraude
 *   4. detect_accounting_anomalies : ecritures suspectes
 *   5. analyze_variance_interperiode (si exercice N-1 fourni)
 *   6. compute_materiality         : seuil de signification
 *   7. generate_report             : rapport markdown final
 */
export async function workflowAuditCompletSociete(
  runTool: RunToolFn,
  args: {
    raison_sociale: string;
    exercice: string;
    entries: { compte: string; debit_centimes: string | bigint; credit_centimes: string | bigint; date: string; numero_piece?: string; libelle?: string }[];
    entries_n_minus_1?: { compte: string; solde_centimes: string }[];
    resultat_avant_impot_centimes?: string | bigint;
    ca_total_centimes?: string | bigint;
  },
): Promise<{
  ok: boolean;
  raison_sociale: string;
  exercice: string;
  workflow_steps: unknown;
  synthese: { score_audit: number; verdict: "clean" | "reserves" | "issues_majeures"; alertes: string[]; recommandations: string[] };
  report_markdown: string;
}> {
  const steps: WorkflowStep[] = [
    {
      tool: "validate_journal_entry",
      label: "Validation partie double + comptes SYSCOHADA",
      args: { entries: args.entries },
    },
    {
      tool: "test_balance_general",
      label: "Equilibre balance + soldes anormaux",
      args: {
        balance: args.entries.map(e => ({
          compte: e.compte,
          solde_debiteur_centimes: BigInt(e.debit_centimes).toString(),
          solde_crediteur_centimes: BigInt(e.credit_centimes).toString(),
        })),
      },
    },
    {
      tool: "apply_benford_law",
      label: "Detection fraude — loi de Benford",
      args: {
        amounts_centimes: args.entries.map(e => BigInt(e.debit_centimes).toString()).filter(a => a !== "0"),
        min_amount_threshold: 1000,
      },
      optional: true,
    },
    {
      tool: "detect_accounting_anomalies",
      label: "Ecritures suspectes (montants ronds, weekend, doublons)",
      args: { entries: args.entries },
    },
  ];

  if (args.entries_n_minus_1) {
    const exerciceNCompact = new Map<string, bigint>();
    for (const e of args.entries) {
      const cur = exerciceNCompact.get(e.compte) ?? 0n;
      exerciceNCompact.set(e.compte, cur + BigInt(e.debit_centimes) - BigInt(e.credit_centimes));
    }
    steps.push({
      tool: "analyze_variance_interperiode",
      label: "Analyse variations N vs N-1",
      args: {
        exercice_n: Array.from(exerciceNCompact.entries()).map(([c, s]) => ({ compte: c, solde_centimes: s.toString() })),
        exercice_n_minus_1: args.entries_n_minus_1,
      },
      optional: true,
    });
  }

  if (args.resultat_avant_impot_centimes) {
    steps.push({
      tool: "compute_materiality",
      label: "Seuil de signification ISA 320",
      args: { resultat_avant_impot_centimes: args.resultat_avant_impot_centimes, approche: "resultat" },
    });
  }

  const wf = await runWorkflow(runTool, steps);

  // Synthese
  const alertes: string[] = [];
  const recommandations: string[] = [];
  let score = 100;

  for (const s of wf.steps_results) {
    if (!s.ok) { score -= 10; alertes.push(`Etape '${s.label}' KO : ${s.error}`); continue; }
    const r = s.result as any;
    if (s.tool === "validate_journal_entry" && r?.valid === false) {
      score -= 25;
      alertes.push(`Ecritures non equilibrees : ${r.errors?.length ?? 0} erreurs`);
    }
    if (s.tool === "test_balance_general" && r?.equilibre === false) {
      score -= 30;
      alertes.push(`Balance non equilibree : ecart ${r.ecart_centimes} centimes`);
    }
    if (s.tool === "apply_benford_law") {
      if (r?.verdict === "fraude_probable") { score -= 30; alertes.push(`Benford : fraude probable (chi2=${r.chi2})`); }
      else if (r?.verdict === "suspect") { score -= 10; alertes.push(`Benford : distribution suspecte`); }
    }
    if (s.tool === "detect_accounting_anomalies") {
      const cri = r?.summary?.critical ?? 0;
      if (cri > 0) { score -= cri * 5; alertes.push(`${cri} anomalie(s) critique(s) detectees`); }
    }
    if (s.tool === "analyze_variance_interperiode") {
      const sigCount = r?.total_significatifs ?? 0;
      if (sigCount > 5) recommandations.push(`${sigCount} variations significatives N/N-1 a expliquer dans le rapport`);
    }
  }

  score = Math.max(0, score);
  const verdict: "clean" | "reserves" | "issues_majeures" =
    score >= 85 ? "clean" : score >= 60 ? "reserves" : "issues_majeures";

  if (verdict !== "clean") recommandations.push("Faire valider les ecritures litigieuses par un expert-comptable avant cloture");
  if (recommandations.length === 0) recommandations.push("Audit propre. Cloturer l'exercice.");

  // Generate report via le tool generate_report
  const sectionsReport = [
    { heading: "Synthese audit", content: `**Score audit : ${score}/100** — Verdict : **${verdict}**\n\n${alertes.length > 0 ? "Alertes :\n- " + alertes.join("\n- ") : "Aucune alerte critique."}` },
    ...wf.steps_results.map(s => ({
      heading: s.label,
      content: s.ok ? `OK (${s.duration_ms}ms) — ${JSON.stringify(s.result).slice(0, 500)}...` : `KO : ${s.error}`,
    })),
    { heading: "Recommandations", content: recommandations.map(r => `- ${r}`).join("\n") },
  ];
  const reportRes = await runTool("generate_report", {
    title: `Audit ${args.raison_sociale} — Exercice ${args.exercice}`,
    subtitle: `Score : ${score}/100 (${verdict})`,
    sections: sectionsReport,
    format: "markdown",
  }) as any;

  return {
    ok: true,
    raison_sociale: args.raison_sociale,
    exercice: args.exercice,
    workflow_steps: wf.steps_results,
    synthese: { score_audit: score, verdict, alertes, recommandations },
    report_markdown: reportRes?.report ?? "",
  };
}

// ─── 2. Closing mensuel ────────────────────────────────────────────────────
/**
 * Workflow de cloture mensuelle :
 *   1. validate_journal_entry        : ecritures du mois
 *   2. test_balance_general          : balance equilibree
 *   3. generate_balance_sheet        : bilan
 *   4. generate_compte_resultat      : compte de resultat
 *   5. compute_ratio bfr / fr / tn   : ratios cles
 *   6. generate_report               : rapport mensuel
 */
export async function workflowClosingMensuel(
  runTool: RunToolFn,
  args: {
    raison_sociale: string;
    mois: string;             // YYYY-MM
    entries: any[];
  },
): Promise<{
  ok: boolean;
  mois: string;
  workflow_steps: unknown;
  bilan?: unknown;
  compte_resultat?: unknown;
  ratios?: unknown[];
  report_markdown: string;
}> {
  const exerciceShort = args.mois.slice(0, 4);
  const steps: WorkflowStep[] = [
    { tool: "validate_journal_entry", label: "Validation ecritures du mois", args: { entries: args.entries } },
    { tool: "test_balance_general", label: "Equilibre balance",
      args: { balance: args.entries.map((e: any) => ({ compte: e.compte, solde_debiteur_centimes: e.debit_centimes, solde_crediteur_centimes: e.credit_centimes })) },
    },
    { tool: "generate_balance_sheet", label: "Bilan",
      args: { entries: args.entries, exercice: exerciceShort, raison_sociale: args.raison_sociale },
    },
    { tool: "generate_compte_resultat", label: "Compte de resultat",
      args: { entries: args.entries, exercice: exerciceShort, raison_sociale: args.raison_sociale },
    },
  ];

  const wf = await runWorkflow(runTool, steps);

  // Extraire bilan et compte resultat des steps
  const bilan = wf.steps_results.find(s => s.tool === "generate_balance_sheet")?.result as any;
  const cr = wf.steps_results.find(s => s.tool === "generate_compte_resultat")?.result as any;

  // Calculer ratios cles si bilan dispo
  const ratios: unknown[] = [];
  if (bilan?.ok) {
    const inputs = {
      capitauxPropres: bilan.passif?.capitaux_propres_centimes,
      dettesFinancieres: bilan.passif?.dettes_financieres_centimes,
      immobilisationsNettes: bilan.actif?.immobilisations_centimes,
      stocks: "0", creancesClients: "0", autresCreances: "0",
      tresorerieActif: bilan.actif?.tresorerie_actif_centimes,
      dettesFournisseurs: bilan.passif?.dettes_circulantes_centimes,
      dettesFiscalesSociales: "0", autresDettes: "0",
      tresoreriePassif: bilan.passif?.tresorerie_passif_centimes,
      totalActif: bilan.actif?.total_centimes,
    };
    for (const rt of ["fr", "bfr", "tresorerie_nette"]) {
      try {
        const r = await runTool("compute_ratio", { ratio_type: rt, inputs });
        ratios.push({ ratio_type: rt, result: r });
      } catch (e) {
        ratios.push({ ratio_type: rt, error: (e as Error).message });
      }
    }
  }

  const sectionsReport = [
    { heading: "Cloture mensuelle", content: `Periode : **${args.mois}** — Societe : **${args.raison_sociale}**` },
    { heading: "Validation ecritures", content: JSON.stringify(wf.steps_results[0]?.result).slice(0, 400) },
    { heading: "Bilan synthetique", content: bilan ? `Total actif : ${bilan.actif?.total_centimes}\nTotal passif : ${bilan.passif?.total_centimes}\nEquilibre : ${bilan.equilibre}` : "N/A" },
    { heading: "Compte de resultat", content: cr ? `Resultat net : ${cr.resultat_net_centimes} centimes` : "N/A" },
    { heading: "Ratios cles", content: ratios.map((r: any) => `- ${r.ratio_type}: ${JSON.stringify(r.result).slice(0, 100) || r.error}`).join("\n") },
  ];
  const reportRes = await runTool("generate_report", {
    title: `Closing ${args.raison_sociale} — ${args.mois}`,
    sections: sectionsReport,
    format: "markdown",
  }) as any;

  return {
    ok: true,
    mois: args.mois,
    workflow_steps: wf.steps_results,
    bilan,
    compte_resultat: cr,
    ratios,
    report_markdown: reportRes?.report ?? "",
  };
}

// ─── 3. Due diligence lite ────────────────────────────────────────────────
/**
 * Mini due diligence pour lever de fonds / acquisition :
 *   1. compute_ratio (FR, BFR, TN, autonomie, liquidite, Z-Score)
 *   2. apply_benford_law sur les ventes
 *   3. compute_materiality
 *   4. compute_audit_sample
 *   5. score_internal_control (si responses fournies)
 */
export async function workflowDueDiligenceLite(
  runTool: RunToolFn,
  args: {
    raison_sociale: string;
    inputs_financiers: Record<string, string>;
    amounts_for_benford?: string[];
    resultat_avant_impot_centimes?: string;
    ca_total_centimes?: string;
    population_audit_size?: number;
    internal_control_responses?: any[];
  },
): Promise<{
  ok: boolean;
  raison_sociale: string;
  ratios: unknown;
  fraude_check?: unknown;
  materiality?: unknown;
  audit_sample?: unknown;
  internal_control?: unknown;
  recommendation: "go" | "nogo" | "approfondir";
  report_markdown: string;
}> {
  const steps: WorkflowStep[] = [];

  // Ratios cles
  for (const rt of ["fr", "bfr", "tresorerie_nette", "autonomie_financiere", "liquidite_generale", "altman_z_score"]) {
    steps.push({ tool: "compute_ratio", label: `Ratio ${rt}`, args: { ratio_type: rt, inputs: args.inputs_financiers }, optional: true });
  }

  if (args.amounts_for_benford) {
    steps.push({ tool: "apply_benford_law", label: "Benford sur ventes", args: { amounts_centimes: args.amounts_for_benford }, optional: true });
  }
  if (args.resultat_avant_impot_centimes) {
    steps.push({ tool: "compute_materiality", label: "Materiality", args: { resultat_avant_impot_centimes: args.resultat_avant_impot_centimes, approche: "resultat" } });
  }
  if (args.population_audit_size) {
    steps.push({ tool: "compute_audit_sample", label: "Echantillon audit", args: { population_size: args.population_audit_size } });
  }
  if (args.internal_control_responses) {
    steps.push({ tool: "score_internal_control", label: "Score controle interne", args: { responses: args.internal_control_responses } });
  }

  const wf = await runWorkflow(runTool, steps);

  // Synthese ratios
  const ratiosResult: any = {};
  for (const s of wf.steps_results) {
    if (s.tool === "compute_ratio" && s.ok) {
      ratiosResult[(s.args as any).ratio_type] = s.result;
    }
  }

  const fraude = wf.steps_results.find(s => s.tool === "apply_benford_law")?.result;
  const materiality = wf.steps_results.find(s => s.tool === "compute_materiality")?.result;
  const sample = wf.steps_results.find(s => s.tool === "compute_audit_sample")?.result;
  const ic = wf.steps_results.find(s => s.tool === "score_internal_control")?.result;

  // Decision GO/NOGO
  let signaux_negatifs = 0;
  const altman = ratiosResult.altman_z_score?.value as number | undefined;
  if (altman !== undefined && altman < 1.23) signaux_negatifs += 2;
  const autonomie = ratiosResult.autonomie_financiere?.value as number | undefined;
  if (autonomie !== undefined && autonomie < 0.20) signaux_negatifs += 2;
  if ((fraude as any)?.verdict === "fraude_probable") signaux_negatifs += 3;
  if ((ic as any)?.niveau_maturite === "faible") signaux_negatifs += 2;

  const recommendation: "go" | "nogo" | "approfondir" =
    signaux_negatifs === 0 ? "go" : signaux_negatifs <= 2 ? "approfondir" : "nogo";

  const sectionsReport = [
    { heading: "Cible", content: args.raison_sociale },
    { heading: "Ratios financiers", content: Object.entries(ratiosResult).map(([k, v]: [string, any]) => `- ${k}: ${v?.value} ${v?.unit}`).join("\n") },
    { heading: "Test Benford", content: fraude ? JSON.stringify(fraude).slice(0, 300) : "Non execute" },
    { heading: "Recommandation", content: `**${recommendation.toUpperCase()}** (${signaux_negatifs} signaux negatifs)` },
  ];
  const reportRes = await runTool("generate_report", {
    title: `Due diligence — ${args.raison_sociale}`,
    sections: sectionsReport,
    format: "markdown",
  }) as any;

  return {
    ok: true,
    raison_sociale: args.raison_sociale,
    ratios: ratiosResult,
    fraude_check: fraude,
    materiality,
    audit_sample: sample,
    internal_control: ic,
    recommendation,
    report_markdown: reportRes?.report ?? "",
  };
}

// ─── 4. Simulation recrutement ─────────────────────────────────────────────
/**
 * Workflow simulation cout d'embauche :
 *   1. compute_smig (verifier que le brut > SMIG legal)
 *   2. compute_salaire_net
 *   3. compute_cnss_contribution
 *   4. compute_taxes_parafiscales
 *   5. simulate_embauche_cost (synthese)
 *   6. generate_fiche_paie (echantillon)
 */
export async function workflowSimulationRecrutement(
  runTool: RunToolFn,
  args: {
    poste: string;
    salaire_brut_mensuel_centimes: string | bigint;
    pays: string;
    duree_mois?: number;
    primes_centimes?: string;
    annees_anciennete?: number;
  },
): Promise<{
  ok: boolean;
  poste: string;
  pays: string;
  smig_check: { conforme: boolean; smig_fcfa: number; salaire_propose_fcfa: number };
  cout_total_centimes: string;
  details: unknown;
  fiche_paie_exemple?: unknown;
  recommandations: string[];
  report_markdown: string;
}> {
  const duree = args.duree_mois ?? 12;
  const brut = BigInt(args.salaire_brut_mensuel_centimes);

  // 1. SMIG check
  const smigRes = await runTool("compute_smig", { pays: args.pays, type: "mensuel" }) as any;
  const smigFcfa = smigRes?.smig_fcfa ?? 0;
  const salaireFcfa = Number(brut / 100n);
  const smigConforme = salaireFcfa >= smigFcfa;

  // 2-4 sequentiels
  const steps: WorkflowStep[] = [
    { tool: "compute_salaire_net", label: "Salaire net mensuel", args: { salaire_brut_centimes: brut.toString(), pays: args.pays } },
    { tool: "compute_cnss_contribution", label: "Cotisations CNSS", args: { salaire_brut_centimes: brut.toString(), pays: args.pays } },
    { tool: "compute_taxes_parafiscales", label: "Taxes parafiscales", args: { salaire_brut_centimes: brut.toString(), pays: args.pays }, optional: true },
    { tool: "simulate_embauche_cost", label: "Cout total embauche", args: { salaire_brut_mensuel_centimes: brut.toString(), pays: args.pays, duree_mois: duree } },
    { tool: "generate_fiche_paie", label: "Fiche de paie exemple",
      args: { salarie: { nom: "[Candidat]", emploi: args.poste }, periode: "2025-01", pays: args.pays, salaire_base_centimes: brut.toString(), primes_centimes: args.primes_centimes ?? "0", annees_anciennete: args.annees_anciennete ?? 0 },
    },
  ];

  const wf = await runWorkflow(runTool, steps);
  const cost = wf.steps_results.find(s => s.tool === "simulate_embauche_cost")?.result as any;
  const fiche = wf.steps_results.find(s => s.tool === "generate_fiche_paie")?.result as any;

  const recommandations: string[] = [];
  if (!smigConforme) recommandations.push(`SALAIRE INFERIEUR AU SMIG : ${salaireFcfa} < ${smigFcfa} FCFA. Reajuster.`);
  if (cost?.cout_total_centimes) {
    const coutFcfa = Number(BigInt(cost.cout_total_centimes) / 100n);
    if (coutFcfa > salaireFcfa * duree * 1.5) recommandations.push(`Cout employeur ${(coutFcfa / 1_000_000).toFixed(1)}M FCFA > 150% du brut — verifier optimisation`);
  }
  if (recommandations.length === 0) recommandations.push("Conforme. Embauche realisable.");

  const sectionsReport = [
    { heading: "Poste & remuneration", content: `${args.poste} — ${salaireFcfa.toLocaleString()} FCFA/mois (${args.pays})` },
    { heading: "SMIG check", content: `${smigConforme ? "OK" : "NON CONFORME"} (SMIG legal : ${smigFcfa.toLocaleString()} FCFA)` },
    { heading: "Cout total employeur", content: cost?.cout_total_formatted ?? "N/A" },
    { heading: "Recommandations", content: recommandations.map(r => `- ${r}`).join("\n") },
  ];
  const reportRes = await runTool("generate_report", {
    title: `Simulation embauche — ${args.poste}`,
    sections: sectionsReport,
    format: "markdown",
  }) as any;

  return {
    ok: true,
    poste: args.poste,
    pays: args.pays,
    smig_check: { conforme: smigConforme, smig_fcfa: smigFcfa, salaire_propose_fcfa: salaireFcfa },
    cout_total_centimes: cost?.cout_total_centimes ?? "0",
    details: wf.steps_results,
    fiche_paie_exemple: fiche?.fiche,
    recommandations,
    report_markdown: reportRes?.report ?? "",
  };
}

// ─── 5. Analyse client 360 ─────────────────────────────────────────────────
/**
 * Vue 360 d'un client :
 *   1. score_churn_risk
 *   2. analyze_customer_segment (RFM)
 *   3. compute_panier_moyen
 *   4. compute_cac_ltv_ratio (si CAC fourni)
 *   5. recommendations agregees
 */
export async function workflowAnalyseClient360(
  runTool: RunToolFn,
  args: {
    client_id: string;
    nom_client?: string;
    derniere_commande_jours: number;
    frequence_actuelle: number;
    frequence_baseline: number;
    panier_moyen_centimes: string;
    nb_transactions_total: number;
    nb_clients_uniques?: number;
    duree_retention_annees?: number;
    marge_brute_pct?: number;
    cac_centimes?: string;
    tickets_critiques_ouverts?: number;
  },
): Promise<{
  ok: boolean;
  client_id: string;
  churn_risk?: unknown;
  cac_ltv?: unknown;
  recommandations: string[];
  niveau_priorite: "P0_save" | "P1_engage" | "P2_growth" | "P3_steady";
  report_markdown: string;
}> {
  const steps: WorkflowStep[] = [
    {
      tool: "score_churn_risk", label: "Risque churn",
      args: {
        derniere_commande_jours: args.derniere_commande_jours,
        frequence_actuelle: args.frequence_actuelle,
        frequence_baseline: args.frequence_baseline,
        tickets_critiques_ouverts: args.tickets_critiques_ouverts ?? 0,
      },
    },
    {
      tool: "compute_panier_moyen", label: "Panier moyen",
      args: {
        ca_total_centimes: (BigInt(args.panier_moyen_centimes) * BigInt(args.nb_transactions_total)).toString(),
        nb_transactions: args.nb_transactions_total,
        nb_clients_uniques: args.nb_clients_uniques ?? 1,
        duree_retention_annees: args.duree_retention_annees ?? 3,
        marge_brute_pct: args.marge_brute_pct ?? 30,
      },
    },
  ];

  if (args.cac_centimes) {
    steps.push({
      tool: "compute_cac_ltv_ratio", label: "CAC/LTV",
      args: {
        marketing_spend_centimes: args.cac_centimes,
        nb_nouveaux_clients: 1,
        panier_moyen_centimes: args.panier_moyen_centimes,
        frequence_achats_par_an: args.frequence_actuelle * 12,
        duree_retention_annees: args.duree_retention_annees ?? 3,
        marge_brute_pct: args.marge_brute_pct ?? 30,
      },
    });
  }

  const wf = await runWorkflow(runTool, steps);
  const churn = wf.steps_results.find(s => s.tool === "score_churn_risk")?.result as any;
  const cacLtv = wf.steps_results.find(s => s.tool === "compute_cac_ltv_ratio")?.result as any;

  const recommandations: string[] = [];
  let niveau: "P0_save" | "P1_engage" | "P2_growth" | "P3_steady" = "P3_steady";

  if (churn?.niveau === "critique" || churn?.niveau === "eleve") {
    niveau = "P0_save";
    recommandations.push(`CSM doit contacter sous 48h — risque churn ${churn.score_risque}/100`);
    if (churn?.actions_recommandees) recommandations.push(...churn.actions_recommandees);
  } else if (cacLtv?.niveau === "destruction" || cacLtv?.niveau === "limite") {
    niveau = "P1_engage";
    recommandations.push("LTV insuffisante — pousser upsell ou augmenter retention");
  } else if (cacLtv?.niveau === "excellent") {
    niveau = "P2_growth";
    recommandations.push("Client tres rentable — ajouter a programme reference / ambassador");
  } else {
    niveau = "P3_steady";
    recommandations.push("Maintenir relation classique");
  }

  const sectionsReport = [
    { heading: "Client", content: `${args.nom_client ?? args.client_id} (id: ${args.client_id})` },
    { heading: "Risque churn", content: churn ? `${churn.niveau} — score ${churn.score_risque}/100` : "N/A" },
    { heading: "CAC/LTV", content: cacLtv ? `Ratio ${cacLtv.ratio_ltv_cac} — ${cacLtv.niveau}` : "N/A (pas de CAC fourni)" },
    { heading: "Niveau priorite", content: `**${niveau}**` },
    { heading: "Actions recommandees", content: recommandations.map(r => `- ${r}`).join("\n") },
  ];
  const reportRes = await runTool("generate_report", {
    title: `Analyse 360 — ${args.nom_client ?? args.client_id}`,
    sections: sectionsReport,
    format: "markdown",
  }) as any;

  return {
    ok: true,
    client_id: args.client_id,
    churn_risk: churn,
    cac_ltv: cacLtv,
    recommandations,
    niveau_priorite: niveau,
    report_markdown: reportRes?.report ?? "",
  };
}
