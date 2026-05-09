// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — Domain L2 : JURIDIQUE / Droit OHADA
// ═══════════════════════════════════════════════════════════════════════════
// 5 tools metier juridiques :
//   1. compute_capital_minimum    : capital min selon forme juridique OHADA
//   2. validate_societe_creation  : check formalites creation societe
//   3. forecast_ag_quorum         : quorum AG ordinaire/extraordinaire
//   4. compute_mise_demeure_delai : delai mise en demeure + interets retard
//   5. analyze_contract_clauses   : analyse clauses-types d'un contrat
// ═══════════════════════════════════════════════════════════════════════════

// ─── 1. Capital minimum par forme juridique ───────────────────────────────
/**
 * Capitaux minimums par forme juridique (AUSCGIE 2014) :
 *   SA   : 10 000 000 FCFA (avec APE) / 100 000 000 (sans APE)
 *   SAS  : libre (depuis revision 2014)
 *   SARL : 1 000 000 FCFA (peut etre 100 000 par decision tenue en franchise)
 *   SCI  : libre
 *   SNC  : libre
 *   SCS  : libre (mais commandites + commanditaires)
 */
const CAPITAL_MIN: Record<string, { fcfa: number; particularites?: string }> = {
  SA: { fcfa: 10_000_000, particularites: "100 000 000 FCFA si appel public a l'epargne (APE)" },
  SAS: { fcfa: 0, particularites: "Capital libre depuis AUSCGIE revise 2014" },
  SARL: { fcfa: 1_000_000, particularites: "Possibilite 100 000 FCFA par decision en franchise (10 etats UEMOA)" },
  SCI: { fcfa: 0, particularites: "Capital libre" },
  SNC: { fcfa: 0, particularites: "Pas de minimum, mais associes responsables solidairement" },
  SCS: { fcfa: 0, particularites: "Commandites responsables solidairement" },
  EI: { fcfa: 0, particularites: "Pas de capital (entreprise individuelle, patrimoine confondu)" },
};

export function computeCapitalMinimum(args: {
  forme_juridique: string;
  appel_public_epargne?: boolean;
  pays?: string;
  capital_propose_centimes?: string | bigint;
}): {
  ok: boolean;
  forme_juridique: string;
  capital_min_fcfa: number;
  capital_min_centimes: string;
  particularites?: string;
  conformite?: { capital_propose_fcfa: number; conforme: boolean; ecart_fcfa: number };
  error?: string;
} {
  const cfg = CAPITAL_MIN[args.forme_juridique.toUpperCase()];
  if (!cfg) {
    return { ok: false, forme_juridique: args.forme_juridique, capital_min_fcfa: 0, capital_min_centimes: "0", error: `Forme juridique '${args.forme_juridique}' non reconnue` };
  }

  let minFcfa = cfg.fcfa;
  if (args.forme_juridique.toUpperCase() === "SA" && args.appel_public_epargne) {
    minFcfa = 100_000_000;
  }

  let conformite: any;
  if (args.capital_propose_centimes) {
    const proposeFcfa = Number(BigInt(args.capital_propose_centimes) / 100n);
    conformite = {
      capital_propose_fcfa: proposeFcfa,
      conforme: proposeFcfa >= minFcfa,
      ecart_fcfa: proposeFcfa - minFcfa,
    };
  }

  return {
    ok: true,
    forme_juridique: args.forme_juridique.toUpperCase(),
    capital_min_fcfa: minFcfa,
    capital_min_centimes: (minFcfa * 100).toString(),
    particularites: cfg.particularites,
    conformite,
  };
}

// ─── 2. Validate societe creation ──────────────────────────────────────────
/**
 * Verifie les formalites obligatoires de creation d'une societe OHADA :
 *   - Capital minimum respecte
 *   - Nombre d'associes (selon forme)
 *   - Statuts redigees (acte sous seing prive ou notarie)
 *   - Depot au RCCM (Registre Commerce Credit Mobilier)
 *   - Publication legale (avis dans journal d'annonces legales)
 */
export interface CreationChecklist {
  forme_juridique: string;
  pays: string;
  nb_associes: number;
  capital_propose_centimes: string | bigint;
  statuts_rediges: boolean;
  acte_authentique?: boolean;
  rccm_depose?: boolean;
  publication_jal?: boolean;
  numero_ifu_obtenu?: boolean;
  declaration_existence_fiscale?: boolean;
  agrement_specifique_obtenu?: boolean;     // banques, assurances, etc.
}

