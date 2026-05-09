// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — Domain L2 : MARKETING / Growth
// ═══════════════════════════════════════════════════════════════════════════
// 5 tools metier marketing/growth :
//   1. compute_cac_ltv_ratio    : ratio Customer Acquisition Cost / LTV
//   2. compute_campaign_roi     : ROI / ROAS d'une campagne marketing
//   3. ab_test_significance     : significativite statistique A/B test
//   4. compute_conversion_funnel : analyse entonnoir + drop-off rates
//   5. forecast_growth_compound : projection croissance composee mensuelle
// ═══════════════════════════════════════════════════════════════════════════

import { formatMoneyFcfa } from "./calculators.ts";

// ─── 1. CAC / LTV ratio ─────────────────────────────────────────────────────
/**
 * CAC (Customer Acquisition Cost) = Total marketing spend / Nb nouveaux clients
 * LTV (Lifetime Value) = Panier moyen × Frequence × Duree retention × Marge
 *
 * Ratio LTV/CAC (regle SaaS) :
 *   < 1   : DESTRUCTION de valeur (chaque client perd de l'argent)
 *   1-3   : Limite — repenser le modele
 *   3-5   : Sain — equilibre
 *   > 5   : Excellent — possibilite d'accelerer l'investissement
 *
 * Payback period = CAC / (LTV / annees retention)
 */
export function computeCacLtvRatio(args: {
  marketing_spend_centimes: string | bigint;
  nb_nouveaux_clients: number;
  panier_moyen_centimes: string | bigint;
  frequence_achats_par_an: number;
  duree_retention_annees: number;
  marge_brute_pct: number;          // ex 30 pour 30%
}): {
  ok: boolean;
  cac_centimes: string;
  cac_formatted: string;
  ltv_centimes: string;
  ltv_formatted: string;
  ratio_ltv_cac: number;
  payback_period_mois: number;
  niveau: "destruction" | "limite" | "sain" | "excellent";
  interpretation: string;
} {
  if (args.nb_nouveaux_clients <= 0) {
    return { ok: false, cac_centimes: "0", cac_formatted: "", ltv_centimes: "0", ltv_formatted: "", ratio_ltv_cac: 0, payback_period_mois: 0, niveau: "destruction", interpretation: "Aucun nouveau client" };
  }
  const spend = BigInt(args.marketing_spend_centimes);
  const cac = spend / BigInt(args.nb_nouveaux_clients);

  const panier = BigInt(args.panier_moyen_centimes);
  const ltvBrut = panier * BigInt(Math.round(args.frequence_achats_par_an * 100)) / 100n
    * BigInt(Math.round(args.duree_retention_annees * 100)) / 100n;
  const margeBp = BigInt(Math.round(args.marge_brute_pct * 100));
  const ltv = (ltvBrut * margeBp) / 10000n;

  const ratio = cac > 0n ? Number(ltv) / Number(cac) : 0;
  const payback = ltv > 0n ? Number(cac) / (Number(ltv) / (args.duree_retention_annees * 12)) : 0;

  const niveau: "destruction" | "limite" | "sain" | "excellent" =
    ratio < 1 ? "destruction" : ratio < 3 ? "limite" : ratio < 5 ? "sain" : "excellent";

  const interp =
    niveau === "destruction" ? "Chaque client coute plus cher que ce qu'il rapporte. Revoir produit, prix, canaux."
    : niveau === "limite" ? "Equilibre fragile. Augmenter LTV (upsell, retention) ou reduire CAC."
    : niveau === "sain" ? `Modele economique sain. Payback period ${payback.toFixed(0)} mois.`
    : `Excellent ratio. Investir massivement dans l'acquisition (payback ${payback.toFixed(0)} mois).`;

  return {
    ok: true,
    cac_centimes: cac.toString(),
    cac_formatted: formatMoneyFcfa(cac),
    ltv_centimes: ltv.toString(),
    ltv_formatted: formatMoneyFcfa(ltv),
    ratio_ltv_cac: Math.round(ratio * 100) / 100,
    payback_period_mois: Math.round(payback * 10) / 10,
    niveau,
    interpretation: interp,
  };
}

