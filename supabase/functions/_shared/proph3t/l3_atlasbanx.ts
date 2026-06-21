// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — L3 : ATLASBANX (Audit d'anomalies de relevés bancaires CEMAC/UEMOA)
// ═══════════════════════════════════════════════════════════════════════════
// Aligné sur le registry proph3t_apps : domaine FINANCE_AUDIT, mode strict.
// AtlasBanx (codename Scrutix) détecte les anomalies des relevés bancaires :
// frais dupliqués, ghost fees, surfacturations, erreurs d'intérêts. 5 tools de
// détection statistique : loi de Benford, Z-score, ghost fees, score de risque
// global, rapport d'audit. (Les anciens tools « opérations crédit/virements »
// étaient hors-métier — voir audit 360° §Uniformité.)
// ═══════════════════════════════════════════════════════════════════════════

import { formatMoneyFcfa } from "./calculators.ts";

/**
 * Loi de Benford sur le premier chiffre significatif des montants. Détecte les
 * distributions anormales (saisies manuelles, fraude). Seuil de conformité basé
 * sur le MAD (Mean Absolute Deviation, Nigrini).
 */
export function applyBenfordAnalysis(args: {
  montants: number[];
}): {
  ok: boolean;
  n: number;
  distribution: { chiffre: number; observe_pct: number; attendu_pct: number; ecart_pct: number }[];
  mad: number;
  conformite: "conforme" | "acceptable" | "non_conforme" | "suspect";
  message: string;
} {
  const compte = [0, 0, 0, 0, 0, 0, 0, 0, 0]; // chiffres 1..9
  let n = 0;
  for (const m of args.montants) {
    const v = Math.abs(m);
    if (v < 1) continue;
    const s = Math.floor(v).toString();
    const d = parseInt(s[0], 10);
    if (d >= 1 && d <= 9) { compte[d - 1]++; n++; }
  }

  const distribution: { chiffre: number; observe_pct: number; attendu_pct: number; ecart_pct: number }[] = [];
  let sommeEcart = 0;
  for (let d = 1; d <= 9; d++) {
    const attendu = Math.log10(1 + 1 / d) * 100;
    const observe = n > 0 ? (compte[d - 1] / n) * 100 : 0;
    const ecart = observe - attendu;
    sommeEcart += Math.abs(ecart) / 100; // MAD en proportion
    distribution.push({
      chiffre: d,
      observe_pct: Math.round(observe * 100) / 100,
      attendu_pct: Math.round(attendu * 100) / 100,
      ecart_pct: Math.round(ecart * 100) / 100,
    });
  }
  const mad = n > 0 ? sommeEcart / 9 : 0;

  // Seuils Nigrini : <0.006 conforme, <0.012 acceptable, <0.015 marginal, sinon non-conforme.
  const conformite: "conforme" | "acceptable" | "non_conforme" | "suspect" =
    n < 30 ? "suspect"
      : mad < 0.006 ? "conforme"
        : mad < 0.012 ? "acceptable"
          : mad < 0.015 ? "non_conforme"
            : "suspect";

  const message = n < 30
    ? `Échantillon trop faible (${n} montants) — Benford non significatif (min 30)`
    : `MAD = ${mad.toFixed(4)} → distribution ${conformite}`;

  return { ok: true, n, distribution, mad: Math.round(mad * 10000) / 10000, conformite, message };
}

/**
 * Z-score sur une série d'opérations : isole les montants statistiquement
 * aberrants (|z| > seuil).
 */
