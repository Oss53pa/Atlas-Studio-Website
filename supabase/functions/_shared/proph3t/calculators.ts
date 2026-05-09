// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — Calculateurs financiers deterministes (TS pur)
// ═══════════════════════════════════════════════════════════════════════════
// Conformement au CDC §1.2 #2 : tous les calculs financiers sont en TypeScript
// pur. Le LLM ne calcule JAMAIS. Il appelle ces fonctions via tools.
//
// Conformement au CDC §1.2 #4 : argent en BIGINT centimes pour eviter les
// erreurs de virgule flottante. Helper `formatMoneyFcfa` pour l'affichage.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Types ─────────────────────────────────────────────────────────────────

/**
 * Inputs financiers minimaux pour la plupart des ratios SYSCOHADA.
 * Tous les montants sont en CENTIMES (FCFA × 100) pour eviter les erreurs
 * de virgule flottante.
 */
export interface FinancialInputs {
  // Bilan
  totalActif?: bigint;                     // Total actif
  capitauxPropres?: bigint;                // Total capitaux propres (classe 1, hors emprunts)
  dettesFinancieres?: bigint;              // Dettes financieres long terme
  immobilisationsNettes?: bigint;          // Actif immobilise net
  stocks?: bigint;                         // Stocks (classe 3)
  creancesClients?: bigint;                // 411 + sous-comptes
  autresCreances?: bigint;                 // Autres creances exploitation
  tresorerieActif?: bigint;                // Caisse + banques + VMP
  dettesFournisseurs?: bigint;             // 401 + sous-comptes
  dettesFiscalesSociales?: bigint;         // 42 + 43 + 44
  autresDettes?: bigint;                   // Autres dettes exploitation
  tresoreriePassif?: bigint;               // Decouverts bancaires

  // Compte de resultat
  chiffreAffaires?: bigint;                // CA HT
  achatsConsommes?: bigint;                // Achats consommes
  chargesPersonnel?: bigint;               // 66 (hors 668)
  impotsTaxes?: bigint;                    // 64
  subventionsExploitation?: bigint;        // 71
  dotationsAmortissements?: bigint;        // 68
  reprises?: bigint;                       // 78
  resultatNet?: bigint;                    // Resultat net comptable
  chargesFinancieres?: bigint;             // 67
  produitsFinanciers?: bigint;             // 77
  impotSurResultat?: bigint;               // 89

  // Periode
  periodeDebut?: string;                   // ISO date
  periodeFin?: string;                     // ISO date
}

export interface RatioResult<T extends Record<string, unknown> = Record<string, unknown>> {
  type: string;
  value: bigint | number;
  unit: "FCFA_centimes" | "ratio" | "pourcent" | "jours" | "score";
  formula: string;                         // formule SYSCOHADA en clair
  inputsUsed: string[];                    // champs FinancialInputs utilises
  interpretation?: string;                 // commentaire automatique
  details?: T;
}

// ─── Fonds de Roulement (FR) ──────────────────────────────────────────────
/**
 * FR = Ressources stables - Emplois stables
 *    = (Capitaux propres + Dettes financieres LT) - Actif immobilise net
 *
 * FR positif : ressources stables couvrent les emplois stables (sain).
 * FR negatif : immobilisations financees par du court terme (risque).
 */
export function computeFondsDeRoulement(i: FinancialInputs): RatioResult<{ ressourcesStables: bigint; emploisStables: bigint }> {
  if (i.capitauxPropres === undefined || i.dettesFinancieres === undefined || i.immobilisationsNettes === undefined) {
    throw new Error("FR: capitauxPropres + dettesFinancieres + immobilisationsNettes requis");
  }
  const ressourcesStables = i.capitauxPropres + i.dettesFinancieres;
  const emploisStables = i.immobilisationsNettes;
  const fr = ressourcesStables - emploisStables;
  return {
    type: "fonds_de_roulement",
    value: fr,
    unit: "FCFA_centimes",
    formula: "FR = (Capitaux propres + Dettes financieres LT) - Actif immobilise net",
    inputsUsed: ["capitauxPropres", "dettesFinancieres", "immobilisationsNettes"],
    interpretation: fr > 0n
      ? "FR positif : marge de securite financiere a long terme."
      : "FR negatif : les immobilisations sont partiellement financees par du court terme. Risque structurel a corriger.",
    details: { ressourcesStables, emploisStables },
  };
}

// ─── Besoin en Fonds de Roulement (BFR) ───────────────────────────────────
/**
 * BFR = Actif circulant exploitation - Passif circulant exploitation
 *     = (Stocks + Creances clients + Autres creances) - (Fournisseurs + Dettes fisc/soc + Autres dettes)
 *
 * Ne pas inclure tresorerie ni dettes financieres.
 */
