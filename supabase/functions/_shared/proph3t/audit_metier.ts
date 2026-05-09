// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — Domain L2 : AUDIT COMPTABLE / Commissariat aux comptes
// ═══════════════════════════════════════════════════════════════════════════
// 5 tools metier (NB : audit.ts est l'audit trail SHA-256 — ce fichier
// concerne l'audit comptable / CAC).
//
//   1. compute_audit_sample        : echantillonnage audit (taille + selection)
//   2. compute_materiality         : seuil de signification (norme ISA 320)
//   3. test_balance_general        : controle coherence balance / grand livre
//   4. analyze_variance_intercompany : analyse ecarts entre exercices
//   5. score_internal_control      : score controle interne (SCI)
// ═══════════════════════════════════════════════════════════════════════════

// ─── 1. Echantillonnage audit ──────────────────────────────────────────────
/**
 * Calcule la taille d'echantillon recommandee selon ISA 530 :
 *   n = (Z² × σ × N) / E²
 * Approche simplifiee :
 *   - Population < 50 : examiner toutes
 *   - Population 50-1000 : echantillon ~10-15%
 *   - Population > 1000 : formule statistique
 *
 * Selection :
 *   - "systematique" : prend 1 sur N/n (intervalles fixes)
 *   - "aleatoire" : selection aleatoire
 *   - "ciblee" : montants > seuil + aleatoire sur le reste
 */
export function computeAuditSample(args: {
  population_size: number;
  confidence_level?: 0.90 | 0.95 | 0.99;
  expected_error_rate?: number;        // ex 0.05
  tolerable_error_rate?: number;       // ex 0.10
  selection_method?: "systematique" | "aleatoire" | "ciblee_montants";
  amounts_centimes?: string[];         // pour ciblee
}): {
  ok: boolean;
  population: number;
  sample_size_recommandee: number;
  intervalle_systematique?: number;
  selection_method: string;
  selected_indices?: number[];
  notes: string[];
} {
  const N = args.population_size;
  const conf = args.confidence_level ?? 0.95;
  const expectedErr = args.expected_error_rate ?? 0.05;
  const tolerable = args.tolerable_error_rate ?? 0.10;
  const notes: string[] = [];

  let sampleSize: number;
  if (N <= 50) {
    sampleSize = N;
    notes.push("Population <= 50 : examen exhaustif recommande (ISA 530)");
  } else {
    // Z value
    const Z = conf === 0.99 ? 2.576 : conf === 0.95 ? 1.96 : 1.645;
    const sigma = Math.sqrt(expectedErr * (1 - expectedErr));
    const E = tolerable - expectedErr;
    if (E <= 0) {
      sampleSize = N;
      notes.push("Tolerance <= erreur attendue : examen exhaustif obligatoire");
    } else {
      sampleSize = Math.ceil((Math.pow(Z, 2) * Math.pow(sigma, 2)) / Math.pow(E, 2));
      // Correction population finie
      sampleSize = Math.ceil(sampleSize / (1 + (sampleSize - 1) / N));
      sampleSize = Math.min(sampleSize, N);
    }
    notes.push(`Z=${Z}, expected_error=${expectedErr}, tolerable=${tolerable}`);
  }

  const method = args.selection_method ?? "systematique";
  const selected_indices: number[] = [];
  let intervalle: number | undefined;

  if (method === "systematique") {
    intervalle = Math.max(1, Math.floor(N / sampleSize));
    for (let i = 0; i < N; i += intervalle) {
      if (selected_indices.length < sampleSize) selected_indices.push(i);
    }
    notes.push(`Selection systematique : 1 element tous les ${intervalle}`);
  } else if (method === "aleatoire") {
    const all = Array.from({ length: N }, (_, i) => i);
    for (let i = 0; i < sampleSize; i++) {
      const idx = Math.floor(Math.random() * all.length);
      selected_indices.push(all.splice(idx, 1)[0]);
    }
  } else if (method === "ciblee_montants" && args.amounts_centimes) {
    const indexed = args.amounts_centimes.map((a, i) => ({ idx: i, amt: BigInt(a) }));
    indexed.sort((a, b) => (a.amt > b.amt ? -1 : a.amt < b.amt ? 1 : 0));
    // Top 30% du sample par montants, reste en aleatoire
    const topCount = Math.ceil(sampleSize * 0.3);
    for (let i = 0; i < topCount; i++) selected_indices.push(indexed[i].idx);
    const remaining = indexed.slice(topCount).map(x => x.idx);
    for (let i = 0; i < sampleSize - topCount; i++) {
      const r = Math.floor(Math.random() * remaining.length);
      selected_indices.push(remaining.splice(r, 1)[0]);
    }
    notes.push("30% top montants + 70% aleatoire");
  }

  return {
    ok: true,
    population: N,
    sample_size_recommandee: sampleSize,
    intervalle_systematique: intervalle,
    selection_method: method,
    selected_indices,
    notes,
  };
}

