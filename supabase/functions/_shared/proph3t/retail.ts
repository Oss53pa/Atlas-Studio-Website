// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — Domain L2 : RETAIL / Distribution
// ═══════════════════════════════════════════════════════════════════════════
// 5 tools metier :
//   1. compute_marge_brute        : marge brute commerciale (CA - cout)
//   2. compute_taux_marque        : taux marque vs taux marge
//   3. compute_rotation_stocks    : rotation et duree moyenne stockage
//   4. compute_point_mort         : seuil de rentabilite (chiffre/quantite)
//   5. compute_panier_moyen       : panier moyen + frequence + LTV client
// ═══════════════════════════════════════════════════════════════════════════

import { formatMoneyFcfa } from "./calculators.ts";

// ─── 1. Marge brute ─────────────────────────────────────────────────────────
/**
 * Marge brute = CA HT - Cout d'achat des marchandises vendues
 * Taux marge brute = (Marge brute / CA HT) × 100
 *
 * Norme retail UEMOA :
 *   < 20% : faible (risque rentabilite)
 *   20-35% : moyen (distribution alimentaire)
 *   35-50% : bon (textile, electromenager)
 *   > 50% : tres bon (luxe, services)
 */
export function computeMargeBrute(args: {
  ca_ht_centimes: string | bigint;
  cout_achat_marchandises_centimes: string | bigint;
}): {
  ok: boolean;
  ca_ht_centimes: string;
  cout_achat_centimes: string;
  marge_brute_centimes: string;
  marge_brute_formatted: string;
  taux_marge_pct: number;
  interpretation: string;
} {
  const ca = BigInt(args.ca_ht_centimes);
  const cout = BigInt(args.cout_achat_marchandises_centimes);
  const marge = ca - cout;
  const taux = ca > 0n ? (Number(marge) / Number(ca)) * 100 : 0;

  const interpretation =
    taux < 20 ? "Marge faible — verifier la chaine d'approvisionnement et politique tarifaire"
    : taux < 35 ? "Marge moyenne — typique de la distribution generale"
    : taux < 50 ? "Bonne marge — secteur specialise"
    : "Tres bonne marge — luxe ou produits a forte valeur ajoutee";

  return {
    ok: true,
    ca_ht_centimes: ca.toString(),
    cout_achat_centimes: cout.toString(),
    marge_brute_centimes: marge.toString(),
    marge_brute_formatted: formatMoneyFcfa(marge),
    taux_marge_pct: Math.round(taux * 100) / 100,
    interpretation,
  };
}

// ─── 2. Taux marque vs taux marge ──────────────────────────────────────────
/**
 * Taux marque = (PV - PA) / PV × 100   (perspective vente)
 * Taux marge  = (PV - PA) / PA × 100   (perspective achat / coefficient multiplicateur)
 *
 * Confusion frequente — ces deux taux sont differents !
 */
export function computeTauxMarque(args: {
  prix_achat_centimes: string | bigint;
  prix_vente_centimes: string | bigint;
}): {
  ok: boolean;
  prix_achat_centimes: string;
  prix_vente_centimes: string;
  marge_centimes: string;
  taux_marque_pct: number;
  taux_marge_pct: number;
  coefficient_multiplicateur: number;
  formules: { taux_marque: string; taux_marge: string; coefficient: string };
} {
  const pa = BigInt(args.prix_achat_centimes);
  const pv = BigInt(args.prix_vente_centimes);
  const marge = pv - pa;
  const tauxMarque = pv > 0n ? (Number(marge) / Number(pv)) * 100 : 0;
  const tauxMarge = pa > 0n ? (Number(marge) / Number(pa)) * 100 : 0;
  const coeff = pa > 0n ? Number(pv) / Number(pa) : 0;

  return {
    ok: true,
    prix_achat_centimes: pa.toString(),
    prix_vente_centimes: pv.toString(),
    marge_centimes: marge.toString(),
    taux_marque_pct: Math.round(tauxMarque * 100) / 100,
    taux_marge_pct: Math.round(tauxMarge * 100) / 100,
    coefficient_multiplicateur: Math.round(coeff * 100) / 100,
    formules: {
      taux_marque: "(PV - PA) / PV × 100",
      taux_marge: "(PV - PA) / PA × 100",
      coefficient: "PV / PA",
    },
  };
}