export function computeBFR(i: FinancialInputs): RatioResult<{ actifCirculant: bigint; passifCirculant: bigint }> {
  const stocks = i.stocks ?? 0n;
  const clients = i.creancesClients ?? 0n;
  const autresC = i.autresCreances ?? 0n;
  const fourn = i.dettesFournisseurs ?? 0n;
  const fiscSoc = i.dettesFiscalesSociales ?? 0n;
  const autresD = i.autresDettes ?? 0n;

  const actifCirculant = stocks + clients + autresC;
  const passifCirculant = fourn + fiscSoc + autresD;
  const bfr = actifCirculant - passifCirculant;

  return {
    type: "bfr",
    value: bfr,
    unit: "FCFA_centimes",
    formula: "BFR = (Stocks + Creances clients + Autres creances) - (Fournisseurs + Dettes fiscales/sociales + Autres dettes)",
    inputsUsed: ["stocks", "creancesClients", "autresCreances", "dettesFournisseurs", "dettesFiscalesSociales", "autresDettes"],
    interpretation: bfr > 0n
      ? "BFR positif : le cycle d'exploitation absorbe de la tresorerie. Plus eleve = plus de tension."
      : "BFR negatif : le cycle d'exploitation degage de la tresorerie (cas typique distribution).",
    details: { actifCirculant, passifCirculant },
  };
}

// ─── Tresorerie Nette ─────────────────────────────────────────────────────
/**
 * TN = FR - BFR
 *    = Tresorerie active - Tresorerie passive
 */
export function computeTresorerieNette(i: FinancialInputs): RatioResult {
  const fr = computeFondsDeRoulement(i).value as bigint;
  const bfr = computeBFR(i).value as bigint;
  const tn = fr - bfr;
  return {
    type: "tresorerie_nette",
    value: tn,
    unit: "FCFA_centimes",
    formula: "Tresorerie nette = FR - BFR",
    inputsUsed: ["FR (calcul)", "BFR (calcul)"],
    interpretation: tn > 0n
      ? "Tresorerie nette positive : excedent de liquidites."
      : "Tresorerie nette negative : tension de tresorerie a financer (decouverts, escompte).",
  };
}

// ─── Ratio d'autonomie financiere ─────────────────────────────────────────
/**
 * Autonomie = Capitaux propres / Total bilan
 * Norme SYSCOHADA : > 30 % recommande, > 40 % optimal.
 */
export function computeAutonomieFinanciere(i: FinancialInputs): RatioResult {
  if (i.capitauxPropres === undefined || i.totalActif === undefined || i.totalActif === 0n) {
    throw new Error("Autonomie: capitauxPropres + totalActif requis (totalActif > 0)");
  }
  const ratio = Number(i.capitauxPropres) / Number(i.totalActif);
  return {
    type: "autonomie_financiere",
    value: ratio,
    unit: "ratio",
    formula: "Autonomie financiere = Capitaux propres / Total bilan",
    inputsUsed: ["capitauxPropres", "totalActif"],
    interpretation: ratio < 0.20
      ? "Tres faible (<20%) : forte dependance bancaire, vulnerabilite."
      : ratio < 0.30
        ? "Faible (<30%) : a renforcer (mise en reserve, augmentation capital)."
        : ratio < 0.40
          ? "Correcte (30-40%) : norme SYSCOHADA respectee."
          : "Optimale (>40%) : structure financiere saine.",
  };
}

// ─── Ratio de liquidite generale ──────────────────────────────────────────
/**
 * Liquidite generale = Actif circulant / Passif circulant
 * Norme : > 1 (couvre les dettes court terme avec actifs court terme).
 */
export function computeLiquiditeGenerale(i: FinancialInputs): RatioResult {
  const actifCirc = (i.stocks ?? 0n) + (i.creancesClients ?? 0n) + (i.autresCreances ?? 0n) + (i.tresorerieActif ?? 0n);
  const passifCirc = (i.dettesFournisseurs ?? 0n) + (i.dettesFiscalesSociales ?? 0n) + (i.autresDettes ?? 0n) + (i.tresoreriePassif ?? 0n);
  if (passifCirc === 0n) {
    throw new Error("Liquidite generale: passif circulant = 0, division impossible");
  }
  const ratio = Number(actifCirc) / Number(passifCirc);
  return {
    type: "liquidite_generale",
    value: ratio,
    unit: "ratio",
    formula: "Liquidite generale = Actif circulant / Passif circulant",
    inputsUsed: ["stocks", "creancesClients", "autresCreances", "tresorerieActif", "dettesFournisseurs", "dettesFiscalesSociales", "autresDettes", "tresoreriePassif"],
    interpretation: ratio < 1
      ? "Inferieur a 1 : insolvabilite court terme. Risque immediat."
      : ratio < 1.5
        ? "Limite (1-1.5) : tension. Renforcer le BFR."
        : "Saine (>1.5) : couverture confortable.",
  };
}

