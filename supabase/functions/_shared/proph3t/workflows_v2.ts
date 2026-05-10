// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — Workflows v2 : closing_annuel, paie_mensuelle, audit_juridique
// ═══════════════════════════════════════════════════════════════════════════

import type { RunToolFn } from "./workflows.ts";

// ─── 1. Closing annuel ─────────────────────────────────────────────────────
/**
 * Cloture annuelle complete :
 *   1. validate_journal_entry
 *   2. test_balance_general (avec GL)
 *   3. compute_immobilisations_amortissements
 *   4. validate_clos_exercice (checklist)
 *   5. generate_balance_sheet
 *   6. generate_compte_resultat
 *   7. forecast_dsf (projections fiscales)
 *   8. generate_audit_report (si CAC fourni)
 */
export async function workflowClosingAnnuel(
  runTool: RunToolFn,
  args: {
    raison_sociale: string;
    exercice: string;
    pays: string;
    entries: any[];
    immobilisations?: any[];
    benefice_imposable_centimes?: string | bigint;
    ca_total_centimes?: string | bigint;
    cloture_check?: any;
    auditeur_nom?: string;
    opinion?: "sans_reserve" | "avec_reserves" | "defavorable" | "impossibilite_exprimer";
  },
): Promise<{
  ok: boolean;
  exercice: string;
  workflow_steps: unknown;
  bilan?: unknown;
  compte_resultat?: unknown;
  amortissements?: unknown;
  fiscalite?: unknown;
  rapport_audit?: unknown;
  pret_a_cloturer: boolean;
  report_markdown: string;
}> {
  const steps = [];
  const results: any[] = [];

  // 1-2. Validation + balance
  results.push({ label: "Validation ecritures", result: await runTool("validate_journal_entry", { entries: args.entries }).catch(e => ({ error: (e as Error).message })) });
  results.push({ label: "Balance generale", result: await runTool("test_balance_general", { balance: args.entries.map((e: any) => ({ compte: e.compte, solde_debiteur_centimes: e.debit_centimes, solde_crediteur_centimes: e.credit_centimes })) }).catch(e => ({ error: (e as Error).message })) });

  // 3. Amortissements (si immo fournies)
  let amortissements: any;
  if (args.immobilisations && args.immobilisations.length > 0) {
    amortissements = await runTool("compute_immobilisations_amortissements", {
      immobilisations: args.immobilisations,
      date_calcul: `${args.exercice}-12-31`,
    }).catch(e => ({ error: (e as Error).message }));
    results.push({ label: "Amortissements annuels", result: amortissements });
  }

  // 4. Checklist cloture
  let pret = false;
  if (args.cloture_check) {
    const r = await runTool("validate_clos_exercice", args.cloture_check).catch(e => ({ error: (e as Error).message })) as any;
    results.push({ label: "Checklist cloture", result: r });
    pret = r?.pret_a_cloturer ?? false;
  }

  // 5-6. Bilan + Compte de resultat
  const bilan = await runTool("generate_balance_sheet", { entries: args.entries, exercice: args.exercice, raison_sociale: args.raison_sociale }).catch(e => ({ error: (e as Error).message })) as any;
  results.push({ label: "Bilan", result: bilan });
  const cr = await runTool("generate_compte_resultat", { entries: args.entries, exercice: args.exercice, raison_sociale: args.raison_sociale }).catch(e => ({ error: (e as Error).message })) as any;
  results.push({ label: "Compte de resultat", result: cr });

  // 7. Projection fiscale
  let fiscalite: any;
  if (args.benefice_imposable_centimes && args.ca_total_centimes) {
    fiscalite = await runTool("forecast_dsf", {
      pays: args.pays, exercice: args.exercice,
      ca_ht_centimes: args.ca_total_centimes,
      benefice_imposable_centimes: args.benefice_imposable_centimes,
    }).catch(e => ({ error: (e as Error).message }));
    results.push({ label: "Projection DSF", result: fiscalite });
  }

  // 8. Rapport audit (si CAC)
  let rapportAudit: any;
  if (args.auditeur_nom && args.opinion) {
    rapportAudit = await runTool("generate_audit_report", {
      raison_sociale: args.raison_sociale,
      exercice: args.exercice,
      date_rapport: new Date().toISOString().slice(0, 10),
      auditeur_nom: args.auditeur_nom,
      opinion: args.opinion,
      bilan_synthese: bilan?.ok ? {
        total_actif: bilan.actif?.total_centimes,
        total_passif: bilan.passif?.total_centimes,
        resultat_net: cr?.resultat_net_centimes ?? "0",
      } : undefined,
    }).catch(e => ({ error: (e as Error).message }));
    results.push({ label: "Rapport audit", result: rapportAudit });
  }

  // Generate report final
  const sections = [
    { heading: "Cloture annuelle", content: `**${args.raison_sociale}** — Exercice **${args.exercice}** (${args.pays})` },
    { heading: "Statut cloture", content: pret ? "PRET A CLOTURER" : "BLOQUAGES — voir checklist" },
    ...results.map(r => ({ heading: r.label, content: typeof r.result === "object" ? JSON.stringify(r.result).slice(0, 400) : String(r.result) })),
  ];
  const reportRes = await runTool("generate_report", {
    title: `Closing annuel — ${args.raison_sociale} ${args.exercice}`,
    sections,
    format: "markdown",
  }) as any;

  return {
    ok: true,
    exercice: args.exercice,
    workflow_steps: results,
    bilan,
    compte_resultat: cr,
    amortissements,
    fiscalite,
    rapport_audit: rapportAudit,
    pret_a_cloturer: pret,
    report_markdown: reportRes?.report ?? "",
  };
}