export function validateSocieteCreation(args: CreationChecklist): {
  ok: boolean;
  conformite_globale: boolean;
  taux_conformite_pct: number;
  checks: { item: string; ok: boolean; obligatoire: boolean; detail?: string }[];
  next_actions: string[];
} {
  const forme = args.forme_juridique.toUpperCase();
  const checks: { item: string; ok: boolean; obligatoire: boolean; detail?: string }[] = [];
  const next: string[] = [];

  // Capital
  const capRes = computeCapitalMinimum({
    forme_juridique: forme,
    capital_propose_centimes: args.capital_propose_centimes,
  });
  const capOk = capRes.conformite?.conforme ?? false;
  checks.push({ item: "Capital minimum legal", ok: capOk, obligatoire: true, detail: capOk ? `OK (${capRes.capital_min_fcfa.toLocaleString()} FCFA min)` : `Manque ${(-(capRes.conformite?.ecart_fcfa ?? 0)).toLocaleString()} FCFA` });
  if (!capOk) next.push(`Augmenter le capital pour atteindre le minimum legal de ${capRes.capital_min_fcfa.toLocaleString()} FCFA`);

  // Nombre d'associes
  let nbMin = 1, nbMax = 999;
  if (forme === "SA") { nbMin = 1; }
  if (forme === "SARL") { nbMin = 1; nbMax = 100; }
  if (forme === "SAS") { nbMin = 1; }
  if (forme === "SNC") { nbMin = 2; }
  if (forme === "SCS") { nbMin = 2; }
  const nbOk = args.nb_associes >= nbMin && args.nb_associes <= nbMax;
  checks.push({ item: "Nombre d'associes", ok: nbOk, obligatoire: true, detail: `${args.nb_associes} associes (min ${nbMin}, max ${nbMax === 999 ? "illimite" : nbMax})` });
  if (!nbOk) next.push(`Ajuster le nombre d'associes (${nbMin}-${nbMax === 999 ? "illimite" : nbMax})`);

  // Statuts
  checks.push({ item: "Statuts rediges", ok: args.statuts_rediges, obligatoire: true });
  if (!args.statuts_rediges) next.push("Rediger les statuts (notaire ou avocat recommande)");

  // Acte authentique : obligatoire pour SA, optionnel pour autres
  if (forme === "SA") {
    const acteOk = args.acte_authentique ?? false;
    checks.push({ item: "Acte authentique (notarie)", ok: acteOk, obligatoire: true });
    if (!acteOk) next.push("Faire dresser les statuts par un notaire (obligatoire pour SA)");
  }

  // RCCM
  const rccmOk = args.rccm_depose ?? false;
  checks.push({ item: "Depot au RCCM", ok: rccmOk, obligatoire: true });
  if (!rccmOk) next.push("Deposer le dossier au Greffe du Tribunal de Commerce (RCCM)");

  // Publication JAL
  const jalOk = args.publication_jal ?? false;
  checks.push({ item: "Publication journal annonces legales", ok: jalOk, obligatoire: true });
  if (!jalOk) next.push("Publier l'avis de constitution dans un journal d'annonces legales");

  // IFU
  const ifuOk = args.numero_ifu_obtenu ?? false;
  checks.push({ item: "Numero IFU obtenu", ok: ifuOk, obligatoire: true });
  if (!ifuOk) next.push("Demander le numero IFU aupres de l'administration fiscale");

  // Declaration fiscale d'existence
  const fiscOk = args.declaration_existence_fiscale ?? false;
  checks.push({ item: "Declaration d'existence fiscale", ok: fiscOk, obligatoire: true });
  if (!fiscOk) next.push("Deposer la declaration d'existence fiscale (DGI) sous 30 jours");

  // Agrement specifique
  if (args.agrement_specifique_obtenu === false) {
    checks.push({ item: "Agrement reglementaire", ok: false, obligatoire: true, detail: "Non obtenu (banque, assurance, telecoms, etc.)" });
    next.push("Obtenir l'agrement de l'autorite de tutelle (BCEAO, ARTCI, etc.)");
  }

  const obligatoires = checks.filter(c => c.obligatoire);
  const obligatoiresOk = obligatoires.filter(c => c.ok).length;
  const taux = obligatoires.length > 0 ? Math.round((obligatoiresOk / obligatoires.length) * 100) : 0;

  return {
    ok: true,
    conformite_globale: obligatoires.every(c => c.ok),
    taux_conformite_pct: taux,
    checks,
    next_actions: next,
  };
}

