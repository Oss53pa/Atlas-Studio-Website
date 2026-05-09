// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — Domain L2 : FINANCE / Comptabilite OHADA
// ═══════════════════════════════════════════════════════════════════════════
// 10 tools metier deterministes (TS pur) pour Phase 1 du CDC :
//
//   1. parse_grand_livre          : parse format XLSX/CSV grand livre SYSCOHADA
//   2. generate_balance_sheet     : produit le bilan (Actif/Passif) classe SYSCOHADA
//   3. generate_compte_resultat   : produit le compte de resultat
//   4. apply_benford_law          : detecte fraude/anomalies via Benford
//   5. reconcile_bank_statement   : rapprochement bancaire automatique
//   6. compute_irpp_uemoa         : calcule IRPP (impot sur le revenu) UEMOA
//   7. compute_is_uemoa           : calcule IS (impot sur les societes) UEMOA
//   8. compute_cnss_contribution  : calcule cotisations CNSS/CNPS
//   9. validate_journal_entry     : valide partie double + comptes SYSCOHADA
//  10. detect_accounting_anomalies : ecritures suspectes (montants ronds, weekend, etc.)
//
// Conformement au CDC §1.2 : argent en BIGINT centimes, formules deterministes.
// ═══════════════════════════════════════════════════════════════════════════

import { formatMoneyFcfa } from "./calculators.ts";

// ─── Types communs ─────────────────────────────────────────────────────────

export interface JournalEntry {
  date: string;                  // ISO YYYY-MM-DD
  numero_piece?: string;
  compte: string;                // ex: "411000", "601100"
  libelle: string;
  debit_centimes: bigint;
  credit_centimes: bigint;
  journal?: string;              // VE, AC, BQ, OD, etc.
  contrepartie?: string;
}