// ─── 2. Campaign ROI ───────────────────────────────────────────────────────
/**
 * ROI = (Revenu attribue - Cout campagne) / Cout campagne × 100
 * ROAS = Revenu attribue / Cout campagne (multiplicateur)
 *
 * Norme :
 *   ROAS < 2  : campagne deficitaire (apres CAC)
 *   ROAS 2-3  : limite
 *   ROAS 3-5  : bonne campagne
 *   ROAS > 5  : tres bonne campagne — augmenter le budget
 */
export function computeCampaignRoi(args: {
  campagne_nom: string;
  cout_campagne_centimes: string | bigint;
  revenu_attribue_centimes: string | bigint;
  nb_conversions: number;
  marge_brute_pct?: number;          // pour ROI marge
}): {
  ok: boolean;
  campagne_nom: string;
  cout_centimes: string;
  revenu_centimes: string;
  profit_brut_centimes: string;
  roas: number;
  roi_pct: number;
  roi_marge_pct?: number;
  cout_par_conversion_centimes: string;
  niveau: "deficit" | "limite" | "bon" | "tres_bon";
  recommendation: string;
} {
  const cout = BigInt(args.cout_campagne_centimes);
  const revenu = BigInt(args.revenu_attribue_centimes);
  const profit = revenu - cout;

  const roas = cout > 0n ? Number(revenu) / Number(cout) : 0;
  const roi = cout > 0n ? (Number(profit) / Number(cout)) * 100 : 0;
  let roiMarge: number | undefined;
  if (args.marge_brute_pct !== undefined) {
    const profitMarge = (Number(revenu) * args.marge_brute_pct / 100) - Number(cout);
    roiMarge = cout > 0n ? (profitMarge / Number(cout)) * 100 : 0;
  }

  const coutParConv = args.nb_conversions > 0 ? cout / BigInt(args.nb_conversions) : 0n;

  const niveau: "deficit" | "limite" | "bon" | "tres_bon" =
    roas < 2 ? "deficit" : roas < 3 ? "limite" : roas < 5 ? "bon" : "tres_bon";

  const reco =
    niveau === "deficit" ? "Stopper ou re-cibler la campagne — perte d'argent"
    : niveau === "limite" ? "Optimiser le ciblage et les creas avant d'augmenter le budget"
    : niveau === "bon" ? "Continuer en l'etat. Tester augmentation progressive du budget."
    : "Augmenter rapidement le budget — opportunite de scaling";

  return {
    ok: true,
    campagne_nom: args.campagne_nom,
    cout_centimes: cout.toString(),
    revenu_centimes: revenu.toString(),
    profit_brut_centimes: profit.toString(),
    roas: Math.round(roas * 100) / 100,
    roi_pct: Math.round(roi * 100) / 100,
    roi_marge_pct: roiMarge !== undefined ? Math.round(roiMarge * 100) / 100 : undefined,
    cout_par_conversion_centimes: coutParConv.toString(),
    niveau,
    recommendation: reco,
  };
}

// ─── 3. A/B test significance ──────────────────────────────────────────────
/**
 * Test de significativite pour un A/B test (Z-test sur 2 proportions).
 *   Z = (p1 - p2) / sqrt((p × (1-p)) × (1/n1 + 1/n2))
 *   p = (c1 + c2) / (n1 + n2)
 *
 * Significatif a 95% si |Z| > 1.96
 * Significatif a 99% si |Z| > 2.576
 */
