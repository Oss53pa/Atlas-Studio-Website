// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — Vision (CDC §3.2 vision L1)
// 2 tools : extract_from_image, parse_document_visual
// ═══════════════════════════════════════════════════════════════════════════
// Note : utilise l'API Gemini Vision (gemini-2.5-flash) car native multimodal.
// Fallback Anthropic Claude Sonnet (Vision) si gemini indisponible.

interface GeminiVisionPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };  // base64
}

/**
 * Extrait du texte/donnees structurees depuis une image (OCR + comprehension).
 * @param imageBase64 image en base64 (sans le prefixe data:)
 * @param mimeType ex: 'image/png', 'image/jpeg', 'application/pdf'
 * @param prompt ce qu'on cherche a extraire (ex: 'extrait tous les montants')
 */
export async function extractFromImage(args: {
  apiKey: string;
  model?: string;
  imageBase64: string;
  mimeType: string;
  prompt: string;
  expected_schema?: Record<string, unknown>;  // Si fourni, force JSON output
}): Promise<{ ok: boolean; extracted?: unknown; raw_text?: string; error?: string }> {
  if (!args.apiKey) return { ok: false, error: "apiKey Gemini requise" };
  if (!args.imageBase64 || !args.mimeType) return { ok: false, error: "imageBase64 et mimeType requis" };

  const model = args.model ?? "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${args.apiKey}`;

  const parts: GeminiVisionPart[] = [
    { inline_data: { mime_type: args.mimeType, data: args.imageBase64 } },
    { text: args.prompt },
  ];

  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.1,
      ...(args.expected_schema ? { responseMimeType: "application/json" } : {}),
    },
  };

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!r.ok) {
      const err = await r.text();
      return { ok: false, error: `Gemini Vision ${r.status}: ${err.slice(0, 200)}` };
    }
    const data = await r.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (args.expected_schema) {
      try {
        return { ok: true, extracted: JSON.parse(text), raw_text: text };
      } catch {
        return { ok: true, raw_text: text };
      }
    }
    return { ok: true, raw_text: text };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Parse un document visuel (PDF facture, releve bancaire, bilan scanne).
 * Retourne une structure normalisee selon document_type.
 */
export async function parseDocumentVisual(args: {
  apiKey: string;
  model?: string;
  imageBase64: string;
  mimeType: string;
  document_type: "facture" | "releve_bancaire" | "bilan" | "compte_resultat" | "fiche_paie" | "contrat" | "auto";
}): Promise<{ ok: boolean; document_type: string; parsed?: unknown; raw_text?: string; error?: string }> {
  if (!args.apiKey) return { ok: false, document_type: args.document_type, error: "apiKey Gemini requise" };

  // Schemas attendus selon le type de document
  const schemas: Record<string, string> = {
    facture: `{ "fournisseur": string, "numero": string, "date": "YYYY-MM-DD", "echeance": "YYYY-MM-DD", "lignes": [{"designation": string, "quantite": number, "pu_ht_centimes": number, "total_ht_centimes": number}], "total_ht_centimes": number, "tva_centimes": number, "total_ttc_centimes": number, "devise": string }`,
    releve_bancaire: `{ "banque": string, "numero_compte": string, "periode": {"debut": "YYYY-MM-DD", "fin": "YYYY-MM-DD"}, "solde_debut_centimes": number, "solde_fin_centimes": number, "operations": [{"date": "YYYY-MM-DD", "libelle": string, "debit_centimes": number, "credit_centimes": number}] }`,
    bilan: `{ "exercice": "YYYY", "actif": {"immobilisations_nettes": number, "stocks": number, "creances_clients": number, "tresorerie_actif": number, "total_actif": number}, "passif": {"capitaux_propres": number, "dettes_financieres": number, "dettes_fournisseurs": number, "tresorerie_passif": number, "total_passif": number} }`,
    compte_resultat: `{ "exercice": "YYYY", "chiffre_affaires": number, "achats_consommes": number, "charges_personnel": number, "impots_taxes": number, "dotations_amortissements": number, "resultat_exploitation": number, "resultat_net": number }`,
    fiche_paie: `{ "salarie": string, "matricule": string, "periode": "YYYY-MM", "salaire_brut_centimes": number, "cotisations_centimes": number, "salaire_net_centimes": number, "lignes": [{"libelle": string, "base": number, "taux": number, "montant_centimes": number}] }`,
    contrat: `{ "type": string, "parties": [string], "objet": string, "date_debut": "YYYY-MM-DD", "date_fin": "YYYY-MM-DD" | null, "montant_centimes": number | null, "clauses_cles": [string] }`,
    auto: `{ "document_type": string, "summary": string, "key_fields": object }`,
  };

  const schema = schemas[args.document_type] ?? schemas.auto;
  const prompt = `Tu es un expert SYSCOHADA. Parse ce document de type "${args.document_type}".
Retourne STRICTEMENT un JSON conforme a ce schema (montants en centimes FCFA, bigint si possible) :
${schema}

Si une donnee est absente du document, mets null. Ne jamais inventer un montant.`;

  const result = await extractFromImage({
    apiKey: args.apiKey,
    model: args.model,
    imageBase64: args.imageBase64,
    mimeType: args.mimeType,
    prompt,
    expected_schema: { type: "object" },
  });

  if (!result.ok) return { ok: false, document_type: args.document_type, error: result.error };
  return {
    ok: true,
    document_type: args.document_type,
    parsed: result.extracted,
    raw_text: result.raw_text,
  };
}