// ─── 2. Seuil de signification (materiality) ───────────────────────────────
/**
 * Calcul du seuil de signification (ISA 320) :
 *   - Norme courante : 5% du resultat avant impot, ou 1% du CA, ou 1% des capitaux propres.
 *   - Performance materiality : 50-75% du seuil global.
 *   - Trivial threshold : 5% du seuil global.
 */
export function computeMateriality(args: {
  resultat_avant_impot_centimes?: string | bigint;
  ca_total_centimes?: string | bigint;
  capitaux_propres_centimes?: string | bigint;
  approche?: "resultat" | "ca" | "capitaux";
}): {
  ok: boolean;
  approche: string;
  base_calcul_centimes: string;
  taux_applique: number;
  seuil_signification_centimes: string;
  performance_materiality_centimes: string;
  trivial_threshold_centimes: string;
  recommendation: string;
} {
  const approche = args.approche ?? "resultat";
  let base = 0n;
  let taux = 0.05;

  if (approche === "resultat" && args.resultat_avant_impot_centimes) {
    base = BigInt(args.resultat_avant_impot_centimes);
    taux = 0.05;
  } else if (approche === "ca" && args.ca_total_centimes) {
    base = BigInt(args.ca_total_centimes);
    taux = 0.01;
  } else if (approche === "capitaux" && args.capitaux_propres_centimes) {
    base = BigInt(args.capitaux_propres_centimes);
    taux = 0.01;
  }
  if (base < 0n) base = -base;  // valeur absolue

  const tauxBp = BigInt(Math.round(taux * 10000));
  const seuil = (base * tauxBp) / 10000n;
  const perfMateriality = (seuil * 7500n) / 10000n;  // 75% du seuil
  const trivial = (seuil * 500n) / 10000n;            // 5% du seuil

  return {
    ok: true,
    approche,
    base_calcul_centimes: base.toString(),
    taux_applique: taux,
    seuil_signification_centimes: seuil.toString(),
    performance_materiality_centimes: perfMateriality.toString(),
    trivial_threshold_centimes: trivial.toString(),
    recommendation: `Seuil ${approche} = ${(taux * 100).toFixed(1)}% × base. Performance = 75% × seuil. Trivial = 5% × seuil.`,
  };
}

// ─── 3. Controle balance generale ──────────────────────────────────────────
/**
 * Controles fondamentaux d'une balance generale :
 *   - Equilibre debit total = credit total
 *   - Coherence entre balance et grand livre (par compte)
 *   - Pas de compte avec solde anormal (ex : 411 crediteur)
 *   - Soldes a zero pour comptes mouvementes a 0
 */
