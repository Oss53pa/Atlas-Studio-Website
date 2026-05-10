// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — Domain L2 : DOCUMENTAIRE / GED / Archivage
// ═══════════════════════════════════════════════════════════════════════════
// 5 tools metier :
//   1. classify_document         : classification automatique d'un document
//   2. extract_document_metadata : extraction metadonnees (date, montants, parties)
//   3. compute_legal_retention   : duree de conservation legale OHADA
//   4. detect_document_duplicates : detection doublons par hash + similarite
//   5. generate_archive_index    : index d'archivage exportable
// ═══════════════════════════════════════════════════════════════════════════

// ─── 1. Classification document ────────────────────────────────────────────
/**
 * Classifie un document selon son contenu textuel via heuristiques + mots-cles.
 * Categories supportees :
 *   - facture, devis, bon_commande, bon_livraison
 *   - contrat, convention, avenant
 *   - releve_bancaire, ordre_paiement, virement
 *   - bulletin_paie, attestation_travail, certificat
 *   - bilan, compte_resultat, rapport_audit
 *   - lettre, courrier, autre
 */
const KEYWORDS: Record<string, string[]> = {
  facture: ["facture", "facturation", "tva", "ht", "ttc", "echeance", "n° facture"],
  devis: ["devis", "proposition commerciale", "offre", "validite"],
  bon_commande: ["bon de commande", "purchase order", "po n°"],
  bon_livraison: ["bon de livraison", "bl n°", "livraison effectuee"],
  contrat: ["contrat", "convention", "parties", "objet du contrat", "duree"],
  avenant: ["avenant", "modification", "annexe au contrat"],
  releve_bancaire: ["releve de compte", "solde initial", "solde final", "operations"],
  ordre_paiement: ["ordre de virement", "swift", "iban", "beneficiaire"],
  bulletin_paie: ["bulletin de paie", "salaire brut", "net a payer", "cotisations"],
  attestation_travail: ["atteste", "declare que", "atteste sur l'honneur", "cdi", "cdd"],
  bilan: ["bilan", "actif", "passif", "capitaux propres"],
  compte_resultat: ["compte de resultat", "produits", "charges", "resultat net"],
  rapport_audit: ["rapport d'audit", "auditeur", "opinion", "certifications"],
};

export function classifyDocument(args: {
  text_content: string;
  threshold?: number;       // confidence min 0-1, defaut 0.3
}): {
  ok: boolean;
  detected_type: string;
  confidence: number;
  candidates: { type: string; score: number; matched_keywords: string[] }[];
} {
  const text = args.text_content.toLowerCase();
  const threshold = args.threshold ?? 0.3;

  const candidates = Object.entries(KEYWORDS).map(([type, kws]) => {
    const matched = kws.filter(k => text.includes(k));
    const score = matched.length / kws.length;
    return { type, score, matched_keywords: matched };
  })
  .filter(c => c.score > 0)
  .sort((a, b) => b.score - a.score);

  const top = candidates[0];
  const detected = top && top.score >= threshold ? top.type : "autre";
  const confidence = top ? top.score : 0;

  return {
    ok: true,
    detected_type: detected,
    confidence: Math.round(confidence * 100) / 100,
    candidates: candidates.slice(0, 5),
  };
}

// ─── 2. Extraction metadonnees ─────────────────────────────────────────────
/**
 * Extrait les metadonnees standard d'un texte de document :
 *   - dates (toutes occurrences)
 *   - montants (avec leur devise)
 *   - emails
 *   - telephones
 *   - numeros (facture, contrat, RIB, etc.)
 *   - parties (raisons sociales detectees)
 */