// ─── 3. Quorum AG ──────────────────────────────────────────────────────────
/**
 * Quorum et majorite pour Assemblees Generales selon AUSCGIE.
 *
 * AGO (Assemblee Generale Ordinaire) :
 *   SA : Quorum 1/4 du capital sur 1ere convocation, aucun sur 2e. Majorite simple.
 *   SARL : Quorum 1/2 capital, majorite simple.
 *
 * AGE (Assemblee Generale Extraordinaire) :
 *   SA : Quorum 1/2 (1ere) ou 1/4 (2e). Majorite 2/3 voix exprimees.
 *   SARL : Quorum 3/4 capital. Majorite 3/4.
 */
export function forecastAgQuorum(args: {
  forme_juridique: "SA" | "SARL";
  type_assemblee: "AGO" | "AGE";
  capital_total_centimes: string | bigint;
  capital_present_centimes: string | bigint;
  voix_pour: number;
  voix_contre: number;
  voix_abstention?: number;
  premiere_convocation?: boolean;
}): {
  ok: boolean;
  forme: string;
  type: string;
  capital_present_pct: number;
  quorum_requis_pct: number;
  quorum_atteint: boolean;
  majorite_requise_pct: number;
  voix_pour_pct: number;
  decision_adoptee: boolean;
  motif?: string;
} {
  const total = BigInt(args.capital_total_centimes);
  const present = BigInt(args.capital_present_centimes);
  const presentPct = total > 0n ? Number(present) / Number(total) * 100 : 0;

  // Determine quorum requis
  const premiere = args.premiere_convocation ?? true;
  let quorumRequis = 0;
  let majoriteRequise = 0;

  if (args.forme_juridique === "SA") {
    if (args.type_assemblee === "AGO") {
      quorumRequis = premiere ? 25 : 0;
      majoriteRequise = 50;
    } else {
      quorumRequis = premiere ? 50 : 25;
      majoriteRequise = 66.67;
    }
  } else if (args.forme_juridique === "SARL") {
    if (args.type_assemblee === "AGO") {
      quorumRequis = 50;
      majoriteRequise = 50;
    } else {
      quorumRequis = 75;
      majoriteRequise = 75;
    }
  }

  const totalVoix = args.voix_pour + args.voix_contre + (args.voix_abstention ?? 0);
  const voixPourPct = totalVoix > 0 ? (args.voix_pour / totalVoix) * 100 : 0;

  const quorumAtteint = presentPct >= quorumRequis;
  let decision = false;
  let motif: string | undefined;
  if (!quorumAtteint) {
    motif = `Quorum non atteint : ${presentPct.toFixed(1)}% < ${quorumRequis}%. Convoquer une 2e assemblee.`;
  } else if (voixPourPct >= majoriteRequise) {
    decision = true;
    motif = "Decision adoptee.";
  } else {
    motif = `Majorite insuffisante : ${voixPourPct.toFixed(1)}% < ${majoriteRequise}% requis.`;
  }

  return {
    ok: true,
    forme: args.forme_juridique, type: args.type_assemblee,
    capital_present_pct: Math.round(presentPct * 100) / 100,
    quorum_requis_pct: quorumRequis,
    quorum_atteint: quorumAtteint,
    majorite_requise_pct: majoriteRequise,
    voix_pour_pct: Math.round(voixPourPct * 100) / 100,
    decision_adoptee: decision,
    motif,
  };
}

// ─── 4. Mise en demeure ────────────────────────────────────────────────────
/**
 * Calcul des delais et interets de retard apres mise en demeure (Code civil OHADA) :
 *   - Delai legal classique apres MED : 8 jours pour s'executer (commercial)
 *   - Interets de retard a partir de la date de mise en demeure
 *   - Taux legal : taux BCEAO ou taux defini contractuellement
 *   - Pour creances commerciales : peut inclure indemnite forfaitaire de recouvrement
 */