// ─── Capacite d'Autofinancement (CAF) ─────────────────────────────────────
/**
 * CAF = Resultat net + Dotations - Reprises (- plus-values, + moins-values cessions)
 * Mesure la tresorerie potentiellement degagee par l'activite.
 */
export function computeCAF(i: FinancialInputs): RatioResult {
  if (i.resultatNet === undefined) {
    throw new Error("CAF: resultatNet requis");
  }
  const dotations = i.dotationsAmortissements ?? 0n;
  const reprises = i.reprises ?? 0n;
  const caf = i.resultatNet + dotations - reprises;
  return {
    type: "caf",
    value: caf,
    unit: "FCFA_centimes",
    formula: "CAF = Resultat net + Dotations amortissements/provisions - Reprises",
    inputsUsed: ["resultatNet", "dotationsAmortissements", "reprises"],
    interpretation: i.chiffreAffaires && i.chiffreAffaires > 0n
      ? `CAF/CA = ${(Number(caf) / Number(i.chiffreAffaires) * 100).toFixed(1)}% (norme 5-15% selon secteur)`
      : "Comparer au CA pour interpreter (norme 5-15%).",
  };
}

// ─── Excedent Brut d'Exploitation (EBE) ───────────────────────────────────
/**
 * EBE = Valeur ajoutee + Subventions exploitation - Impots/taxes - Charges personnel
 * Avec : Valeur ajoutee = Marge brute - Autres consommations externes
 * Pour simplification : VA = CA - Achats consommes (approximation acceptable)
 */
export function computeEBE(i: FinancialInputs): RatioResult<{ valeurAjoutee: bigint }> {
  if (i.chiffreAffaires === undefined) {
    throw new Error("EBE: chiffreAffaires requis");
  }
  const achats = i.achatsConsommes ?? 0n;
  const subventions = i.subventionsExploitation ?? 0n;
  const impotsTaxes = i.impotsTaxes ?? 0n;
  const personnel = i.chargesPersonnel ?? 0n;

  const valeurAjoutee = i.chiffreAffaires - achats;
  const ebe = valeurAjoutee + subventions - impotsTaxes - personnel;

  return {
    type: "ebe",
    value: ebe,
    unit: "FCFA_centimes",
    formula: "EBE = (CA - Achats consommes) + Subventions exploitation - Impots/Taxes - Charges personnel",
    inputsUsed: ["chiffreAffaires", "achatsConsommes", "subventionsExploitation", "impotsTaxes", "chargesPersonnel"],
    interpretation: i.chiffreAffaires && i.chiffreAffaires > 0n
      ? `Marge EBE/CA = ${(Number(ebe) / Number(i.chiffreAffaires) * 100).toFixed(1)}% (norme 10% retail, 25%+ services)`
      : undefined,
    details: { valeurAjoutee },
  };
}

// ─── Z-Score d'Altman (modele simplifie pour PME) ─────────────────────────
/**
 * Z' Altman pour entreprises non cotees :
 *   Z' = 0.717 X1 + 0.847 X2 + 3.107 X3 + 0.420 X4 + 0.998 X5
 * X1 = Fonds de roulement / Total actif
 * X2 = Resultats reportes / Total actif (approxime par capitaux propres - capital initial)
 * X3 = EBE / Total actif (proxy de EBIT)
 * X4 = Capitaux propres / Dettes totales
 * X5 = CA / Total actif
 *
 * Interpretation :
 *   Z' > 2.9   : zone de securite (faible risque faillite)
 *   1.23-2.9   : zone grise (incertain)
 *   Z' < 1.23  : zone de detresse (risque eleve faillite a 2 ans)
 */
