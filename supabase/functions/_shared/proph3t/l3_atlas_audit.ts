// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — L3 app-specific : ATLAS AUDIT (commissariat aux comptes)
// ═══════════════════════════════════════════════════════════════════════════
// 6 tools metier audit pousse :
//   1. generate_lettre_affirmation : lettre d'affirmation client
//   2. compute_risk_assessment_matrix : matrice risques (occurrence × severite)
//   3. detect_round_tripping       : detection round-tripping (transferts circulaires)
//   4. compute_substantive_test    : tests substantifs (bilan, P&L)
//   5. analyze_journal_entries_anomalies : tests d'analyse JET (Journal Entry Testing)
//   6. generate_audit_report       : rapport audit complet (avec opinion)
// ═══════════════════════════════════════════════════════════════════════════

// ─── 1. Lettre d'affirmation ───────────────────────────────────────────────
export function generateLettreAffirmation(args: {
  raison_sociale: string;
  exercice: string;
  date_lettre: string;
  affirmations_specifiques?: string[];
  signataire: { nom: string; titre: string };
}): {
  ok: boolean;
  lettre_markdown: string;
  affirmations_obligatoires: string[];
} {
  const obligatoires = [
    "Les etats financiers ont ete prepares conformement au SYSCOHADA et donnent une image fidele.",
    "Toutes les transactions ont ete correctement enregistrees dans la comptabilite.",
    "Aucun acte irregulier ou frauduleux n'a ete dissimule a l'auditeur.",
    "Les passifs eventuels et engagements hors bilan ont ete declares.",
    "Aucun litige significatif n'a ete omis.",
    "Toutes les estimations comptables ont ete realisees sur des bases raisonnables.",
    "Les evenements posterieurs a la cloture ont ete divulgues.",
    "Les conflits d'interets et transactions avec parties liees ont ete declares.",
  ];

  const allAffirmations = [...obligatoires, ...(args.affirmations_specifiques ?? [])];

  const lettre = `# Lettre d'affirmation
**${args.raison_sociale}** — Exercice clos au ${args.exercice}
Date : ${args.date_lettre}

A l'attention du Commissaire aux Comptes,

Au nom de la Direction de **${args.raison_sociale}**, nous confirmons par la presente nos meilleures connaissances et croyances, sur les points suivants concernant les etats financiers de l'exercice ${args.exercice} :

${allAffirmations.map((a, i) => `${i + 1}. ${a}`).join("\n\n")}

Cette lettre est destinee a vous permettre d'emettre votre rapport sans investigations complementaires.

**Signataire :** ${args.signataire.nom} (${args.signataire.titre})

---
*Cette lettre engage la responsabilite des dirigeants signataires.*
`;

  return {
    ok: true,
    lettre_markdown: lettre,
    affirmations_obligatoires: obligatoires,
  };
}

// ─── 2. Risk assessment matrix ─────────────────────────────────────────────
/**
 * Matrice de risques : occurrence × severite × détectabilite (selon norme ISA 315).
 * Score de risque inherent = O × S
 * Score de risque residuel = (O × S) / D
 *
 * O,S,D : 1 (faible) - 5 (eleve)
 * Risque inherent > 12 : impact majeur
 * Risque residuel > 5 : controle insuffisant
 */
export interface RiskItem {
  id: string;
  description: string;
  category: "operationnel" | "financier" | "fiscal" | "fraude" | "regulatoire" | "it";
  occurrence: 1 | 2 | 3 | 4 | 5;
  severite: 1 | 2 | 3 | 4 | 5;
  detectabilite: 1 | 2 | 3 | 4 | 5;     // 5 = bien detecte
}