export function testBalanceGeneral(args: {
  balance: { compte: string; solde_debiteur_centimes: string; solde_crediteur_centimes: string }[];
  grand_livre?: { compte: string; debit_total_centimes: string; credit_total_centimes: string }[];
}): {
  ok: boolean;
  total_debit_centimes: string;
  total_credit_centimes: string;
  equilibre: boolean;
  ecart_centimes: string;
  anomalies: { code: string; compte: string; detail: string }[];
  coherence_grand_livre?: { compte: string; ecart_centimes: string }[];
} {
  const tDeb = args.balance.reduce((s, r) => s + BigInt(r.solde_debiteur_centimes), 0n);
  const tCred = args.balance.reduce((s, r) => s + BigInt(r.solde_crediteur_centimes), 0n);
  const ecart = tDeb - tCred;

  const anomalies: { code: string; compte: string; detail: string }[] = [];

  // Comptes avec solde anormal
  for (const r of args.balance) {
    const sd = BigInt(r.solde_debiteur_centimes);
    const sc = BigInt(r.solde_crediteur_centimes);
    if (sd > 0n && sc > 0n) {
      anomalies.push({ code: "SOLDE_BIDIRECTIONNEL", compte: r.compte, detail: "Solde debiteur ET crediteur > 0 sur le meme compte" });
    }
    // 411 ne doit pas etre crediteur (sauf si avoirs en attente : 4119)
    if (r.compte.startsWith("411") && !r.compte.startsWith("4119") && sc > sd) {
      anomalies.push({ code: "CLIENT_CREDITEUR", compte: r.compte, detail: "Compte client crediteur — verifier avoirs ou erreur d'imputation" });
    }
    // 401 ne doit pas etre debiteur (sauf si avoirs : 4019)
    if (r.compte.startsWith("401") && !r.compte.startsWith("4019") && sd > sc) {
      anomalies.push({ code: "FOURNISSEUR_DEBITEUR", compte: r.compte, detail: "Compte fournisseur debiteur — verifier" });
    }
  }

  // Coherence GL
  let coherence: { compte: string; ecart_centimes: string }[] | undefined;
  if (args.grand_livre) {
    coherence = [];
    const balByCompte = new Map(args.balance.map(b => [b.compte, b]));
    for (const gl of args.grand_livre) {
      const bal = balByCompte.get(gl.compte);
      if (!bal) {
        anomalies.push({ code: "COMPTE_GL_HORS_BALANCE", compte: gl.compte, detail: "Compte present au GL mais absent de la balance" });
        continue;
      }
      const soldeBalance = BigInt(bal.solde_debiteur_centimes) - BigInt(bal.solde_crediteur_centimes);
      const soldeGL = BigInt(gl.debit_total_centimes) - BigInt(gl.credit_total_centimes);
      const e = soldeBalance - soldeGL;
      if (e !== 0n) {
        coherence.push({ compte: gl.compte, ecart_centimes: e.toString() });
        anomalies.push({ code: "INCOHERENCE_BALANCE_GL", compte: gl.compte, detail: `Ecart balance vs GL : ${e.toString()} centimes` });
      }
    }
  }

  return {
    ok: true,
    total_debit_centimes: tDeb.toString(),
    total_credit_centimes: tCred.toString(),
    equilibre: ecart === 0n,
    ecart_centimes: ecart.toString(),
    anomalies,
    coherence_grand_livre: coherence,
  };
}

// ─── 4. Analyse variance intercompany / inter-exercice ─────────────────────
/**
 * Compare les soldes N et N-1 par compte, signale les variations significatives
 * (en valeur absolue + en %) qui meritent une attention auditeur.
 */