export function abTestSignificance(args: {
  variant_a: { nom?: string; impressions: number; conversions: number };
  variant_b: { nom?: string; impressions: number; conversions: number };
  niveau_confiance?: 0.90 | 0.95 | 0.99;
}): {
  ok: boolean;
  variant_a: { nom: string; impressions: number; conversions: number; taux_conversion_pct: number };
  variant_b: { nom: string; impressions: number; conversions: number; taux_conversion_pct: number };
  difference_absolute_pct: number;
  difference_relative_pct: number;
  z_score: number;
  p_value_estimee: number;
  significatif: boolean;
  niveau_confiance_atteint: number;
  gagnant?: "A" | "B" | "egalite";
  recommendation: string;
} {
  const a = args.variant_a;
  const b = args.variant_b;
  const conf = args.niveau_confiance ?? 0.95;
  const z_threshold = conf === 0.99 ? 2.576 : conf === 0.95 ? 1.96 : 1.645;

  const p1 = a.impressions > 0 ? a.conversions / a.impressions : 0;
  const p2 = b.impressions > 0 ? b.conversions / b.impressions : 0;
  const totalN = a.impressions + b.impressions;
  const totalC = a.conversions + b.conversions;
  const p = totalN > 0 ? totalC / totalN : 0;

  let z = 0;
  if (totalN > 0 && p > 0 && p < 1) {
    const se = Math.sqrt(p * (1 - p) * (1 / a.impressions + 1 / b.impressions));
    if (se > 0) z = (p2 - p1) / se;
  }
  const zAbs = Math.abs(z);

  // p-value approximation tail
  const pValue = zAbs > 3 ? 0.001 : zAbs > 2.576 ? 0.01 : zAbs > 1.96 ? 0.05 : zAbs > 1.645 ? 0.10 : 0.20;

  const significatif = zAbs > z_threshold;
  const diffAbs = (p2 - p1) * 100;
  const diffRel = p1 > 0 ? ((p2 - p1) / p1) * 100 : 0;

  let gagnant: "A" | "B" | "egalite" | undefined;
  if (significatif) gagnant = p2 > p1 ? "B" : "A";
  else gagnant = "egalite";

  let reco: string;
  if (!significatif) {
    reco = `Resultat non significatif. Continuer le test : echantillon trop petit ou difference trop faible (Z=${z.toFixed(2)}, seuil ${z_threshold}).`;
  } else if (gagnant === "A") {
    reco = `Variant A gagne. Difference relative ${Math.abs(diffRel).toFixed(1)}%. Deployer A.`;
  } else {
    reco = `Variant B gagne. Difference relative ${Math.abs(diffRel).toFixed(1)}%. Deployer B.`;
  }

  return {
    ok: true,
    variant_a: { nom: a.nom ?? "A", impressions: a.impressions, conversions: a.conversions, taux_conversion_pct: Math.round(p1 * 10000) / 100 },
    variant_b: { nom: b.nom ?? "B", impressions: b.impressions, conversions: b.conversions, taux_conversion_pct: Math.round(p2 * 10000) / 100 },
    difference_absolute_pct: Math.round(diffAbs * 100) / 100,
    difference_relative_pct: Math.round(diffRel * 100) / 100,
    z_score: Math.round(z * 100) / 100,
    p_value_estimee: pValue,
    significatif,
    niveau_confiance_atteint: significatif ? conf : 0,
    gagnant,
    recommendation: reco,
  };
}

// ─── 4. Conversion funnel ──────────────────────────────────────────────────
/**
 * Analyse un entonnoir de conversion etape par etape :
 *   - Taux de passage entre chaque etape
 *   - Drop-off (perte) par etape
 *   - Identification de l'etape qui perd le plus de prospects
 */