export function computeMiseDemeureDelai(args: {
  date_mise_demeure: string;
  delai_octroye_jours?: number;          // defaut 8 (commercial)
  montant_principal_centimes: string | bigint;
  taux_legal_annuel?: number;             // defaut 0.06 BCEAO
  date_calcul?: string;                    // pour interets cumules
  indemnite_forfaitaire_fcfa?: number;     // ex 25000 si stipule
}): {
  ok: boolean;
  date_med: string;
  date_limite_executoire: string;
  delai_octroye_jours: number;
  jours_de_retard: number;
  interets_retard_centimes: string;
  indemnite_forfaitaire_centimes: string;
  total_du_centimes: string;
  total_du_formatted: string;
  prochaine_etape: string;
} {
  const med = new Date(args.date_mise_demeure);
  const delai = args.delai_octroye_jours ?? 8;
  const limite = new Date(med);
  limite.setDate(limite.getDate() + delai);

  const dateCalc = args.date_calcul ? new Date(args.date_calcul) : new Date();
  const joursRetard = Math.max(0, Math.ceil((dateCalc.getTime() - limite.getTime()) / (1000 * 60 * 60 * 24)));

  const tauxAn = args.taux_legal_annuel ?? 0.06;
  const principal = BigInt(args.montant_principal_centimes);
  const tauxJourBp = BigInt(Math.round((tauxAn / 360) * 1_000_000));
  const interets = (principal * tauxJourBp * BigInt(joursRetard)) / 1_000_000n;
  const indemnite = args.indemnite_forfaitaire_fcfa ? BigInt(args.indemnite_forfaitaire_fcfa * 100) : 0n;
  const totalDu = principal + interets + indemnite;

  // Import local pour eviter cycle
  const fmt = (c: bigint) => {
    const fcfa = c / 100n;
    const s = fcfa.toString();
    const parts = [];
    for (let i = s.length; i > 0; i -= 3) parts.unshift(s.slice(Math.max(0, i - 3), i));
    return parts.join(" ") + " FCFA";
  };

  let prochaine: string;
  if (joursRetard <= 0) prochaine = "Delai d'execution non encore expire — patienter";
  else if (joursRetard <= 30) prochaine = "Relance amiable + appel telephonique";
  else if (joursRetard <= 90) prochaine = "Saisine du tribunal de commerce ou injonction de payer";
  else prochaine = "Action contentieuse urgente. Saisir le tribunal sans delai (prescription possible)";

  return {
    ok: true,
    date_med: args.date_mise_demeure,
    date_limite_executoire: limite.toISOString().slice(0, 10),
    delai_octroye_jours: delai,
    jours_de_retard: joursRetard,
    interets_retard_centimes: interets.toString(),
    indemnite_forfaitaire_centimes: indemnite.toString(),
    total_du_centimes: totalDu.toString(),
    total_du_formatted: fmt(totalDu),
    prochaine_etape: prochaine,
  };
}

// ─── 5. Analyse clauses contractuelles ─────────────────────────────────────
/**
 * Analyse heuristique de clauses-types dans un contrat. Identifie :
 *   - Presence des 6 clauses essentielles (parties, objet, prix, duree, juridiction, resiliation)
 *   - Clauses suspectes (penalites disproportionnees, exclusivite eternelle, etc.)
 *   - Clauses manquantes recommandees (force majeure, RGPD, confidentialite)
 */
const CLAUSES_PATTERNS: { id: string; libelle: string; obligatoire: boolean; patterns: RegExp[] }[] = [
  { id: "parties", libelle: "Identification des parties", obligatoire: true, patterns: [/entre les soussign[ée]/i, /d'une part.*d'autre part/i, /partie\s*\d/i] },
  { id: "objet", libelle: "Objet du contrat", obligatoire: true, patterns: [/objet\s*(du contrat|:)/i, /a pour objet/i] },
  { id: "prix", libelle: "Prix / contrepartie", obligatoire: true, patterns: [/prix/i, /tarif/i, /honoraires/i, /redevance/i, /\d+\s*(fcfa|xof|euro)/i] },
  { id: "duree", libelle: "Duree", obligatoire: true, patterns: [/duree\s*(du contrat|:)/i, /\d+\s*(mois|annee|an)/i, /effet\s*du/i] },
  { id: "juridiction", libelle: "Juridiction competente", obligatoire: true, patterns: [/juridiction/i, /tribunal/i, /competence des/i, /loi applicable/i] },
  { id: "resiliation", libelle: "Resiliation", obligatoire: true, patterns: [/resiliation/i, /resilier/i, /denonciation/i, /termin(er|aison)/i] },
  { id: "force_majeure", libelle: "Force majeure", obligatoire: false, patterns: [/force majeure/i, /cas fortuit/i] },
  { id: "confidentialite", libelle: "Confidentialite", obligatoire: false, patterns: [/confidentiel/i, /non-divulgation/i, /secret/i] },
  { id: "rgpd", libelle: "RGPD / Donnees personnelles", obligatoire: false, patterns: [/rgpd/i, /donnees personnelles/i, /protection des donnees/i] },
];