export function extractDocumentMetadata(args: { text_content: string; expected_doc_type?: string }): {
  ok: boolean;
  dates: string[];
  amounts: { value: string; currency: string; raw: string }[];
  emails: string[];
  phones: string[];
  numbers: { type: string; value: string }[];
  ribs: string[];
  parties: string[];
} {
  const text = args.text_content;

  // Dates : DD/MM/YYYY, YYYY-MM-DD, "12 janvier 2025"
  const datePatterns = [
    /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/g,
    /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/g,
    /\b(\d{1,2})\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\s+(\d{4})\b/gi,
  ];
  const dates = new Set<string>();
  for (const p of datePatterns) {
    const matches = text.matchAll(p);
    for (const m of matches) dates.add(m[0]);
  }

  // Montants : "1 234 567 FCFA", "1234.56 EUR", "USD 100"
  const amountPatterns = [
    /\b(\d{1,3}(?:[\s.]\d{3})*(?:[,.]\d+)?)\s*(FCFA|XOF|XAF|EUR|USD|GBP)\b/gi,
    /\b(EUR|USD|FCFA|XOF|XAF)\s*(\d{1,3}(?:[\s.]\d{3})*(?:[,.]\d+)?)\b/gi,
  ];
  const amounts: { value: string; currency: string; raw: string }[] = [];
  for (const p of amountPatterns) {
    const matches = text.matchAll(p);
    for (const m of matches) {
      const val = (m[1] || m[2] || "").replace(/\s/g, "");
      const cur = (m[2] || m[1] || "").toUpperCase();
      if (val && cur && !["FCFA","XOF","XAF","EUR","USD","GBP"].includes(val)) {
        amounts.push({ value: val, currency: cur, raw: m[0] });
      }
    }
  }

  // Emails
  const emails = Array.from(new Set([...text.matchAll(/[\w.+-]+@[\w-]+\.[\w.-]+/g)].map(m => m[0])));

  // Phones (FCFA region : +225, +221, +226, etc.)
  const phones = Array.from(new Set([...text.matchAll(/\+?(?:\d{1,4}[\s\-.]?){2,5}\d/g)].map(m => m[0]).filter(p => p.replace(/\D/g, "").length >= 8 && p.replace(/\D/g, "").length <= 15)));

  // Numeros divers
  const numbers: { type: string; value: string }[] = [];
  const factPattern = /\b(facture|fact|n°)\s*[:°]?\s*([A-Z0-9\-/]{3,})/gi;
  for (const m of text.matchAll(factPattern)) {
    numbers.push({ type: "facture", value: m[2] });
  }

  // RIB / IBAN (FCFA region)
  const ribPattern = /\b[A-Z]{2}\d{2}[\sA-Z0-9]{15,30}\b/g;
  const ribs = Array.from(new Set([...text.matchAll(ribPattern)].map(m => m[0].replace(/\s/g, ""))));

  // Parties (raisons sociales : detection capitales suivies de SA/SARL/EURL)
  const partiesPattern = /\b([A-Z][\w&\-' ]{2,40})\s+(SA|SARL|SAS|EURL|EI|GIE|SCI)\b/g;
  const parties = Array.from(new Set([...text.matchAll(partiesPattern)].map(m => `${m[1].trim()} ${m[2]}`)));

  return {
    ok: true,
    dates: Array.from(dates),
    amounts,
    emails,
    phones,
    numbers,
    ribs,
    parties,
  };
}

// ─── 3. Duree conservation legale OHADA ────────────────────────────────────
/**
 * Duree de conservation legale par type de document (norme OHADA + lois nationales) :
 *
 *   Comptable / fiscal : 10 ans (Code SYSCOHADA art. 24, prorogeable)
 *   Sociale / paie : 5 ans (bulletins) - 10 ans (registres CNSS)
 *   Commercial : 10 ans
 *   Civil / contrats : 30 ans (Code civil OHADA)
 *   Documents fiscaux : 10 ans (CGI)
 */
const RETENTION_YEARS: Record<string, { years: number; reference: string }> = {
  facture: { years: 10, reference: "AUDCIF art. 24 — pieces comptables 10 ans" },
  bon_commande: { years: 10, reference: "AUDCIF art. 24" },
  bon_livraison: { years: 10, reference: "AUDCIF art. 24" },
  bilan: { years: 10, reference: "AUDCIF art. 24" },
  compte_resultat: { years: 10, reference: "AUDCIF art. 24" },
  rapport_audit: { years: 10, reference: "AUDCIF art. 24" },
  releve_bancaire: { years: 10, reference: "Pratique bancaire OHADA" },
  ordre_paiement: { years: 10, reference: "Pratique bancaire OHADA" },
  bulletin_paie: { years: 5, reference: "Code travail OHADA — bulletins 5 ans" },
  contrat: { years: 30, reference: "Code civil OHADA — contrats 30 ans" },
  avenant: { years: 30, reference: "Code civil OHADA" },
  attestation_travail: { years: 5, reference: "Code travail" },
  declaration_fiscale: { years: 10, reference: "CGI UEMOA — declarations 10 ans" },
  autre: { years: 5, reference: "Norme prudentielle minimale" },
};

export function computeLegalRetention(args: {
  document_type: string;
  date_creation: string;        // YYYY-MM-DD
}): {
  ok: boolean;
  document_type: string;
  date_creation: string;
  date_destruction_legale: string;
  duree_annees: number;
  reference: string;
  doit_archiver: boolean;
  jours_restants: number;
} {
  const cfg = RETENTION_YEARS[args.document_type] ?? RETENTION_YEARS.autre;
  const dateCreation = new Date(args.date_creation);
  const dateDestruction = new Date(dateCreation);
  dateDestruction.setFullYear(dateDestruction.getFullYear() + cfg.years);

  const today = new Date();
  const jours = Math.ceil((dateDestruction.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return {
    ok: true,
    document_type: args.document_type,
    date_creation: args.date_creation,
    date_destruction_legale: dateDestruction.toISOString().slice(0, 10),
    duree_annees: cfg.years,
    reference: cfg.reference,
    doit_archiver: jours > 0,
    jours_restants: jours,
  };
}

// ─── 4. Detection doublons ─────────────────────────────────────────────────
/**
 * Detecte les doublons probables dans une liste de documents.
 * Strategies :
 *   1. Hash exact du contenu (doublon certain)
 *   2. Similarite Jaccard (mots communs / mots uniques) > seuil
 *   3. Same numero + same date + same montant -> doublon probable
 */
export function detectDocumentDuplicates(args: {
  documents: { id: string; content_hash?: string; numero?: string; date?: string; amount_centimes?: string; text_excerpt?: string }[];
  similarity_threshold?: number;
}): {
  ok: boolean;
  duplicates: { type: "hash_exact" | "metadata_match" | "high_similarity"; doc1_id: string; doc2_id: string; similarity?: number; reason: string }[];
  unique_count: number;
} {
  const threshold = args.similarity_threshold ?? 0.8;
  const docs = args.documents;
  const duplicates: { type: "hash_exact" | "metadata_match" | "high_similarity"; doc1_id: string; doc2_id: string; similarity?: number; reason: string }[] = [];
  const seen = new Set<string>();

  // 1. Hash exact
  const byHash = new Map<string, string[]>();
  for (const d of docs) {
    if (!d.content_hash) continue;
    const arr = byHash.get(d.content_hash) ?? [];
    arr.push(d.id);
    byHash.set(d.content_hash, arr);
  }
  for (const [_hash, ids] of byHash) {
    if (ids.length > 1) {
      for (let i = 0; i < ids.length - 1; i++) {
        duplicates.push({
          type: "hash_exact", doc1_id: ids[i], doc2_id: ids[i + 1],
          reason: "Hash de contenu identique",
        });
        seen.add(ids[i]); seen.add(ids[i + 1]);
      }
    }
  }

  // 2. Metadata match
  for (let i = 0; i < docs.length; i++) {
    for (let j = i + 1; j < docs.length; j++) {
      const a = docs[i], b = docs[j];
      if (a.numero && b.numero && a.numero === b.numero
          && a.date && b.date && a.date === b.date
          && a.amount_centimes && b.amount_centimes && a.amount_centimes === b.amount_centimes) {
        if (!seen.has(a.id) || !seen.has(b.id)) {
          duplicates.push({
            type: "metadata_match", doc1_id: a.id, doc2_id: b.id,
            reason: `Meme numero=${a.numero}, date=${a.date}, montant=${a.amount_centimes}`,
          });
          seen.add(a.id); seen.add(b.id);
        }
      }
    }
  }

  // 3. Similarite Jaccard sur text_excerpt
  for (let i = 0; i < docs.length; i++) {
    for (let j = i + 1; j < docs.length; j++) {
      const a = docs[i], b = docs[j];
      if (!a.text_excerpt || !b.text_excerpt) continue;
      const wordsA = new Set(a.text_excerpt.toLowerCase().split(/\W+/).filter(w => w.length > 3));
      const wordsB = new Set(b.text_excerpt.toLowerCase().split(/\W+/).filter(w => w.length > 3));
      const intersection = [...wordsA].filter(x => wordsB.has(x)).length;
      const union = new Set([...wordsA, ...wordsB]).size;
      const sim = union > 0 ? intersection / union : 0;
      if (sim >= threshold && !seen.has(a.id) && !seen.has(b.id)) {
        duplicates.push({
          type: "high_similarity", doc1_id: a.id, doc2_id: b.id,
          similarity: Math.round(sim * 100) / 100,
          reason: `Similarite Jaccard ${(sim * 100).toFixed(0)}% (mots communs)`,
        });
        seen.add(a.id); seen.add(b.id);
      }
    }
  }

  return {
    ok: true,
    duplicates,
    unique_count: docs.length - seen.size,
  };
}

// ─── 5. Generate archive index ─────────────────────────────────────────────
/**
 * Genere un index d'archivage exportable (CSV/JSON) avec toutes les metadonnees.
 * Structure : id, type, date, parties, montant, hash, statut, retention.
 */
export function generateArchiveIndex(args: {
  documents: { id: string; type: string; title: string; date_creation: string; parties?: string[]; amount_centimes?: string; hash?: string; statut?: string }[];
  format?: "csv" | "json";
}): {
  ok: boolean;
  format: string;
  total_documents: number;
  archive_index: string;
  summary_by_type: Record<string, number>;
} {
  const fmt = args.format ?? "csv";
  const summary: Record<string, number> = {};
  for (const d of args.documents) {
    summary[d.type] = (summary[d.type] ?? 0) + 1;
  }

  const enriched = args.documents.map(d => {
    const ret = computeLegalRetention({ document_type: d.type, date_creation: d.date_creation });
    return {
      ...d,
      retention_years: ret.duree_annees,
      destruction_date: ret.date_destruction_legale,
    };
  });

  let index: string;
  if (fmt === "json") {
    index = JSON.stringify(enriched, null, 2);
  } else {
    const headers = ["id", "type", "title", "date_creation", "parties", "amount_centimes", "hash", "statut", "retention_years", "destruction_date"];
    const lines = [headers.join(",")];
    for (const d of enriched) {
      const row = [
        d.id, d.type, `"${d.title}"`, d.date_creation,
        `"${(d.parties ?? []).join(";")}"`,
        d.amount_centimes ?? "",
        d.hash ?? "",
        d.statut ?? "",
        d.retention_years.toString(),
        d.destruction_date,
      ];
      lines.push(row.join(","));
    }
    index = lines.join("\n");
  }

  return {
    ok: true,
    format: fmt,
    total_documents: args.documents.length,
    archive_index: index,
    summary_by_type: summary,
  };
}