export function computeZscoreAnomalies(args: {
  operations: { id: string; montant: number; libelle?: string }[];
  seuil_z?: number;
}): {
  ok: boolean;
  n: number;
  moyenne: number;
  ecart_type: number;
  seuil_z: number;
  anomalies: { id: string; montant: number; z_score: number; severite: "warning" | "critical"; libelle?: string }[];
} {
  const seuil = args.seuil_z ?? 3;
  const n = args.operations.length;
  const vals = args.operations.map((o) => o.montant);
  const moyenne = n > 0 ? vals.reduce((a, b) => a + b, 0) / n : 0;
  const variance = n > 0 ? vals.reduce((a, b) => a + (b - moyenne) ** 2, 0) / n : 0;
  const ecartType = Math.sqrt(variance);

  const anomalies = ecartType === 0
    ? []
    : args.operations
        .map((o) => {
          const z = (o.montant - moyenne) / ecartType;
          return { id: o.id, montant: o.montant, z_score: Math.round(z * 100) / 100, severite: (Math.abs(z) > seuil + 2 ? "critical" : "warning") as "warning" | "critical", libelle: o.libelle };
        })
        .filter((a) => Math.abs(a.z_score) > seuil);

  return {
    ok: true,
    n,
    moyenne: Math.round(moyenne * 100) / 100,
    ecart_type: Math.round(ecartType * 100) / 100,
    seuil_z: seuil,
    anomalies,
  };
}

/**
 * Détecte les « ghost fees » : frais dupliqués (même date/libellé/montant),
 * surfacturations (montant > grille tarifaire), récurrences anormales.
 */
export function detectGhostFees(args: {
  frais: { id: string; date: string; libelle: string; montant_centimes: string | bigint }[];
  grille_attendue?: { libelle: string; montant_max_centimes: string | bigint }[];
}): {
  ok: boolean;
  ghost_fees: { id: string; type: "doublon" | "hors_grille" | "recurrence_anormale"; montant_centimes: string; raison: string }[];
  total_suspect_centimes: string;
  total_suspect_formatted: string;
  nb_anomalies: number;
} {
  const ghost: { id: string; type: "doublon" | "hors_grille" | "recurrence_anormale"; montant_centimes: string; raison: string }[] = [];
  const flagged = new Set<string>();

  const norm = (s: string) => s.trim().toLowerCase();
  const grille = new Map<string, bigint>();
  for (const g of args.grille_attendue ?? []) grille.set(norm(g.libelle), BigInt(g.montant_max_centimes));

  // Doublons exacts : même date + libellé + montant.
  const vus = new Map<string, string>();
  for (const f of args.frais) {
    const key = `${f.date}|${norm(f.libelle)}|${BigInt(f.montant_centimes).toString()}`;
    if (vus.has(key)) {
      ghost.push({ id: f.id, type: "doublon", montant_centimes: BigInt(f.montant_centimes).toString(), raison: `Doublon de ${vus.get(key)} (même date/libellé/montant)` });
      flagged.add(f.id);
    } else {
      vus.set(key, f.id);
    }
  }

  // Hors grille tarifaire.
  for (const f of args.frais) {
    if (flagged.has(f.id)) continue;
    const max = grille.get(norm(f.libelle));
    const montant = BigInt(f.montant_centimes);
    if (max !== undefined && montant > max) {
      ghost.push({ id: f.id, type: "hors_grille", montant_centimes: (montant - max).toString(), raison: `Surfacturation : ${formatMoneyFcfa(montant)} > plafond ${formatMoneyFcfa(max)}` });
      flagged.add(f.id);
    }
  }

  // Récurrence anormale : même libellé prélevé > 1 fois sur la période (hors grille connue).
  const compteLibelle = new Map<string, number>();
  for (const f of args.frais) {
    if (flagged.has(f.id)) continue;
    compteLibelle.set(norm(f.libelle), (compteLibelle.get(norm(f.libelle)) ?? 0) + 1);
  }
  for (const f of args.frais) {
    if (flagged.has(f.id)) continue;
    const c = compteLibelle.get(norm(f.libelle)) ?? 0;
    if (c >= 3 && !grille.has(norm(f.libelle))) {
      ghost.push({ id: f.id, type: "recurrence_anormale", montant_centimes: BigInt(f.montant_centimes).toString(), raison: `Frais « ${f.libelle} » prélevé ${c}× sur la période — vérifier la justification` });
      flagged.add(f.id);
    }
  }

  let total = 0n;
  for (const g of ghost) total += BigInt(g.montant_centimes);

  return {
    ok: true,
    ghost_fees: ghost,
    total_suspect_centimes: total.toString(),
    total_suspect_formatted: formatMoneyFcfa(total),
    nb_anomalies: ghost.length,
  };
}