const SUSPICIOUS_PATTERNS: { id: string; libelle: string; pattern: RegExp; severity: "warning" | "critical" }[] = [
  { id: "penalite_excessive", libelle: "Penalite potentiellement excessive (>50%)", pattern: /penalite.*[5-9]\d\s*%/i, severity: "warning" },
  { id: "exclusivite_eternelle", libelle: "Exclusivite sans limite de duree", pattern: /exclusivit[ée].{0,80}(perpetuelle|sans limite|illimit[ée])/i, severity: "critical" },
  { id: "renouvellement_tacite_long", libelle: "Renouvellement tacite > 12 mois", pattern: /renouvel.*?(2|3|4|5|6|7|8|9|10|24|36)\s*(an|annee|mois)/i, severity: "warning" },
  { id: "pas_de_resiliation", libelle: "Resiliation impossible / unilaterale", pattern: /resiliation\s+(impossible|interdite|exclusivement par)/i, severity: "critical" },
];

export function analyzeContractClauses(args: { contract_text: string }): {
  ok: boolean;
  clauses_presentes: { id: string; libelle: string; obligatoire: boolean; trouvee: boolean; extracts?: string[] }[];
  clauses_manquantes_obligatoires: string[];
  clauses_manquantes_recommandees: string[];
  clauses_suspectes: { id: string; libelle: string; severity: "warning" | "critical"; extract?: string }[];
  score_completude: number;        // 0-100
  recommendations: string[];
} {
  const text = args.contract_text;
  const presentes: any[] = [];
  const manquantesObl: string[] = [];
  const manquantesReco: string[] = [];
  const suspectes: any[] = [];

  for (const c of CLAUSES_PATTERNS) {
    const extracts: string[] = [];
    for (const p of c.patterns) {
      const m = text.match(p);
      if (m) extracts.push(m[0].slice(0, 100));
    }
    const found = extracts.length > 0;
    presentes.push({ id: c.id, libelle: c.libelle, obligatoire: c.obligatoire, trouvee: found, extracts: found ? extracts : undefined });
    if (!found) {
      if (c.obligatoire) manquantesObl.push(c.libelle);
      else manquantesReco.push(c.libelle);
    }
  }

  for (const s of SUSPICIOUS_PATTERNS) {
    const m = text.match(s.pattern);
    if (m) {
      suspectes.push({ id: s.id, libelle: s.libelle, severity: s.severity, extract: m[0].slice(0, 120) });
    }
  }

  const obligatoires = CLAUSES_PATTERNS.filter(c => c.obligatoire);
  const obligatoiresOk = presentes.filter(p => p.obligatoire && p.trouvee).length;
  const score = Math.round((obligatoiresOk / obligatoires.length) * 100);

  const recs: string[] = [];
  if (manquantesObl.length > 0) recs.push(`Ajouter clauses essentielles manquantes : ${manquantesObl.join(", ")}`);
  if (manquantesReco.length > 0) recs.push(`Recommande d'ajouter : ${manquantesReco.join(", ")}`);
  for (const s of suspectes) {
    if (s.severity === "critical") recs.push(`URGENT : revoir la clause ${s.id} — ${s.libelle}`);
    else recs.push(`Verifier la clause ${s.id} — ${s.libelle}`);
  }
  if (recs.length === 0) recs.push("Contrat conforme aux clauses-types. Validation juridique recommandee avant signature.");

  return {
    ok: true,
    clauses_presentes: presentes,
    clauses_manquantes_obligatoires: manquantesObl,
    clauses_manquantes_recommandees: manquantesReco,
    clauses_suspectes: suspectes,
    score_completude: score,
    recommendations: recs,
  };
}