export interface Society {
  raison_sociale: string;
  forme_juridique?: string;      // SA, SARL, SAS, EI
  pays: "CI" | "SN" | "BF" | "ML" | "BJ" | "TG" | "NE" | "GW" | "CM" | "CG" | "GA" | "TD" | "CF";
  siege?: string;
  capital_centimes?: bigint;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. parse_grand_livre — parse texte CSV/JSON en JournalEntry[]
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Parse un grand livre depuis du texte CSV ou JSON.
 * Format CSV attendu (header) : date,piece,compte,libelle,debit,credit,journal
 * Montants : virgule francaise OK ("1 234,56"), interprete en CENTIMES x 100.
 */
export function parseGrandLivre(args: {
  format: "csv" | "json";
  content: string;
  decimal_separator?: "." | ",";
  thousand_separator?: " " | "." | "," | "";
}): { ok: boolean; entries: JournalEntry[]; errors: string[]; total_debit_centimes: string; total_credit_centimes: string; equilibre: boolean } {
  const errors: string[] = [];
  const entries: JournalEntry[] = [];
  const decimalSep = args.decimal_separator ?? ",";
  const thousandSep = args.thousand_separator ?? " ";

  const parseMoney = (raw: string): bigint => {
    if (!raw || raw.trim() === "") return 0n;
    let s = raw.trim();
    // Retire le separateur de milliers
    if (thousandSep) s = s.split(thousandSep).join("");
    // Normalise la virgule en point
    if (decimalSep === ",") s = s.replace(",", ".");
    const f = parseFloat(s);
    if (isNaN(f)) throw new Error(`Montant illisible: '${raw}'`);
    return BigInt(Math.round(f * 100));
  };

  try {
    if (args.format === "json") {
      const data = JSON.parse(args.content) as JournalEntry[];
      for (const r of data) {
        entries.push({
          date: r.date,
          numero_piece: r.numero_piece,
          compte: r.compte,
          libelle: r.libelle,
          debit_centimes: typeof r.debit_centimes === "string" ? BigInt(r.debit_centimes) : r.debit_centimes,
          credit_centimes: typeof r.credit_centimes === "string" ? BigInt(r.credit_centimes) : r.credit_centimes,
          journal: r.journal,
        });
      }
    } else {
      const lines = args.content.split(/\r?\n/).filter(l => l.trim() !== "");
      if (lines.length < 2) {
        return { ok: false, entries: [], errors: ["Pas assez de lignes (header + au moins 1 ligne)"], total_debit_centimes: "0", total_credit_centimes: "0", equilibre: true };
      }
      const header = lines[0].toLowerCase().split(/[;,\t]/).map(h => h.trim());
      const idx = (name: string) => header.findIndex(h => h.includes(name));
      const iDate = idx("date"), iCompte = idx("compte"), iLib = idx("libel"),
            iDeb = idx("debit"), iCred = idx("credit"), iPiece = idx("piece"), iJourn = idx("journal");
      if (iDate < 0 || iCompte < 0 || iDeb < 0 || iCred < 0) {
        return { ok: false, entries: [], errors: ["Header CSV invalide : besoin de date, compte, debit, credit"], total_debit_centimes: "0", total_credit_centimes: "0", equilibre: true };
      }
      for (let i = 1; i < lines.length; i++) {
        try {
          const cells = lines[i].split(/[;,\t]/).map(c => c.trim());
          entries.push({
            date: cells[iDate],
            compte: cells[iCompte],
            libelle: iLib >= 0 ? cells[iLib] : "",
            debit_centimes: parseMoney(cells[iDeb] ?? "0"),
            credit_centimes: parseMoney(cells[iCred] ?? "0"),
            numero_piece: iPiece >= 0 ? cells[iPiece] : undefined,
            journal: iJourn >= 0 ? cells[iJourn] : undefined,
          });
        } catch (e) {
          errors.push(`Ligne ${i + 1}: ${(e as Error).message}`);
        }
      }
    }
  } catch (e) {
    return { ok: false, entries: [], errors: [(e as Error).message], total_debit_centimes: "0", total_credit_centimes: "0", equilibre: true };
  }

  const totalDebit = entries.reduce((s, e) => s + e.debit_centimes, 0n);
  const totalCredit = entries.reduce((s, e) => s + e.credit_centimes, 0n);

  return {
    ok: true,
    entries: entries.map(e => ({ ...e, debit_centimes: e.debit_centimes, credit_centimes: e.credit_centimes })),
    errors,
    total_debit_centimes: totalDebit.toString(),
    total_credit_centimes: totalCredit.toString(),
    equilibre: totalDebit === totalCredit,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. generate_balance_sheet — Bilan SYSCOHADA classe par grandes masses
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Aggrege les soldes par classe SYSCOHADA et produit le Bilan (Actif/Passif).
 * Plan SYSCOHADA :
 *   Classe 1 : Capitaux propres et ressources assimilees
 *   Classe 2 : Immobilisations
 *   Classe 3 : Stocks
 *   Classe 4 : Tiers (411=clients, 401=fournisseurs, 42-44=fisc/social)
 *   Classe 5 : Tresorerie (50=banques, 57=caisse)
 */
export function generateBalanceSheet(args: {
  entries: JournalEntry[] | { compte: string; debit_centimes: string | bigint; credit_centimes: string | bigint }[];
  exercice: string;            // 'YYYY'
  raison_sociale: string;
}): {
  ok: boolean;
  exercice: string;
  raison_sociale: string;
  actif: { immobilisations_centimes: string; stocks_centimes: string; creances_centimes: string; tresorerie_actif_centimes: string; total_centimes: string };
  passif: { capitaux_propres_centimes: string; dettes_financieres_centimes: string; dettes_circulantes_centimes: string; tresorerie_passif_centimes: string; total_centimes: string };
  ecart_centimes: string;
  equilibre: boolean;
} {
  const soldes = new Map<string, bigint>();
  for (const e of args.entries) {
    const debit = typeof e.debit_centimes === "string" ? BigInt(e.debit_centimes) : e.debit_centimes;
    const credit = typeof e.credit_centimes === "string" ? BigInt(e.credit_centimes) : e.credit_centimes;
    const compte = e.compte;
    soldes.set(compte, (soldes.get(compte) ?? 0n) + debit - credit);
  }

  const sumByPrefix = (prefix: string, sign: 1 | -1 = 1): bigint => {
    let total = 0n;
    for (const [compte, solde] of soldes) {
      if (compte.startsWith(prefix)) {
        total += sign === 1 ? solde : -solde;
      }
    }
    return total;
  };

  // Actif (soldes debiteurs)
  const immo = sumByPrefix("2");                              // Classe 2
  const stocks = sumByPrefix("3");                            // Classe 3
  const creances = sumByPrefix("41") + sumByPrefix("42") + sumByPrefix("43") + sumByPrefix("44") + sumByPrefix("47");  // 4xx debiteur
  const tresoActif = sumByPrefix("50") + sumByPrefix("52") + sumByPrefix("57");  // banques + caisse

  // Passif (soldes crediteurs)
  const cp = sumByPrefix("1", -1);                            // Classe 1 (sens credit)
  const dettesFin = sumByPrefix("16", -1) + sumByPrefix("17", -1);  // Emprunts
  const dettesCirc = sumByPrefix("40", -1) + sumByPrefix("42", -1) + sumByPrefix("43", -1) + sumByPrefix("44", -1);
  const tresoPassif = sumByPrefix("56", -1);  // Decouverts

  const totalActif = immo + stocks + creances + tresoActif;
  const totalPassif = cp + dettesFin + dettesCirc + tresoPassif;
  const ecart = totalActif - totalPassif;

  return {
    ok: true,
    exercice: args.exercice,
    raison_sociale: args.raison_sociale,
    actif: {
      immobilisations_centimes: immo.toString(),
      stocks_centimes: stocks.toString(),
      creances_centimes: creances.toString(),
      tresorerie_actif_centimes: tresoActif.toString(),
      total_centimes: totalActif.toString(),
    },
    passif: {
      capitaux_propres_centimes: cp.toString(),
      dettes_financieres_centimes: dettesFin.toString(),
      dettes_circulantes_centimes: dettesCirc.toString(),
      tresorerie_passif_centimes: tresoPassif.toString(),
      total_centimes: totalPassif.toString(),
    },
    ecart_centimes: ecart.toString(),
    equilibre: ecart === 0n,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. generate_compte_resultat — Charges (classe 6) / Produits (classe 7)
// ═══════════════════════════════════════════════════════════════════════════
export function generateCompteResultat(args: {
  entries: JournalEntry[] | { compte: string; debit_centimes: string | bigint; credit_centimes: string | bigint }[];
  exercice: string;
  raison_sociale: string;
}): {
  ok: boolean;
  exercice: string;
  raison_sociale: string;
  produits: { exploitation_centimes: string; financiers_centimes: string; total_centimes: string };
  charges: { achats_centimes: string; personnel_centimes: string; impots_taxes_centimes: string; dotations_centimes: string; financieres_centimes: string; total_centimes: string };
  resultat_net_centimes: string;
} {
  const soldes = new Map<string, bigint>();
  for (const e of args.entries) {
    const debit = typeof e.debit_centimes === "string" ? BigInt(e.debit_centimes) : e.debit_centimes;
    const credit = typeof e.credit_centimes === "string" ? BigInt(e.credit_centimes) : e.credit_centimes;
    soldes.set(e.compte, (soldes.get(e.compte) ?? 0n) + debit - credit);
  }
  const sumByPrefix = (prefix: string, signCredit: boolean): bigint => {
    let total = 0n;
    for (const [compte, solde] of soldes) {
      if (compte.startsWith(prefix)) total += signCredit ? -solde : solde;
    }
    return total;
  };

  // Produits (classe 7) : sens credit
  const prodExpl = sumByPrefix("70", true) + sumByPrefix("71", true) + sumByPrefix("72", true) + sumByPrefix("75", true);
  const prodFin = sumByPrefix("77", true);
  const totalProduits = prodExpl + prodFin;

  // Charges (classe 6) : sens debit
  const achats = sumByPrefix("60", false) + sumByPrefix("61", false) + sumByPrefix("62", false);
  const personnel = sumByPrefix("66", false);
  const impotsTaxes = sumByPrefix("64", false);
  const dotations = sumByPrefix("68", false);
  const chFin = sumByPrefix("67", false);
  const totalCharges = achats + personnel + impotsTaxes + dotations + chFin;

  const resultatNet = totalProduits - totalCharges;

  return {
    ok: true,
    exercice: args.exercice,
    raison_sociale: args.raison_sociale,
    produits: {
      exploitation_centimes: prodExpl.toString(),
      financiers_centimes: prodFin.toString(),
      total_centimes: totalProduits.toString(),
    },
    charges: {
      achats_centimes: achats.toString(),
      personnel_centimes: personnel.toString(),
      impots_taxes_centimes: impotsTaxes.toString(),
      dotations_centimes: dotations.toString(),
      financieres_centimes: chFin.toString(),
      total_centimes: totalCharges.toString(),
    },
    resultat_net_centimes: resultatNet.toString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. apply_benford_law — detection fraude (loi de Benford 1er chiffre)
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Applique la loi de Benford sur le 1er chiffre des montants.
 * Distribution attendue : log10(1 + 1/d) pour d=1..9
 * Plus l'ecart est grand, plus le risque de fabrication artificielle.
 *
 * Verdict :
 *   chi2 < 15.5  : conforme Benford (faible risque)
 *   15.5-25      : suspicieux (a verifier)
 *   > 25         : tres suspect (probabilite fabrication > 99%)
 */
export function applyBenfordLaw(args: {
  amounts_centimes: (string | number | bigint)[];
  min_amount_threshold?: number;   // ignore les petits montants
}): {
  ok: boolean;
  sample_size: number;
  observed: { digit: number; count: number; frequency: number; expected: number; deviation: number }[];
  chi2: number;
  verdict: "conforme" | "suspect" | "fraude_probable";
  recommendation: string;
} {
  const threshold = args.min_amount_threshold ?? 1000;  // 10 FCFA
  const firstDigits: number[] = [];
  for (const raw of args.amounts_centimes) {
    let n: bigint;
    try {
      n = typeof raw === "bigint" ? raw : BigInt(raw);
    } catch {
      continue;
    }
    if (n < BigInt(threshold)) continue;
    const s = n.toString().replace(/^[-0]+/, "");
    if (s.length === 0) continue;
    const d = parseInt(s[0], 10);
    if (d >= 1 && d <= 9) firstDigits.push(d);
  }
  const total = firstDigits.length;
  if (total < 50) {
    return {
      ok: false,
      sample_size: total,
      observed: [],
      chi2: 0,
      verdict: "conforme",
      recommendation: `Echantillon trop petit (${total} < 50). Benford peu fiable sous 50 montants.`,
    };
  }

  // Distribution attendue Benford
  const expectedFreq = (d: number) => Math.log10(1 + 1 / d);

  const observed: { digit: number; count: number; frequency: number; expected: number; deviation: number }[] = [];
  let chi2 = 0;
  for (let d = 1; d <= 9; d++) {
    const count = firstDigits.filter(x => x === d).length;
    const freq = count / total;
    const expF = expectedFreq(d);
    const expC = expF * total;
    if (expC > 0) chi2 += Math.pow(count - expC, 2) / expC;
    observed.push({
      digit: d,
      count,
      frequency: Math.round(freq * 10000) / 10000,
      expected: Math.round(expF * 10000) / 10000,
      deviation: Math.round((freq - expF) * 10000) / 10000,
    });
  }

  const verdict: "conforme" | "suspect" | "fraude_probable" =
    chi2 < 15.5 ? "conforme" : chi2 < 25 ? "suspect" : "fraude_probable";
  const recommendation =
    verdict === "conforme" ? "Distribution conforme. Pas d'indication de manipulation."
    : verdict === "suspect" ? "Ecarts significatifs. Recommander un echantillonnage cible des montants debutant par les chiffres atypiques."
    : "Ecarts tres importants (>99% confidence anomalie). Audit complet recommande.";

  return {
    ok: true,
    sample_size: total,
    observed,
    chi2: Math.round(chi2 * 100) / 100,
    verdict,
    recommendation,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. reconcile_bank_statement — rapprochement bancaire
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Rapproche les ecritures comptables (compte 521 banque) avec un releve bancaire.
 * Match par (date +/- 3 jours, montant exact). Retourne :
 *   - matched : paires (compta, banque)
 *   - unmatched_compta : ecritures comptables sans correspondance
 *   - unmatched_bank   : operations bancaires sans correspondance
 */
export function reconcileBankStatement(args: {
  compta_entries: { date: string; libelle: string; debit_centimes: string | bigint; credit_centimes: string | bigint }[];
  bank_entries: { date: string; libelle: string; debit_centimes: string | bigint; credit_centimes: string | bigint }[];
  tolerance_days?: number;
}): {
  ok: boolean;
  matched_count: number;
  unmatched_compta_count: number;
  unmatched_bank_count: number;
  matched: { compta_index: number; bank_index: number; amount_centimes: string }[];
  unmatched_compta: { index: number; date: string; libelle: string; amount_centimes: string }[];
  unmatched_bank: { index: number; date: string; libelle: string; amount_centimes: string }[];
} {
  const tolerance = args.tolerance_days ?? 3;
  const compta = args.compta_entries.map((e, idx) => ({
    idx,
    date: new Date(e.date),
    libelle: e.libelle,
    amount: BigInt(e.debit_centimes as string) - BigInt(e.credit_centimes as string),
  }));
  const bank = args.bank_entries.map((e, idx) => ({
    idx,
    date: new Date(e.date),
    libelle: e.libelle,
    // Pour la banque : credit = entree d'argent (vu de la banque), debit = sortie
    // Cote compta 521 : debit = entree, credit = sortie. Donc on inverse.
    amount: BigInt(e.credit_centimes as string) - BigInt(e.debit_centimes as string),
    matched: false,
  }));

  const matched: { compta_index: number; bank_index: number; amount_centimes: string }[] = [];
  const unmatched_compta: { index: number; date: string; libelle: string; amount_centimes: string }[] = [];

  for (const c of compta) {
    const candidate = bank.find(b => {
      if (b.matched) return false;
      if (b.amount !== c.amount) return false;
      const diff = Math.abs(b.date.getTime() - c.date.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= tolerance;
    });
    if (candidate) {
      candidate.matched = true;
      matched.push({ compta_index: c.idx, bank_index: candidate.idx, amount_centimes: c.amount.toString() });
    } else {
      unmatched_compta.push({ index: c.idx, date: c.date.toISOString().slice(0, 10), libelle: c.libelle, amount_centimes: c.amount.toString() });
    }
  }
  const unmatched_bank = bank
    .filter(b => !b.matched)
    .map(b => ({ index: b.idx, date: b.date.toISOString().slice(0, 10), libelle: b.libelle, amount_centimes: b.amount.toString() }));

  return {
    ok: true,
    matched_count: matched.length,
    unmatched_compta_count: unmatched_compta.length,
    unmatched_bank_count: unmatched_bank.length,
    matched,
    unmatched_compta,
    unmatched_bank,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. compute_irpp_uemoa — Impot sur le Revenu (bareme progressif)
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Bareme IRPP simplifie par pays UEMOA/CEMAC (donnees 2025).
 * Note : les baremes evoluent — pour calcul officiel, consulter le CGI a jour.
 */
const IRPP_BRACKETS: Record<string, { up_to: number; rate: number }[]> = {
  // CI : LFI 2024 — montants en FCFA
  CI: [
    { up_to: 600_000, rate: 0 },
    { up_to: 1_560_000, rate: 0.10 },
    { up_to: 2_400_000, rate: 0.15 },
    { up_to: 4_800_000, rate: 0.20 },
    { up_to: 7_440_000, rate: 0.25 },
    { up_to: 13_440_000, rate: 0.35 },
    { up_to: Infinity, rate: 0.40 },
  ],
  SN: [
    { up_to: 630_000, rate: 0 },
    { up_to: 1_500_000, rate: 0.20 },
    { up_to: 4_000_000, rate: 0.30 },
    { up_to: 8_000_000, rate: 0.35 },
    { up_to: 13_500_000, rate: 0.37 },
    { up_to: Infinity, rate: 0.40 },
  ],
  BF: [
    { up_to: 30_000 * 12, rate: 0 },
    { up_to: 50_000 * 12, rate: 0.125 },
    { up_to: 80_000 * 12, rate: 0.15 },
    { up_to: 120_000 * 12, rate: 0.18 },
    { up_to: 170_000 * 12, rate: 0.20 },
    { up_to: 250_000 * 12, rate: 0.23 },
    { up_to: Infinity, rate: 0.25 },
  ],
};

export function computeIrppUemoa(args: {
  revenu_imposable_centimes: string | bigint;
  pays: "CI" | "SN" | "BF" | "ML" | "BJ" | "TG" | "NE";
  parts_fiscales?: number;       // quotient familial (defaut 1)
}): {
  ok: boolean;
  pays: string;
  revenu_imposable_centimes: string;
  parts: number;
  impot_centimes: string;
  impot_formatted: string;
  taux_moyen: number;
  brackets_applied: { tranche: string; rate: number; impot_centimes: string }[];
  error?: string;
} {
  const parts = args.parts_fiscales ?? 1;
  const brackets = IRPP_BRACKETS[args.pays];
  if (!brackets) {
    return { ok: false, pays: args.pays, revenu_imposable_centimes: "0", parts, impot_centimes: "0", impot_formatted: "0 FCFA", taux_moyen: 0, brackets_applied: [], error: `Bareme IRPP ${args.pays} non disponible (a ajouter)` };
  }
  const revenuCent = BigInt(args.revenu_imposable_centimes);
  const revenuParPartCent = revenuCent / BigInt(parts);

  let impotParPartCent = 0n;
  let prevLimit = 0n;
  const applied: { tranche: string; rate: number; impot_centimes: string }[] = [];
  for (const b of brackets) {
    const upToCent = b.up_to === Infinity ? revenuParPartCent : BigInt(b.up_to * 100);
    if (revenuParPartCent <= prevLimit) break;
    const taxable = (revenuParPartCent < upToCent ? revenuParPartCent : upToCent) - prevLimit;
    if (taxable <= 0n) continue;
    const rateBp = BigInt(Math.round(b.rate * 10000));
    const impot = (taxable * rateBp) / 10000n;
    impotParPartCent += impot;
    applied.push({
      tranche: `${(Number(prevLimit) / 100).toLocaleString()} - ${b.up_to === Infinity ? "+infini" : (b.up_to).toLocaleString()} FCFA`,
      rate: b.rate,
      impot_centimes: impot.toString(),
    });
    prevLimit = upToCent;
    if (revenuParPartCent <= upToCent) break;
  }
  const impotTotal = impotParPartCent * BigInt(parts);
  const tauxMoyen = revenuCent > 0n ? Number(impotTotal) / Number(revenuCent) : 0;

  return {
    ok: true,
    pays: args.pays,
    revenu_imposable_centimes: revenuCent.toString(),
    parts,
    impot_centimes: impotTotal.toString(),
    impot_formatted: formatMoneyFcfa(impotTotal),
    taux_moyen: Math.round(tauxMoyen * 10000) / 10000,
    brackets_applied: applied,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. compute_is_uemoa — Impot sur les Societes
// ═══════════════════════════════════════════════════════════════════════════
const IS_RATES: Record<string, { taux_normal: number; taux_reduit?: number; min_forfait_centimes?: bigint }> = {
  CI: { taux_normal: 0.25, taux_reduit: 0.20 },
  SN: { taux_normal: 0.30 },
  BF: { taux_normal: 0.275 },
  ML: { taux_normal: 0.30 },
  BJ: { taux_normal: 0.30 },
  TG: { taux_normal: 0.27 },
  NE: { taux_normal: 0.30 },
  CM: { taux_normal: 0.33 },
  CG: { taux_normal: 0.28 },
  GA: { taux_normal: 0.30 },
  TD: { taux_normal: 0.35 },
};

export function computeIsUemoa(args: {
  benefice_imposable_centimes: string | bigint;
  pays: string;
  taux_reduit?: boolean;
}): {
  ok: boolean;
  pays: string;
  benefice_centimes: string;
  taux: number;
  is_centimes: string;
  is_formatted: string;
  error?: string;
} {
  const rates = IS_RATES[args.pays];
  if (!rates) {
    return { ok: false, pays: args.pays, benefice_centimes: "0", taux: 0, is_centimes: "0", is_formatted: "0 FCFA", error: `Taux IS ${args.pays} non disponible` };
  }
  const benefice = BigInt(args.benefice_imposable_centimes);
  if (benefice <= 0n) {
    return { ok: true, pays: args.pays, benefice_centimes: benefice.toString(), taux: 0, is_centimes: "0", is_formatted: formatMoneyFcfa(0n) };
  }
  const taux = args.taux_reduit && rates.taux_reduit ? rates.taux_reduit : rates.taux_normal;
  const tauxBp = BigInt(Math.round(taux * 10000));
  const is = (benefice * tauxBp) / 10000n;
  return {
    ok: true,
    pays: args.pays,
    benefice_centimes: benefice.toString(),
    taux,
    is_centimes: is.toString(),
    is_formatted: formatMoneyFcfa(is),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. compute_cnss_contribution — cotisations sociales (CNSS/CNPS)
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Taux de cotisation employeur+salarie par pays UEMOA (CNSS/CNPS).
 * Plafonds en FCFA mensuels (donnees 2024).
 */
const CNSS_CONFIG: Record<string, { plafond_fcfa: number; salarie_pct: number; employeur_pct: number; branches: string[] }> = {
  CI: { plafond_fcfa: 2_700_000, salarie_pct: 0.063, employeur_pct: 0.155, branches: ["retraite", "famille", "ATMP"] },
  SN: { plafond_fcfa: 360_000, salarie_pct: 0.058, employeur_pct: 0.211, branches: ["retraite IPRES", "CSS"] },
  BF: { plafond_fcfa: 600_000, salarie_pct: 0.055, employeur_pct: 0.165, branches: ["retraite CNSS"] },
  ML: { plafond_fcfa: 4_950_000, salarie_pct: 0.0356, employeur_pct: 0.1903, branches: ["INPS"] },
  BJ: { plafond_fcfa: 1_080_000, salarie_pct: 0.036, employeur_pct: 0.164, branches: ["CNSS"] },
};

export function computeCnssContribution(args: {
  salaire_brut_centimes: string | bigint;
  pays: string;
}): {
  ok: boolean;
  pays: string;
  salaire_brut_centimes: string;
  base_plafonnee_centimes: string;
  cotisation_salarie_centimes: string;
  cotisation_employeur_centimes: string;
  cotisation_totale_centimes: string;
  taux_salarie: number;
  taux_employeur: number;
  branches: string[];
  error?: string;
} {
  const cfg = CNSS_CONFIG[args.pays];
  if (!cfg) {
    return { ok: false, pays: args.pays, salaire_brut_centimes: "0", base_plafonnee_centimes: "0", cotisation_salarie_centimes: "0", cotisation_employeur_centimes: "0", cotisation_totale_centimes: "0", taux_salarie: 0, taux_employeur: 0, branches: [], error: `Config CNSS ${args.pays} non disponible` };
  }
  const brut = BigInt(args.salaire_brut_centimes);
  const plafondCent = BigInt(cfg.plafond_fcfa * 100);
  const base = brut < plafondCent ? brut : plafondCent;
  const tauxSalBp = BigInt(Math.round(cfg.salarie_pct * 10000));
  const tauxEmpBp = BigInt(Math.round(cfg.employeur_pct * 10000));
  const cotSal = (base * tauxSalBp) / 10000n;
  const cotEmp = (base * tauxEmpBp) / 10000n;

  return {
    ok: true,
    pays: args.pays,
    salaire_brut_centimes: brut.toString(),
    base_plafonnee_centimes: base.toString(),
    cotisation_salarie_centimes: cotSal.toString(),
    cotisation_employeur_centimes: cotEmp.toString(),
    cotisation_totale_centimes: (cotSal + cotEmp).toString(),
    taux_salarie: cfg.salarie_pct,
    taux_employeur: cfg.employeur_pct,
    branches: cfg.branches,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. validate_journal_entry — partie double + comptes SYSCOHADA
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Valide une serie d'ecritures comptables :
 *   - Partie double : sum(debit) === sum(credit) par piece
 *   - Numero de compte SYSCOHADA : 6 chiffres minimum, classes 1-9
 *   - Pas d'ecriture sur compte de classe 0 (reserve)
 *   - Date conforme (pas dans le futur, pas trop ancienne)
 */
export function validateJournalEntry(args: {
  entries: { numero_piece?: string; compte: string; debit_centimes: string | bigint; credit_centimes: string | bigint; date: string }[];
  current_date?: string;
}): {
  ok: boolean;
  valid: boolean;
  errors: { code: string; message: string; entry_index?: number }[];
  warnings: { code: string; message: string; entry_index?: number }[];
  partie_double_par_piece: { piece: string; debit_centimes: string; credit_centimes: string; equilibre: boolean }[];
} {
  const errors: { code: string; message: string; entry_index?: number }[] = [];
  const warnings: { code: string; message: string; entry_index?: number }[] = [];
  const today = args.current_date ? new Date(args.current_date) : new Date();
  const oneYearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);

  // Validation par ligne
  args.entries.forEach((e, idx) => {
    // Numero de compte
    if (!/^[1-9]\d{2,}/.test(e.compte)) {
      errors.push({ code: "COMPTE_INVALIDE", message: `Compte '${e.compte}' invalide (doit commencer par 1-9, min 3 chiffres)`, entry_index: idx });
    }
    // Date
    const date = new Date(e.date);
    if (isNaN(date.getTime())) {
      errors.push({ code: "DATE_INVALIDE", message: `Date '${e.date}' illisible`, entry_index: idx });
    } else {
      if (date > today) errors.push({ code: "DATE_FUTURE", message: `Ecriture datee dans le futur (${e.date})`, entry_index: idx });
      if (date < oneYearAgo) warnings.push({ code: "DATE_ANCIENNE", message: `Ecriture > 1 an (${e.date})`, entry_index: idx });
    }
    // Debit XOR credit
    const d = BigInt(e.debit_centimes);
    const c = BigInt(e.credit_centimes);
    if (d > 0n && c > 0n) {
      errors.push({ code: "DEBIT_ET_CREDIT", message: `Debit ET credit non nuls sur la meme ligne`, entry_index: idx });
    }
    if (d === 0n && c === 0n) {
      warnings.push({ code: "MONTANT_NUL", message: `Ligne avec montant 0`, entry_index: idx });
    }
  });

  // Partie double par piece
  const piecesMap = new Map<string, { debit: bigint; credit: bigint }>();
  for (const e of args.entries) {
    const piece = e.numero_piece ?? "_no_piece_";
    const cur = piecesMap.get(piece) ?? { debit: 0n, credit: 0n };
    cur.debit += BigInt(e.debit_centimes);
    cur.credit += BigInt(e.credit_centimes);
    piecesMap.set(piece, cur);
  }
  const partieDouble = Array.from(piecesMap.entries()).map(([piece, sums]) => ({
    piece,
    debit_centimes: sums.debit.toString(),
    credit_centimes: sums.credit.toString(),
    equilibre: sums.debit === sums.credit,
  }));
  partieDouble.forEach(p => {
    if (!p.equilibre) {
      errors.push({ code: "PARTIE_DOUBLE_KO", message: `Piece '${p.piece}' non equilibree : debit=${p.debit_centimes}, credit=${p.credit_centimes}` });
    }
  });

  return {
    ok: true,
    valid: errors.length === 0,
    errors,
    warnings,
    partie_double_par_piece: partieDouble,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. detect_accounting_anomalies — heuristiques fraude/erreur
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Heuristiques :
 *   - Montants ronds suspects (>50k FCFA et fini par 000000)
 *   - Ecritures le weekend (samedi/dimanche)
 *   - Doublons probables (meme date + meme montant + meme compte)
 *   - Montant juste sous un seuil reglementaire (ex: 9 999 999 si seuil 10M)
 *   - Variation enorme intra-journee sur un meme compte
 */
export function detectAccountingAnomalies(args: {
  entries: { date: string; compte: string; libelle?: string; debit_centimes: string | bigint; credit_centimes: string | bigint }[];
  thresholds?: number[];          // seuils reglementaires (FCFA), defaut [10_000_000]
}): {
  ok: boolean;
  anomalies: { type: string; entry_index: number; severity: "info" | "warning" | "critical"; detail: string }[];
  summary: { total_anomalies: number; critical: number; warning: number; info: number };
} {
  const thresholds = args.thresholds ?? [10_000_000];
  const anomalies: { type: string; entry_index: number; severity: "info" | "warning" | "critical"; detail: string }[] = [];

  args.entries.forEach((e, idx) => {
    const amount = BigInt(e.debit_centimes) - BigInt(e.credit_centimes);
    const absAmount = amount < 0n ? -amount : amount;

    // 1. Montant rond suspect
    if (absAmount >= BigInt(50_000 * 100) && absAmount % BigInt(1_000_000 * 100) === 0n) {
      anomalies.push({ type: "MONTANT_ROND", entry_index: idx, severity: "info", detail: `Montant rond ${formatMoneyFcfa(absAmount)} sur ${e.compte}` });
    }

    // 2. Weekend
    const date = new Date(e.date);
    if (!isNaN(date.getTime())) {
      const dow = date.getUTCDay();
      if (dow === 0 || dow === 6) {
        anomalies.push({ type: "ECRITURE_WEEKEND", entry_index: idx, severity: "warning", detail: `Ecriture un ${dow === 0 ? "dimanche" : "samedi"} (${e.date})` });
      }
    }

    // 3. Just under threshold
    for (const t of thresholds) {
      const tCent = BigInt(t * 100);
      const ratio = Number(absAmount) / Number(tCent);
      if (ratio > 0.95 && ratio < 1) {
        anomalies.push({ type: "SOUS_SEUIL", entry_index: idx, severity: "critical", detail: `Montant ${formatMoneyFcfa(absAmount)} juste sous seuil ${t.toLocaleString()} FCFA (${(ratio * 100).toFixed(1)}%)` });
      }
    }
  });

  // 4. Doublons (meme date + meme montant + meme compte)
  const sigMap = new Map<string, number[]>();
  args.entries.forEach((e, idx) => {
    const sig = `${e.date}|${e.compte}|${e.debit_centimes}|${e.credit_centimes}`;
    const arr = sigMap.get(sig) ?? [];
    arr.push(idx);
    sigMap.set(sig, arr);
  });
  for (const [sig, indices] of sigMap) {
    if (indices.length > 1) {
      indices.forEach(idx => {
        anomalies.push({ type: "DOUBLON", entry_index: idx, severity: "warning", detail: `Doublon probable (${indices.length} ecritures identiques: ${sig})` });
      });
    }
  }

  return {
    ok: true,
    anomalies,
    summary: {
      total_anomalies: anomalies.length,
      critical: anomalies.filter(a => a.severity === "critical").length,
      warning: anomalies.filter(a => a.severity === "warning").length,
      info: anomalies.filter(a => a.severity === "info").length,
    },
  };
}