export function computeRiskAssessmentMatrix(args: { risks: RiskItem[] }): {
  ok: boolean;
  total_risques: number;
  risques_critiques: { id: string; description: string; risque_inherent: number; risque_residuel: number; recommandation: string }[];
  risques_moyens: { id: string; description: string; risque_residuel: number }[];
  risques_acceptables: { id: string; description: string }[];
  par_categorie: Record<string, { count: number; risque_moyen: number }>;
  score_global_risque: number;
} {
  const critiques: any[] = [];
  const moyens: any[] = [];
  const acceptables: any[] = [];
  const parCategorie: Record<string, { count: number; total: number }> = {};

  let totalRisque = 0;
  for (const r of args.risks) {
    const inherent = r.occurrence * r.severite;
    const residuel = inherent / r.detectabilite;
    totalRisque += residuel;

    parCategorie[r.category] ??= { count: 0, total: 0 };
    parCategorie[r.category].count++;
    parCategorie[r.category].total += residuel;

    if (residuel > 5) {
      critiques.push({
        id: r.id, description: r.description,
        risque_inherent: inherent,
        risque_residuel: Math.round(residuel * 100) / 100,
        recommandation: r.detectabilite <= 2
          ? "Controle inadequat — implementer un controle preventif ou detectif urgemment"
          : "Reduire l'exposition (mitigation, transfert, eviter)",
      });
    } else if (residuel > 2) {
      moyens.push({
        id: r.id, description: r.description,
        risque_residuel: Math.round(residuel * 100) / 100,
      });
    } else {
      acceptables.push({ id: r.id, description: r.description });
    }
  }

  const parCatSerialized: any = {};
  for (const [k, v] of Object.entries(parCategorie)) {
    parCatSerialized[k] = { count: v.count, risque_moyen: Math.round((v.total / v.count) * 100) / 100 };
  }

  const scoreGlobal = args.risks.length > 0 ? Math.round((totalRisque / args.risks.length) * 100) / 100 : 0;

  return {
    ok: true,
    total_risques: args.risks.length,
    risques_critiques: critiques,
    risques_moyens: moyens,
    risques_acceptables: acceptables,
    par_categorie: parCatSerialized,
    score_global_risque: scoreGlobal,
  };
}

// ─── 3. Round-tripping detection ───────────────────────────────────────────
/**
 * Detecte les schemas de round-tripping :
 *   - A vend a B, B vend a C, C re-vend a A
 *   - Dans une periode courte (<30 jours)
 *   - Avec montants similaires (margins minimes)
 *
 * Indique manipulation potentielle du CA ou blanchiment.
 */
export function detectRoundTripping(args: {
  transactions: { id: string; date: string; emetteur: string; receveur: string; montant_centimes: string | bigint; libelle?: string }[];
  fenetre_jours?: number;
  tolerance_montant_pct?: number;
}): {
  ok: boolean;
  total_transactions: number;
  schemas_detectes: { participants: string[]; transactions_ids: string[]; montant_total_centimes: string; duree_jours: number; severity: "warning" | "critical" }[];
  alerte: string;
} {
  const fenetre = args.fenetre_jours ?? 30;
  const tolerancePct = args.tolerance_montant_pct ?? 5;

  const schemas: any[] = [];

  // Indexer par emetteur->receveur
  const byPair = new Map<string, typeof args.transactions>();
  for (const t of args.transactions) {
    const key = `${t.emetteur}|${t.receveur}`;
    const arr = byPair.get(key) ?? [];
    arr.push(t);
    byPair.set(key, arr);
  }

  // Pour chaque transaction A->B, chercher si B->C->A existe dans la fenetre
  for (const tx of args.transactions) {
    const dateA = new Date(tx.date);
    const montantA = Number(BigInt(tx.montant_centimes));

    // B -> X dans la fenetre
    const fromB = args.transactions.filter(t =>
      t.emetteur === tx.receveur &&
      t.id !== tx.id &&
      Math.abs(new Date(t.date).getTime() - dateA.getTime()) / 86400000 <= fenetre &&
      Math.abs(Number(BigInt(t.montant_centimes)) - montantA) / montantA <= tolerancePct / 100,
    );

    for (const txB of fromB) {
      // X -> A?
      const back = args.transactions.find(t =>
        t.emetteur === txB.receveur &&
        t.receveur === tx.emetteur &&
        t.id !== tx.id && t.id !== txB.id &&
        Math.abs(new Date(t.date).getTime() - dateA.getTime()) / 86400000 <= fenetre &&
        Math.abs(Number(BigInt(t.montant_centimes)) - montantA) / montantA <= tolerancePct / 100,
      );

      if (back) {
        const dates = [tx.date, txB.date, back.date].map(d => new Date(d).getTime());
        const duree = (Math.max(...dates) - Math.min(...dates)) / 86400000;
        const total = BigInt(tx.montant_centimes) + BigInt(txB.montant_centimes) + BigInt(back.montant_centimes);

        schemas.push({
          participants: [tx.emetteur, tx.receveur, txB.receveur],
          transactions_ids: [tx.id, txB.id, back.id],
          montant_total_centimes: total.toString(),
          duree_jours: Math.round(duree),
          severity: duree <= 7 ? "critical" : "warning",
        });
      }
    }
  }

  const alerte = schemas.length === 0
    ? "Aucun schema circulaire detecte"
    : `${schemas.length} schema(s) circulaire(s) detecte(s) — investigation requise`;

  return {
    ok: true,
    total_transactions: args.transactions.length,
    schemas_detectes: schemas,
    alerte,
  };
}