/**
 * Agrège les détecteurs en un score de risque global 0-100 par compte/client.
 */
export function scoreBankRiskGlobal(args: {
  nb_anomalies_benford: number;
  nb_anomalies_zscore: number;
  nb_ghost_fees: number;
  montant_suspect_centimes: string | bigint;
  montant_total_centimes: string | bigint;
  nb_operations: number;
}): {
  ok: boolean;
  score_risque: number;
  niveau: "faible" | "modere" | "eleve" | "critique";
  ratio_montant_suspect_pct: number;
  recommandations: string[];
} {
  const total = Number(BigInt(args.montant_total_centimes));
  const suspect = Number(BigInt(args.montant_suspect_centimes));
  const ratio = total > 0 ? (suspect / total) * 100 : 0;
  const ops = Math.max(1, args.nb_operations);

  let score = 0;
  score += Math.min(25, (args.nb_anomalies_benford / ops) * 100 * 5);
  score += Math.min(20, (args.nb_anomalies_zscore / ops) * 100 * 4);
  score += Math.min(30, args.nb_ghost_fees * 6);
  score += Math.min(25, ratio * 2.5);
  score = Math.round(Math.min(100, score));

  const niveau: "faible" | "modere" | "eleve" | "critique" =
    score >= 75 ? "critique" : score >= 50 ? "eleve" : score >= 25 ? "modere" : "faible";

  const recos: string[] = [];
  if (args.nb_ghost_fees > 0) recos.push(`${args.nb_ghost_fees} ghost fee(s) détecté(s) — réclamer le remboursement à la banque`);
  if (ratio > 5) recos.push(`Montant suspect = ${ratio.toFixed(1)}% du total — diligence approfondie requise`);
  if (args.nb_anomalies_benford > 0) recos.push("Distribution de Benford anormale — contrôler les saisies manuelles / écritures forcées");
  if (niveau === "critique") recos.push("Risque critique — escalade au commissaire aux comptes / direction financière");

  return {
    ok: true,
    score_risque: score,
    niveau,
    ratio_montant_suspect_pct: Math.round(ratio * 100) / 100,
    recommandations: recos,
  };
}

/**
 * Génère un rapport d'audit des anomalies (format SYSCOHADA, prêt à signer).
 */
export function generateAuditReportAnomalies(args: {
  client: string;
  periode: string;
  banque?: string;
  score_risque: number;
  anomalies: { type: string; description: string; montant_centimes?: string | bigint; severite?: "info" | "warning" | "critical" }[];
}): {
  ok: boolean;
  rapport_markdown: string;
  nb_anomalies: number;
  nb_critiques: number;
  montant_total_anomalies_centimes: string;
} {
  const nbCritiques = args.anomalies.filter((a) => a.severite === "critical").length;
  let total = 0n;
  for (const a of args.anomalies) if (a.montant_centimes !== undefined) total += BigInt(a.montant_centimes);

  const lignes = args.anomalies
    .map((a, i) => {
      const sev = a.severite === "critical" ? "🔴" : a.severite === "warning" ? "🟠" : "🔵";
      const montant = a.montant_centimes !== undefined ? ` — ${formatMoneyFcfa(BigInt(a.montant_centimes))}` : "";
      return `${i + 1}. ${sev} **${a.type}** — ${a.description}${montant}`;
    })
    .join("\n");

  const md = `# Rapport d'audit bancaire — ${args.client}

**Période auditée :** ${args.periode}${args.banque ? `  ·  **Banque :** ${args.banque}` : ""}
**Score de risque global :** ${args.score_risque}/100

## Anomalies détectées (${args.anomalies.length})
${lignes || "_Aucune anomalie détectée sur la période._"}

## Synthèse
- Anomalies critiques : ${nbCritiques}
- Montant total des anomalies : ${formatMoneyFcfa(total)}

> Rapport généré par AtlasBanx (18 détecteurs statistiques + IA). Décision finale : votre responsabilité, validation expert-comptable recommandée.`;

  return {
    ok: true,
    rapport_markdown: md,
    nb_anomalies: args.anomalies.length,
    nb_critiques: nbCritiques,
    montant_total_anomalies_centimes: total.toString(),
  };
}