// ─── 3. Rotation des stocks ────────────────────────────────────────────────
/**
 * Rotation stocks = CA HT (ou achats) / Stock moyen
 * Duree moyenne stockage (jours) = 360 / Rotation
 *
 * Norme retail :
 *   alimentaire : 12-24 rotations/an (15-30 jours)
 *   textile : 4-6 rotations/an (60-90 jours)
 *   electromenager : 6-10 rotations/an
 */
export function computeRotationStocks(args: {
  ca_ou_achats_centimes: string | bigint;
  stock_debut_centimes: string | bigint;
  stock_fin_centimes: string | bigint;
}): {
  ok: boolean;
  stock_moyen_centimes: string;
  rotation_par_an: number;
  duree_stockage_jours: number;
  interpretation: string;
} {
  const sd = BigInt(args.stock_debut_centimes);
  const sf = BigInt(args.stock_fin_centimes);
  const stockMoyen = (sd + sf) / 2n;
  const ca = BigInt(args.ca_ou_achats_centimes);
  if (stockMoyen === 0n) {
    return { ok: false, stock_moyen_centimes: "0", rotation_par_an: 0, duree_stockage_jours: 0, interpretation: "Stock moyen nul, division impossible" };
  }
  const rotation = Number(ca) / Number(stockMoyen);
  const dureeJours = rotation > 0 ? 360 / rotation : 0;

  const interpretation =
    dureeJours < 30 ? `Stock rapide (${dureeJours.toFixed(0)}j) — typique alimentaire ou frais`
    : dureeJours < 60 ? `Stock normal (${dureeJours.toFixed(0)}j) — distribution generale`
    : dureeJours < 120 ? `Stock lent (${dureeJours.toFixed(0)}j) — verifier obsolescence`
    : `Stock tres lent (${dureeJours.toFixed(0)}j) — risque dormance, action urgente`;

  return {
    ok: true,
    stock_moyen_centimes: stockMoyen.toString(),
    rotation_par_an: Math.round(rotation * 100) / 100,
    duree_stockage_jours: Math.round(dureeJours),
    interpretation,
  };
}

// ─── 4. Point mort ─────────────────────────────────────────────────────────
/**
 * Point mort (seuil de rentabilite) = CF / Taux de marge sur cout variable
 * Taux marge sur CV = (CA - CV) / CA
 *
 * Donne le CA minimum pour couvrir les charges fixes.
 * Aussi calculable en quantite si prix unitaire donne.
 */