// ─── 2. Paie mensuelle complete ─────────────────────────────────────────────
/**
 * Workflow paie mensuelle :
 *   1. compute_paie_batch (toutes fiches)
 *   2. compute_taxes_parafiscales (totalise sur la masse)
 *   3. forecast_masse_salariale (projection fin annee)
 *   4. generate_report
 */
export async function workflowPaieMensuelle(
  runTool: RunToolFn,
  args: {
    raison_sociale: string;
    pays: string;
    periode: string;
    salaries: any[];
    horizon_mois_projection?: number;
    recrutements_prevus?: any[];
    departs_prevus?: any[];
  },
): Promise<{
  ok: boolean;
  workflow_steps: unknown;
  total_brut_centimes: string;
  total_net_centimes: string;
  total_cout_employeur_centimes: string;
  parafiscales_centimes?: string;
  projection_annuelle?: unknown;
  report_markdown: string;
}> {
  const results: any[] = [];

  // 1. Paie batch
  const batch = await runTool("compute_paie_batch", {
    pays: args.pays, periode: args.periode, salaries: args.salaries,
  }).catch(e => ({ error: (e as Error).message })) as any;
  results.push({ label: "Paie batch", result: batch });

  // 2. Parafiscales sur masse totale
  let parafiscales: any;
  if (batch?.ok) {
    parafiscales = await runTool("compute_taxes_parafiscales", {
      salaire_brut_centimes: batch.total_brut_centimes,
      pays: args.pays,
    }).catch(e => ({ error: (e as Error).message }));
    results.push({ label: "Taxes parafiscales", result: parafiscales });
  }

  // 3. Projection annuelle
  let projection: any;
  if (batch?.ok && args.horizon_mois_projection) {
    const coutMoyen = BigInt(batch.total_cout_employeur_centimes) / BigInt(args.salaries.length);
    projection = await runTool("forecast_masse_salariale", {
      effectif_actuel: args.salaries.length,
      cout_moyen_mensuel_centimes: coutMoyen.toString(),
      taux_augmentation_annuelle_pct: 3,
      recrutements_prevus: args.recrutements_prevus ?? [],
      departs_prevus: args.departs_prevus ?? [],
      horizon_mois: args.horizon_mois_projection,
    }).catch(e => ({ error: (e as Error).message }));
    results.push({ label: "Projection annuelle", result: projection });
  }

  // Report
  const sections = [
    { heading: "Paie mensuelle", content: `**${args.raison_sociale}** — ${args.periode} (${args.pays}) — ${args.salaries.length} salaries` },
    { heading: "Totaux", content: batch?.ok ? `Brut : ${batch.total_formatted?.brut}\nNet : ${batch.total_formatted?.net}\nCout employeur : ${batch.total_formatted?.cout_total}` : "Erreur" },
    { heading: "Parafiscales", content: parafiscales?.ok ? `Total : ${parafiscales.total_formatted}` : "Non calcule" },
    { heading: "Projection annuelle", content: projection?.ok ? `Total ${projection.total_formatted}` : "Non calcule" },
  ];
  const reportRes = await runTool("generate_report", {
    title: `Paie ${args.raison_sociale} — ${args.periode}`,
    sections,
    format: "markdown",
  }) as any;

  return {
    ok: true,
    workflow_steps: results,
    total_brut_centimes: batch?.total_brut_centimes ?? "0",
    total_net_centimes: batch?.total_net_centimes ?? "0",
    total_cout_employeur_centimes: batch?.total_cout_employeur_centimes ?? "0",
    parafiscales_centimes: parafiscales?.total_centimes,
    projection_annuelle: projection,
    report_markdown: reportRes?.report ?? "",
  };
}

// ─── 3. Audit juridique ─────────────────────────────────────────────────────
/**
 * Workflow audit juridique :
 *   1. validate_societe_creation
 *   2. compute_capital_minimum
 *   3. analyze_contract_clauses (sur N contrats fournis)
 *   4. compute_risk_assessment_matrix
 *   5. score_internal_control
 */