export function computeAltmanZScore(i: FinancialInputs): RatioResult<{ x1: number; x2: number; x3: number; x4: number; x5: number }> {
  if (
    i.totalActif === undefined || i.totalActif === 0n ||
    i.capitauxPropres === undefined || i.chiffreAffaires === undefined
  ) {
    throw new Error("Altman: totalActif (>0) + capitauxPropres + chiffreAffaires requis");
  }

  const fr = computeFondsDeRoulement(i).value as bigint;
  const ebe = computeEBE(i).value as bigint;
  const dettesTotales = (i.dettesFinancieres ?? 0n) + (i.dettesFournisseurs ?? 0n) + (i.dettesFiscalesSociales ?? 0n) + (i.autresDettes ?? 0n) + (i.tresoreriePassif ?? 0n);

  const x1 = Number(fr) / Number(i.totalActif);
  // X2 simplifie : capitaux propres / total actif (proxy resultats reportes)
  const x2 = Number(i.capitauxPropres) / Number(i.totalActif);
  const x3 = Number(ebe) / Number(i.totalActif);
  const x4 = dettesTotales > 0n ? Number(i.capitauxPropres) / Number(dettesTotales) : 10;
  const x5 = Number(i.chiffreAffaires) / Number(i.totalActif);

  const z = 0.717 * x1 + 0.847 * x2 + 3.107 * x3 + 0.420 * x4 + 0.998 * x5;

  return {
    type: "altman_z_score",
    value: z,
    unit: "score",
    formula: "Z' = 0.717·X1 + 0.847·X2 + 3.107·X3 + 0.420·X4 + 0.998·X5",
    inputsUsed: ["totalActif", "capitauxPropres", "chiffreAffaires", "dettesFinancieres", "dettesFournisseurs", "dettesFiscalesSociales", "autresDettes", "tresoreriePassif"],
    interpretation: z < 1.23
      ? `Z'=${z.toFixed(2)} - ZONE DE DETRESSE : risque eleve de faillite a 2 ans. Plan de redressement urgent.`
      : z < 2.9
        ? `Z'=${z.toFixed(2)} - ZONE GRISE : incertitude. Surveiller liquidite et endettement.`
        : `Z'=${z.toFixed(2)} - ZONE DE SECURITE : faible risque de faillite.`,
    details: { x1, x2, x3, x4, x5 },
  };
}

// ─── Delais Clients (DSO) et Fournisseurs (DPO) ───────────────────────────
/**
 * DSO (Days Sales Outstanding) = Creances clients / CA TTC × 360
 * DPO (Days Payable Outstanding) = Dettes fournisseurs / Achats TTC × 360
 *
 * Hypothese : on utilise CA HT et achats HT (approximation, faute de TTC explicite).
 */
export function computeDSO(i: FinancialInputs): RatioResult {
  if (i.creancesClients === undefined || i.chiffreAffaires === undefined || i.chiffreAffaires === 0n) {
    throw new Error("DSO: creancesClients + chiffreAffaires (>0) requis");
  }
  const dso = (Number(i.creancesClients) / Number(i.chiffreAffaires)) * 360;
  return {
    type: "dso",
    value: dso,
    unit: "jours",
    formula: "DSO = (Creances clients / Chiffre d'affaires) × 360",
    inputsUsed: ["creancesClients", "chiffreAffaires"],
    interpretation: dso < 30
      ? `DSO=${dso.toFixed(0)}j - excellent (encaissement rapide)`
      : dso < 60
        ? `DSO=${dso.toFixed(0)}j - normal B2B (norme 30-60j)`
        : dso < 90
          ? `DSO=${dso.toFixed(0)}j - eleve, surveiller`
          : `DSO=${dso.toFixed(0)}j - tres eleve, action urgente (relances, escompte, affacturage)`,
  };
}

export function computeDPO(i: FinancialInputs): RatioResult {
  if (i.dettesFournisseurs === undefined || i.achatsConsommes === undefined || i.achatsConsommes === 0n) {
    throw new Error("DPO: dettesFournisseurs + achatsConsommes (>0) requis");
  }
  const dpo = (Number(i.dettesFournisseurs) / Number(i.achatsConsommes)) * 360;
  return {
    type: "dpo",
    value: dpo,
    unit: "jours",
    formula: "DPO = (Dettes fournisseurs / Achats consommes) × 360",
    inputsUsed: ["dettesFournisseurs", "achatsConsommes"],
    interpretation: `DPO=${dpo.toFixed(0)}j - delais paiement fournisseurs (negocier 60-90j ideal pour soulager BFR).`,
  };
}

// ─── TVA UEMOA / CEMAC ────────────────────────────────────────────────────

export type CountryCode = "CI" | "SN" | "BF" | "ML" | "BJ" | "TG" | "NE" | "GW" | "CM" | "CG" | "GA" | "TD" | "CF";
export type TvaRateType = "standard" | "reduit" | "zero" | "exonere";