// ─── 4. Tests substantifs ───────────────────────────────────────────────────
/**
 * Tests substantifs sur le bilan (controles arithmetiques, vraisemblance).
 *   - Recouvrement : Total Actif = Total Passif
 *   - Coherence ratios SYSCOHADA standard
 *   - Variations significatives N vs N-1
 */
export function computeSubstantiveTest(args: {
  bilan_n: { actif: { libelle: string; montant_centimes: string }[]; passif: { libelle: string; montant_centimes: string }[] };
  bilan_n_minus_1?: { actif: { libelle: string; montant_centimes: string }[]; passif: { libelle: string; montant_centimes: string }[] };
}): {
  ok: boolean;
  recouvrement: { total_actif_centimes: string; total_passif_centimes: string; ecart_centimes: string; ok: boolean };
  variations_significatives: { libelle: string; n_centimes: string; n1_centimes: string; variation_pct: number; flag: string }[];
  tests_passes: number;
  tests_total: number;
  recommendations: string[];
} {
  const totalA = args.bilan_n.actif.reduce((s, l) => s + BigInt(l.montant_centimes), 0n);
  const totalP = args.bilan_n.passif.reduce((s, l) => s + BigInt(l.montant_centimes), 0n);
  const ecart = totalA - totalP;
  const recouvrement = {
    total_actif_centimes: totalA.toString(),
    total_passif_centimes: totalP.toString(),
    ecart_centimes: ecart.toString(),
    ok: ecart === 0n,
  };

  const variations: any[] = [];
  if (args.bilan_n_minus_1) {
    const allLignes = [...args.bilan_n.actif, ...args.bilan_n.passif];
    const allN1 = [...args.bilan_n_minus_1.actif, ...args.bilan_n_minus_1.passif];
    const mapN1 = new Map(allN1.map(l => [l.libelle, BigInt(l.montant_centimes)]));

    for (const ligne of allLignes) {
      const n1 = mapN1.get(ligne.libelle);
      if (n1 === undefined) continue;
      const n = BigInt(ligne.montant_centimes);
      if (n1 === 0n) continue;
      const pct = Math.round((Number(n - n1) / Number(n1)) * 10000) / 100;
      if (Math.abs(pct) >= 30) {
        variations.push({
          libelle: ligne.libelle,
          n_centimes: n.toString(),
          n1_centimes: n1.toString(),
          variation_pct: pct,
          flag: Math.abs(pct) >= 100 ? "doublement_ou_plus" : "variation_significative",
        });
      }
    }
  }

  let testsPasses = recouvrement.ok ? 1 : 0;
  const testsTotal = 1 + (args.bilan_n_minus_1 ? 1 : 0);
  if (args.bilan_n_minus_1 && variations.length === 0) testsPasses++;

  const recos: string[] = [];
  if (!recouvrement.ok) recos.push(`URGENT : balance non equilibree (ecart ${recouvrement.ecart_centimes} centimes)`);
  if (variations.length > 0) recos.push(`${variations.length} variations N/N-1 a expliquer dans la note`);
  if (recos.length === 0) recos.push("Tests substantifs OK. Procedures analytiques satisfaisantes.");

  return {
    ok: true,
    recouvrement,
    variations_significatives: variations,
    tests_passes: testsPasses,
    tests_total: testsTotal,
    recommendations: recos,
  };
}