export async function workflowAuditJuridique(
  runTool: RunToolFn,
  args: {
    raison_sociale: string;
    forme_juridique: string;
    pays: string;
    capital_propose_centimes: string | bigint;
    nb_associes: number;
    societe_creation_check: any;
    contrats?: { id: string; titre: string; texte: string }[];
    risques?: any[];
    internal_control_responses?: any[];
  },
): Promise<{
  ok: boolean;
  raison_sociale: string;
  workflow_steps: unknown;
  conformite_creation?: unknown;
  capital_check?: unknown;
  contrats_analyses?: unknown[];
  matrice_risques?: unknown;
  controle_interne?: unknown;
  score_juridique: number;
  niveau_conformite: "conforme" | "ecarts_mineurs" | "non_conforme";
  report_markdown: string;
}> {
  const results: any[] = [];

  // 1. Conformite creation
  const conformite = await runTool("validate_societe_creation", { ...args.societe_creation_check, forme_juridique: args.forme_juridique, pays: args.pays, nb_associes: args.nb_associes, capital_propose_centimes: args.capital_propose_centimes }).catch(e => ({ error: (e as Error).message })) as any;
  results.push({ label: "Conformite creation", result: conformite });

  // 2. Capital
  const capital = await runTool("compute_capital_minimum", { forme_juridique: args.forme_juridique, capital_propose_centimes: args.capital_propose_centimes, pays: args.pays }).catch(e => ({ error: (e as Error).message })) as any;
  results.push({ label: "Capital minimum", result: capital });

  // 3. Contrats
  const contratsAnalyses: any[] = [];
  if (args.contrats) {
    for (const c of args.contrats) {
      const r = await runTool("analyze_contract_clauses", { contract_text: c.texte }).catch(e => ({ error: (e as Error).message })) as any;
      contratsAnalyses.push({ id: c.id, titre: c.titre, analyse: r });
    }
    results.push({ label: `Contrats analyses (${args.contrats.length})`, result: contratsAnalyses });
  }

  // 4. Matrice risques
  let risques: any;
  if (args.risques && args.risques.length > 0) {
    risques = await runTool("compute_risk_assessment_matrix", { risks: args.risques }).catch(e => ({ error: (e as Error).message }));
    results.push({ label: "Matrice risques", result: risques });
  }

  // 5. Controle interne
  let ic: any;
  if (args.internal_control_responses && args.internal_control_responses.length > 0) {
    ic = await runTool("score_internal_control", { responses: args.internal_control_responses }).catch(e => ({ error: (e as Error).message }));
    results.push({ label: "Controle interne", result: ic });
  }

  // Calcul score juridique
  let score = 100;
  if (conformite?.taux_conformite_pct < 100) score -= (100 - conformite.taux_conformite_pct) * 0.5;
  if (capital?.conformite && !capital.conformite.conforme) score -= 20;
  for (const c of contratsAnalyses) {
    if ((c.analyse as any)?.score_completude < 80) score -= 5;
    if ((c.analyse as any)?.clauses_suspectes?.some((s: any) => s.severity === "critical")) score -= 10;
  }
  if (risques?.score_global_risque > 5) score -= 15;
  if (ic?.niveau_maturite === "faible") score -= 20;
  score = Math.max(0, Math.round(score));

  const niveau: "conforme" | "ecarts_mineurs" | "non_conforme" =
    score >= 85 ? "conforme" : score >= 60 ? "ecarts_mineurs" : "non_conforme";

  const sections = [
    { heading: "Audit juridique", content: `**${args.raison_sociale}** (${args.forme_juridique}, ${args.pays})` },
    { heading: "Score juridique global", content: `**${score}/100** — ${niveau}` },
    { heading: "Conformite creation", content: conformite?.ok ? `${conformite.taux_conformite_pct}% conforme — ${conformite.next_actions?.length ?? 0} actions a faire` : "Erreur" },
    { heading: "Capital", content: capital?.ok ? `Conforme : ${capital.conformite?.conforme}, min legal ${capital.capital_min_fcfa.toLocaleString()} FCFA` : "Erreur" },
    { heading: "Contrats audites", content: contratsAnalyses.length > 0 ? `${contratsAnalyses.length} contrats — ${contratsAnalyses.map(c => `${c.titre}: ${(c.analyse as any)?.score_completude}/100`).join(", ")}` : "Aucun" },
    { heading: "Risques majeurs", content: risques?.ok ? `${risques.risques_critiques?.length ?? 0} critiques, score global ${risques.score_global_risque}` : "Non evalue" },
    { heading: "Controle interne", content: ic?.ok ? `${ic.niveau_maturite} (${ic.score_global}/100)` : "Non evalue" },
  ];
  const reportRes = await runTool("generate_report", {
    title: `Audit juridique — ${args.raison_sociale}`,
    sections,
    format: "markdown",
  }) as any;

  return {
    ok: true,
    raison_sociale: args.raison_sociale,
    workflow_steps: results,
    conformite_creation: conformite,
    capital_check: capital,
    contrats_analyses: contratsAnalyses,
    matrice_risques: risques,
    controle_interne: ic,
    score_juridique: score,
    niveau_conformite: niveau,
    report_markdown: reportRes?.report ?? "",
  };
}