const TVA_RATES: Record<CountryCode, Record<TvaRateType, number>> = {
  // UEMOA (taux harmonises mais ecarts par pays)
  CI: { standard: 0.18, reduit: 0.09, zero: 0, exonere: 0 },
  SN: { standard: 0.18, reduit: 0.10, zero: 0, exonere: 0 },
  BF: { standard: 0.18, reduit: 0.10, zero: 0, exonere: 0 },
  ML: { standard: 0.18, reduit: 0, zero: 0, exonere: 0 },
  BJ: { standard: 0.18, reduit: 0, zero: 0, exonere: 0 },
  TG: { standard: 0.18, reduit: 0, zero: 0, exonere: 0 },
  NE: { standard: 0.19, reduit: 0, zero: 0, exonere: 0 },
  GW: { standard: 0.15, reduit: 0, zero: 0, exonere: 0 },
  // CEMAC
  CM: { standard: 0.1925, reduit: 0, zero: 0, exonere: 0 },
  CG: { standard: 0.18, reduit: 0.05, zero: 0, exonere: 0 },
  GA: { standard: 0.18, reduit: 0.10, zero: 0, exonere: 0 },
  TD: { standard: 0.18, reduit: 0, zero: 0, exonere: 0 },
  CF: { standard: 0.19, reduit: 0, zero: 0, exonere: 0 },
};

export function computeTVA(baseHtCentimes: bigint, country: CountryCode, rateType: TvaRateType = "standard"): {
  baseHt: bigint;
  taux: number;
  montantTva: bigint;
  totalTtc: bigint;
  formula: string;
} {
  const rate = TVA_RATES[country]?.[rateType];
  if (rate === undefined) throw new Error(`TVA: pays ${country} ou taux ${rateType} non reconnu`);
  // Calcul exact en bigint : (base × rate × 10000) / 10000 pour 4 decimales de taux
  const rateBp = BigInt(Math.round(rate * 10000));  // basis points × 100
  const montantTva = (baseHtCentimes * rateBp) / 10000n;
  return {
    baseHt: baseHtCentimes,
    taux: rate,
    montantTva,
    totalTtc: baseHtCentimes + montantTva,
    formula: `TVA ${country} ${rateType} = ${(rate * 100).toFixed(2)}% × ${baseHtCentimes} centimes`,
  };
}

// ─── Money helpers ─────────────────────────────────────────────────────────

/**
 * Convertit centimes (bigint) en string formate FCFA : "1 234 567 FCFA"
 * SYSCOHADA : pas de decimales pour FCFA.
 */
export function formatMoneyFcfa(centimes: bigint): string {
  const fcfa = centimes / 100n;
  const s = fcfa.toString();
  // separateur milliers tous les 3 chiffres (depuis la droite)
  const parts: string[] = [];
  for (let i = s.length; i > 0; i -= 3) {
    parts.unshift(s.slice(Math.max(0, i - 3), i));
  }
  return parts.join(" ") + " FCFA";
}

/**
 * Prorata 360 jours (regle SYSCOHADA pour interets, cotisations, etc.)
 * @param amountCentimes Montant annuel en centimes
 * @param days Nombre de jours d'application
 * @returns Montant proratise en centimes
 */
export function applyProrata360(amountCentimes: bigint, days: number): bigint {
  if (days < 0 || days > 360) throw new Error("prorata: days entre 0 et 360");
  return (amountCentimes * BigInt(days)) / 360n;
}

// ─── Master dispatcher (utilise par le tool compute_ratio) ────────────────

export type RatioType =
  | "fr" | "fonds_de_roulement"
  | "bfr"
  | "tresorerie_nette"
  | "autonomie_financiere"
  | "liquidite_generale"
  | "caf"
  | "ebe"
  | "altman_z_score"
  | "dso"
  | "dpo";

export function computeRatio(type: RatioType, inputs: FinancialInputs): RatioResult {
  switch (type) {
    case "fr":
    case "fonds_de_roulement":
      return computeFondsDeRoulement(inputs);
    case "bfr":
      return computeBFR(inputs);
    case "tresorerie_nette":
      return computeTresorerieNette(inputs);
    case "autonomie_financiere":
      return computeAutonomieFinanciere(inputs);
    case "liquidite_generale":
      return computeLiquiditeGenerale(inputs);
    case "caf":
      return computeCAF(inputs);
    case "ebe":
      return computeEBE(inputs);
    case "altman_z_score":
      return computeAltmanZScore(inputs);
    case "dso":
      return computeDSO(inputs);
    case "dpo":
      return computeDPO(inputs);
    default:
      throw new Error(`Type de ratio inconnu : ${type}`);
  }
}