export function analyzeVarianceInterperiode(args: {
  exercice_n: { compte: string; solde_centimes: string }[];
  exercice_n_minus_1: { compte: string; solde_centimes: string }[];
  seuil_variation_pct?: number;       // defaut 25%
  seuil_variation_centimes?: string;   // defaut 1M FCFA = 100M centimes
}): {
  ok: boolean;
  variations_significatives: { compte: string; n_centimes: string; n1_centimes: string; ecart_centimes: string; variation_pct: number; flag: "hausse" | "baisse" | "apparition" | "disparition" }[];
  total_comptes_compares: number;
  total_significatifs: number;
} {
  const seuilPct = args.seuil_variation_pct ?? 25;
  const seuilAbs = args.seuil_variation_centimes ? BigInt(args.seuil_variation_centimes) : BigInt(100_000_000);

  const mapN1 = new Map(args.exercice_n_minus_1.map(r => [r.compte, BigInt(r.solde_centimes)]));
  const variations: any[] = [];
  const allComptes = new Set([...args.exercice_n.map(r => r.compte), ...args.exercice_n_minus_1.map(r => r.compte)]);

  for (const compte of allComptes) {
    const n = BigInt(args.exercice_n.find(r => r.compte === compte)?.solde_centimes ?? "0");
    const n1 = mapN1.get(compte) ?? 0n;
    const ecart = n - n1;
    const ecartAbs = ecart < 0n ? -ecart : ecart;
    const n1Abs = n1 < 0n ? -n1 : n1;

    let pct = 0;
    let flag: "hausse" | "baisse" | "apparition" | "disparition" = "hausse";
    if (n1 === 0n && n !== 0n) { pct = 100; flag = "apparition"; }
    else if (n === 0n && n1 !== 0n) { pct = 100; flag = "disparition"; }
    else if (n1 !== 0n) {
      pct = Math.round((Number(ecart) / Number(n1Abs)) * 100);
      flag = ecart > 0n ? "hausse" : "baisse";
    }

    if (Math.abs(pct) >= seuilPct || ecartAbs >= seuilAbs) {
      variations.push({
        compte,
        n_centimes: n.toString(),
        n1_centimes: n1.toString(),
        ecart_centimes: ecart.toString(),
        variation_pct: pct,
        flag,
      });
    }
  }

  return {
    ok: true,
    variations_significatives: variations,
    total_comptes_compares: allComptes.size,
    total_significatifs: variations.length,
  };
}

// ─── 5. Score controle interne ─────────────────────────────────────────────
/**
 * Score le dispositif de controle interne sur 100 selon des criteres COSO :
 *   - Environnement de controle (organisation, integrite)
 *   - Evaluation des risques
 *   - Activites de controle (separations des taches, autorisations)
 *   - Information et communication
 *   - Pilotage (suivi, audits internes)
 */
export interface ControlQuestion {
  category: "environnement" | "risques" | "activites" | "information" | "pilotage";
  question: string;
  reponse: "oui" | "non" | "partiel" | "na";
  weight?: number;
}

export function scoreInternalControl(args: { responses: ControlQuestion[] }): {
  ok: boolean;
  score_global: number;
  score_par_categorie: Record<string, { score: number; total: number; pct: number }>;
  niveau_maturite: "faible" | "moyen" | "satisfaisant" | "fort";
  recommendations: string[];
} {
  const categories = ["environnement", "risques", "activites", "information", "pilotage"] as const;
  const scores: Record<string, { obtenu: number; max: number }> = {};
  for (const c of categories) scores[c] = { obtenu: 0, max: 0 };

  for (const r of args.responses) {
    if (r.reponse === "na") continue;
    const w = r.weight ?? 1;
    const points = r.reponse === "oui" ? w : r.reponse === "partiel" ? w * 0.5 : 0;
    scores[r.category].obtenu += points;
    scores[r.category].max += w;
  }

  let totalObtenu = 0, totalMax = 0;
  const par_cat: Record<string, { score: number; total: number; pct: number }> = {};
  for (const c of categories) {
    totalObtenu += scores[c].obtenu;
    totalMax += scores[c].max;
    par_cat[c] = {
      score: Math.round(scores[c].obtenu * 100) / 100,
      total: scores[c].max,
      pct: scores[c].max > 0 ? Math.round((scores[c].obtenu / scores[c].max) * 100) : 0,
    };
  }
  const scoreGlobal = totalMax > 0 ? Math.round((totalObtenu / totalMax) * 100) : 0;

  const niveau: "faible" | "moyen" | "satisfaisant" | "fort" =
    scoreGlobal < 40 ? "faible" : scoreGlobal < 65 ? "moyen" : scoreGlobal < 85 ? "satisfaisant" : "fort";

  const recommendations: string[] = [];
  for (const c of categories) {
    if (par_cat[c].pct < 60) {
      recommendations.push(`Renforcer la categorie '${c}' (${par_cat[c].pct}% — sous seuil 60%)`);
    }
  }
  if (recommendations.length === 0) recommendations.push("Dispositif satisfaisant. Maintenir la vigilance et auditer annuellement.");

  return {
    ok: true,
    score_global: scoreGlobal,
    score_par_categorie: par_cat,
    niveau_maturite: niveau,
    recommendations,
  };
}