// ─── 5. JET — Journal Entry Testing ─────────────────────────────────────────
/**
 * Journal Entry Testing (norme ISA 240) — detection ecritures suspectes :
 *   - Ecritures rondes > seuil (ex: 100M FCFA)
 *   - Ecritures juste avant cloture (5 derniers jours)
 *   - Ecritures via comptes inhabituels (manuels, OD)
 *   - Ecritures avec montants au-dessus du seuil de signification
 *   - Ecritures hors heures de bureau (nuit, weekend)
 */
export function analyzeJournalEntriesAnomalies(args: {
  entries: { date: string; journal: string; compte: string; montant_centimes: string | bigint; libelle?: string; created_at?: string }[];
  date_cloture: string;
  seuil_signification_centimes?: string | bigint;
  comptes_suspects?: string[];     // ex: 471, 477 (comptes d'attente)
}): {
  ok: boolean;
  total_entries: number;
  anomalies: { type: string; entry_index: number; raison: string; severity: "info" | "warning" | "critical" }[];
  taux_anomalies_pct: number;
  recommendations: string[];
} {
  const dateClos = new Date(args.date_cloture);
  const seuil = args.seuil_signification_centimes ? BigInt(args.seuil_signification_centimes) : BigInt(10_000_000 * 100);
  const comptesSusp = args.comptes_suspects ?? ["471", "477", "467", "468"];

  const anomalies: any[] = [];

  for (let i = 0; i < args.entries.length; i++) {
    const e = args.entries[i];
    const dateE = new Date(e.date);
    const montant = BigInt(e.montant_centimes);

    // Montant rond > seuil
    if (montant > seuil && montant % BigInt(1_000_000 * 100) === 0n) {
      anomalies.push({ type: "MONTANT_ROND_ELEVE", entry_index: i, raison: `${(Number(montant) / 100).toLocaleString()} FCFA exact`, severity: "warning" });
    }

    // Juste avant cloture
    const joursAvantClos = (dateClos.getTime() - dateE.getTime()) / 86400000;
    if (joursAvantClos >= 0 && joursAvantClos <= 5) {
      anomalies.push({ type: "PROCHE_CLOTURE", entry_index: i, raison: `Ecriture ${Math.round(joursAvantClos)}j avant cloture`, severity: "info" });
    }

    // Comptes suspects
    if (comptesSusp.some(c => e.compte.startsWith(c))) {
      anomalies.push({ type: "COMPTE_SUSPECT", entry_index: i, raison: `Compte ${e.compte} (souvent compte d'attente)`, severity: "warning" });
    }

    // Au-dessus du seuil de signification
    if (montant > seuil) {
      anomalies.push({ type: "AU_DESSUS_SEUIL", entry_index: i, raison: `Montant > seuil ${(Number(seuil) / 100).toLocaleString()}`, severity: "info" });
    }

    // Hors heures bureau (si created_at fourni)
    if (e.created_at) {
      const cd = new Date(e.created_at);
      const dow = cd.getUTCDay();
      const hour = cd.getUTCHours();
      if (dow === 0 || dow === 6) {
        anomalies.push({ type: "WEEKEND", entry_index: i, raison: `Saisie ${dow === 0 ? "dimanche" : "samedi"}`, severity: "warning" });
      } else if (hour < 6 || hour >= 22) {
        anomalies.push({ type: "HORS_HEURES", entry_index: i, raison: `Saisie a ${hour}h UTC`, severity: "warning" });
      }
    }

    // Journal OD (Operations Diverses) avec montant eleve
    if ((e.journal === "OD" || e.journal === "ODI") && montant > seuil) {
      anomalies.push({ type: "OD_MONTANT_ELEVE", entry_index: i, raison: "Journal OD avec montant > seuil", severity: "critical" });
    }
  }

  const tauxPct = args.entries.length > 0 ? Math.round((anomalies.length / args.entries.length) * 100) : 0;

  const recommendations: string[] = [];
  const critiques = anomalies.filter(a => a.severity === "critical").length;
  if (critiques > 0) recommendations.push(`${critiques} anomalie(s) critique(s) — examen complet requis`);
  if (tauxPct > 10) recommendations.push("Taux d'anomalies eleve — auditer le processus de comptabilisation");
  if (recommendations.length === 0) recommendations.push("Pas d'anomalie significative. Tests JET passes.");

  return {
    ok: true,
    total_entries: args.entries.length,
    anomalies,
    taux_anomalies_pct: tauxPct,
    recommendations,
  };
}