export function computeConversionFunnel(args: {
  steps: { nom: string; visiteurs: number }[];
  benchmarks?: { nom: string; conversion_min_pct: number }[];
}): {
  ok: boolean;
  total_top_funnel: number;
  total_bottom_funnel: number;
  taux_global_pct: number;
  steps_analyzed: { nom: string; visiteurs: number; taux_passage_pct: number; drop_off_count: number; drop_off_pct: number; sous_benchmark?: boolean }[];
  bottleneck: { nom: string; drop_off_pct: number };
  recommendations: string[];
} {
  if (args.steps.length < 2) {
    return { ok: false, total_top_funnel: 0, total_bottom_funnel: 0, taux_global_pct: 0, steps_analyzed: [], bottleneck: { nom: "", drop_off_pct: 0 }, recommendations: ["Minimum 2 etapes requises"] };
  }

  const top = args.steps[0].visiteurs;
  const bottom = args.steps[args.steps.length - 1].visiteurs;
  const tauxGlobal = top > 0 ? (bottom / top) * 100 : 0;

  const analyzed: any[] = [{ nom: args.steps[0].nom, visiteurs: top, taux_passage_pct: 100, drop_off_count: 0, drop_off_pct: 0 }];
  let bottleneckIdx = 0;
  let maxDrop = 0;
  for (let i = 1; i < args.steps.length; i++) {
    const prev = args.steps[i - 1].visiteurs;
    const curr = args.steps[i].visiteurs;
    const taux = prev > 0 ? (curr / prev) * 100 : 0;
    const dropCount = prev - curr;
    const dropPct = prev > 0 ? (dropCount / prev) * 100 : 0;
    const benchmark = args.benchmarks?.find(b => b.nom === args.steps[i].nom);
    const sousBench = benchmark ? taux < benchmark.conversion_min_pct : undefined;

    analyzed.push({
      nom: args.steps[i].nom, visiteurs: curr,
      taux_passage_pct: Math.round(taux * 100) / 100,
      drop_off_count: dropCount,
      drop_off_pct: Math.round(dropPct * 100) / 100,
      sous_benchmark: sousBench,
    });
    if (dropPct > maxDrop) {
      maxDrop = dropPct;
      bottleneckIdx = i;
    }
  }

  const recs: string[] = [];
  if (maxDrop > 50) recs.push(`Goulot d'etranglement majeur a l'etape '${args.steps[bottleneckIdx].nom}' (${maxDrop.toFixed(0)}% drop). Audit UX urgent.`);
  for (const a of analyzed) {
    if (a.sous_benchmark) recs.push(`Etape '${a.nom}' sous benchmark : ${a.taux_passage_pct}%. Optimiser.`);
  }
  if (recs.length === 0) recs.push("Funnel sain. Continuer A/B testing pour optimisations marginales.");

  return {
    ok: true,
    total_top_funnel: top,
    total_bottom_funnel: bottom,
    taux_global_pct: Math.round(tauxGlobal * 100) / 100,
    steps_analyzed: analyzed,
    bottleneck: { nom: args.steps[bottleneckIdx].nom, drop_off_pct: Math.round(maxDrop * 100) / 100 },
    recommendations: recs,
  };
}

// ─── 5. Forecast growth compound ───────────────────────────────────────────
/**
 * Projection croissance composee :
 *   valeur_n = valeur_initiale × (1 + taux_mensuel)^n
 *
 * Utile pour : MRR, base utilisateurs, leads, etc.
 */
export function forecastGrowthCompound(args: {
  valeur_initiale: number;
  taux_croissance_mensuel_pct: number;
  horizon_mois: number;
  cout_unitaire_centimes?: string | bigint;       // pour estimer cout cumule
  metric_name?: string;
}): {
  ok: boolean;
  projection_mensuelle: { mois: number; valeur: number; croissance_cumulee_pct: number; cout_cumule_centimes?: string }[];
  valeur_finale: number;
  croissance_x: number;
  cout_total_centimes?: string;
  metric: string;
} {
  const taux = args.taux_croissance_mensuel_pct / 100;
  const projection: { mois: number; valeur: number; croissance_cumulee_pct: number; cout_cumule_centimes?: string }[] = [];
  let valeur = args.valeur_initiale;
  let coutCumule = 0n;
  const coutUnitaire = args.cout_unitaire_centimes ? BigInt(args.cout_unitaire_centimes) : 0n;

  for (let m = 0; m <= args.horizon_mois; m++) {
    const croissance = args.valeur_initiale > 0 ? ((valeur - args.valeur_initiale) / args.valeur_initiale) * 100 : 0;
    const coutMois = coutUnitaire * BigInt(Math.round(valeur));
    coutCumule += coutMois;
    projection.push({
      mois: m, valeur: Math.round(valeur),
      croissance_cumulee_pct: Math.round(croissance * 100) / 100,
      cout_cumule_centimes: args.cout_unitaire_centimes ? coutCumule.toString() : undefined,
    });
    valeur = valeur * (1 + taux);
  }

  const finale = projection[projection.length - 1].valeur;
  const x = args.valeur_initiale > 0 ? finale / args.valeur_initiale : 0;

  return {
    ok: true,
    projection_mensuelle: projection,
    valeur_finale: finale,
    croissance_x: Math.round(x * 100) / 100,
    cout_total_centimes: args.cout_unitaire_centimes ? coutCumule.toString() : undefined,
    metric: args.metric_name ?? "valeur",
  };
}