export function computePointMort(args: {
  charges_fixes_centimes: string | bigint;
  ca_total_centimes: string | bigint;
  charges_variables_centimes: string | bigint;
  prix_vente_unitaire_centimes?: string | bigint;
}): {
  ok: boolean;
  taux_marge_cv_pct: number;
  point_mort_chiffre_centimes: string;
  point_mort_chiffre_formatted: string;
  point_mort_quantite?: number;
  jours_pour_atteindre?: number;
  interpretation: string;
} {
  const cf = BigInt(args.charges_fixes_centimes);
  const ca = BigInt(args.ca_total_centimes);
  const cv = BigInt(args.charges_variables_centimes);

  if (ca === 0n) {
    return { ok: false, taux_marge_cv_pct: 0, point_mort_chiffre_centimes: "0", point_mort_chiffre_formatted: "0 FCFA", interpretation: "CA = 0, calcul impossible" };
  }
  const margeCv = ca - cv;
  const tauxMargeCv = Number(margeCv) / Number(ca);
  if (tauxMargeCv <= 0) {
    return { ok: false, taux_marge_cv_pct: 0, point_mort_chiffre_centimes: "0", point_mort_chiffre_formatted: "0 FCFA", interpretation: "Taux marge sur CV negatif ou nul — pas de rentabilite possible" };
  }
  const pointMort = BigInt(Math.round(Number(cf) / tauxMargeCv));

  let qte: number | undefined;
  if (args.prix_vente_unitaire_centimes) {
    const pu = BigInt(args.prix_vente_unitaire_centimes);
    if (pu > 0n) qte = Math.ceil(Number(pointMort) / Number(pu));
  }

  const jours = ca > 0n ? Math.ceil((Number(pointMort) / Number(ca)) * 360) : undefined;

  const interpretation =
    pointMort < ca
      ? `Point mort atteint a ${((Number(pointMort) / Number(ca)) * 100).toFixed(0)}% du CA — entreprise rentable`
      : `Point mort > CA actuel — ${formatMoneyFcfa(pointMort - ca)} de CA additionnel necessaire`;

  return {
    ok: true,
    taux_marge_cv_pct: Math.round(tauxMargeCv * 10000) / 100,
    point_mort_chiffre_centimes: pointMort.toString(),
    point_mort_chiffre_formatted: formatMoneyFcfa(pointMort),
    point_mort_quantite: qte,
    jours_pour_atteindre: jours,
    interpretation,
  };
}

// ─── 5. Panier moyen + LTV ─────────────────────────────────────────────────
/**
 * Panier moyen = CA total / Nombre de transactions
 * Frequence achat = Nb transactions / Nb clients uniques
 * LTV (Lifetime Value) = Panier × Frequence × Duree retention (annees)
 */
export function computePanierMoyen(args: {
  ca_total_centimes: string | bigint;
  nb_transactions: number;
  nb_clients_uniques: number;
  duree_retention_annees?: number;
  marge_brute_pct?: number;       // pour LTV en marge
}): {
  ok: boolean;
  panier_moyen_centimes: string;
  panier_moyen_formatted: string;
  frequence_achat_par_client: number;
  ca_moyen_par_client_centimes: string;
  ltv_chiffre_centimes?: string;
  ltv_marge_centimes?: string;
  segment: string;
} {
  if (args.nb_transactions <= 0 || args.nb_clients_uniques <= 0) {
    return { ok: false, panier_moyen_centimes: "0", panier_moyen_formatted: "0 FCFA", frequence_achat_par_client: 0, ca_moyen_par_client_centimes: "0", segment: "Donnees insuffisantes" };
  }
  const ca = BigInt(args.ca_total_centimes);
  const panier = ca / BigInt(args.nb_transactions);
  const frequence = args.nb_transactions / args.nb_clients_uniques;
  const caParClient = ca / BigInt(args.nb_clients_uniques);

  let ltv: bigint | undefined;
  let ltvMarge: bigint | undefined;
  if (args.duree_retention_annees && args.duree_retention_annees > 0) {
    const ltvNumber = Number(panier) * frequence * args.duree_retention_annees;
    ltv = BigInt(Math.round(ltvNumber));
    if (args.marge_brute_pct !== undefined) {
      ltvMarge = BigInt(Math.round(ltvNumber * (args.marge_brute_pct / 100)));
    }
  }

  const segment =
    Number(panier) < 50_000 * 100 ? "Volume / petits paniers (alimentaire, services courants)"
    : Number(panier) < 250_000 * 100 ? "Mid-market"
    : "Premium / B2B";

  return {
    ok: true,
    panier_moyen_centimes: panier.toString(),
    panier_moyen_formatted: formatMoneyFcfa(panier),
    frequence_achat_par_client: Math.round(frequence * 100) / 100,
    ca_moyen_par_client_centimes: caParClient.toString(),
    ltv_chiffre_centimes: ltv?.toString(),
    ltv_marge_centimes: ltvMarge?.toString(),
    segment,
  };
}