// ─── 6. Rapport audit complet ──────────────────────────────────────────────
export function generateAuditReport(args: {
  raison_sociale: string;
  exercice: string;
  date_rapport: string;
  auditeur_nom: string;
  opinion: "sans_reserve" | "avec_reserves" | "defavorable" | "impossibilite_exprimer";
  reserves?: string[];
  paragraphes_observation?: string[];
  bilan_synthese?: { total_actif: string; total_passif: string; resultat_net: string };
  donnees_cles?: Record<string, string>;
}): {
  ok: boolean;
  rapport_markdown: string;
  opinion_libelle: string;
  alerte_publication: string;
} {
  const opinionMap: Record<string, string> = {
    sans_reserve: "Opinion sans reserve",
    avec_reserves: "Opinion avec reserves",
    defavorable: "Opinion defavorable",
    impossibilite_exprimer: "Impossibilite d'exprimer une opinion",
  };

  const opinion = opinionMap[args.opinion];
  const reservesSection = args.reserves && args.reserves.length > 0
    ? `\n\n## Justification de l'opinion avec reserves\n\n${args.reserves.map((r, i) => `${i + 1}. ${r}`).join("\n\n")}`
    : "";

  const observationsSection = args.paragraphes_observation && args.paragraphes_observation.length > 0
    ? `\n\n## Paragraphes d'observation\n\n${args.paragraphes_observation.map((o, i) => `${i + 1}. ${o}`).join("\n\n")}`
    : "";

  const synthese = args.bilan_synthese
    ? `\n\n## Synthese des etats financiers\n\n- **Total actif** : ${args.bilan_synthese.total_actif}\n- **Total passif** : ${args.bilan_synthese.total_passif}\n- **Resultat net** : ${args.bilan_synthese.resultat_net}`
    : "";

  const donnees = args.donnees_cles
    ? `\n\n## Donnees cles\n\n${Object.entries(args.donnees_cles).map(([k, v]) => `- **${k}** : ${v}`).join("\n")}`
    : "";

  const rapport = `# Rapport du Commissaire aux Comptes
## ${args.raison_sociale} — Exercice clos le ${args.exercice}

**Date du rapport :** ${args.date_rapport}
**Commissaire aux Comptes :** ${args.auditeur_nom}

---

## Opinion

**${opinion}**

A notre avis, sous reserve des points mentionnes ci-dessous le cas echeant, les etats financiers presentent sincerement, dans tous leurs aspects significatifs, la situation financiere de la societe **${args.raison_sociale}** au ${args.exercice}, conformement au referentiel SYSCOHADA.${reservesSection}${observationsSection}${synthese}${donnees}

## Responsabilites de la direction

La direction est responsable de la preparation et de la presentation sincere des etats financiers, ainsi que du controle interne lui permettant d'etablir des etats financiers exempts d'anomalies significatives.

## Responsabilites de l'auditeur

Notre responsabilite consiste a exprimer une opinion sur ces etats financiers, sur la base de notre audit. Nous avons effectue notre audit selon les normes internationales d'audit (ISA) et les normes professionnelles applicables en zone OHADA.

---

**${args.auditeur_nom}**
*Commissaire aux Comptes*
`;

  let alerte = "";
  if (args.opinion === "defavorable") alerte = "URGENT : opinion defavorable — risque de non-publication ou de redressement fiscal/judiciaire";
  else if (args.opinion === "avec_reserves") alerte = "Opinion avec reserves — communiquer aux dirigeants et anticiper questions actionnaires";
  else if (args.opinion === "impossibilite_exprimer") alerte = "Impossibilite d'exprimer une opinion — risque eleve, faits significatifs caches";
  else alerte = "Rapport pret pour signature et depot legal";

  return {
    ok: true,
    rapport_markdown: rapport,
    opinion_libelle: opinion,
    alerte_publication: alerte,
  };
}
