// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — L3 : ADVIST (Signature électronique — Loi ivoirienne 2013-546)
// ═══════════════════════════════════════════════════════════════════════════
// Aligné sur le registry proph3t_apps : domaine DOCUMENTAIRE, mode strict.
// 5 tools métier : validité juridique d'une signature, défi OTP d'authentification
// du signataire, circuit de validation (parapheur), suivi d'avancement, valeur
// probante du dossier. (Les anciens tools « conseil » étaient hors-métier — voir
// audit 360° §Uniformité.)
// ═══════════════════════════════════════════════════════════════════════════

type SignatureType = "simple" | "avancee" | "qualifiee";

/**
 * Vérifie la validité juridique d'une signature électronique au sens de la
 * Loi ivoirienne 2013-546 (transactions électroniques). Détermine le niveau
 * (simple / avancée / qualifiée) effectivement atteint et la valeur probante.
 */
export function verifySignatureValidity(args: {
  type_revendique: SignatureType;
  integrite_document_verifiee: boolean;   // hash du document inchangé après signature
  identite_signataire_verifiee: boolean;  // KYC / lien univoque au signataire
  certificat_present: boolean;
  certificat_emetteur_qualifie?: boolean;  // PSCo qualifié (liste de confiance)
  horodatage_present?: boolean;
  consentement_capture?: boolean;          // preuve du consentement éclairé
}): {
  ok: boolean;
  niveau_atteint: SignatureType | "invalide";
  valeur_probante: "presomption_fiabilite" | "libre_appreciation" | "nulle";
  conforme_2013_546: boolean;
  defauts: string[];
} {
  const defauts: string[] = [];

  if (!args.integrite_document_verifiee) defauts.push("Intégrité du document non vérifiée — toute altération annule la signature");
  if (!args.identite_signataire_verifiee) defauts.push("Identité du signataire non vérifiée (lien univoque exigé)");
  if (!args.consentement_capture) defauts.push("Consentement du signataire non tracé");

  // L'intégrité est une condition sine qua non.
  let niveau: SignatureType | "invalide";
  if (!args.integrite_document_verifiee) {
    niveau = "invalide";
  } else if (
    args.type_revendique === "qualifiee" &&
    args.certificat_present && args.certificat_emetteur_qualifie &&
    args.horodatage_present && args.identite_signataire_verifiee
  ) {
    niveau = "qualifiee";
  } else if (
    args.certificat_present && args.identite_signataire_verifiee
  ) {
    niveau = "avancee";
  } else if (args.identite_signataire_verifiee) {
    niveau = "simple";
  } else {
    niveau = "invalide";
  }

  if (args.type_revendique === "qualifiee" && niveau !== "qualifiee") {
    if (!args.certificat_emetteur_qualifie) defauts.push("Certificat non émis par un PSCo qualifié — niveau qualifié non atteint");
    if (!args.horodatage_present) defauts.push("Horodatage qualifié absent — niveau qualifié non atteint");
  }

  // Seule la signature qualifiée bénéficie de la présomption de fiabilité.
  const valeur_probante: "presomption_fiabilite" | "libre_appreciation" | "nulle" =
    niveau === "invalide" ? "nulle"
      : niveau === "qualifiee" ? "presomption_fiabilite"
        : "libre_appreciation";

  return {
    ok: true,
    niveau_atteint: niveau,
    valeur_probante,
    conforme_2013_546: niveau !== "invalide",
    defauts,
  };
}

/**
 * Génère un défi OTP pour authentifier un signataire avant apposition de la
 * signature. Retourne le code (à transmettre via le canal) + un condensé non
 * réversible pour stockage côté serveur, ainsi que la politique d'expiration.
 */
export function generateOtpChallenge(args: {
  canal: "sms" | "email" | "whatsapp";
  destinataire_masque: string;            // ex: "+225 07 ** ** 42" / "j***@ex.ci"
  longueur?: number;                       // défaut 6
  ttl_secondes?: number;                   // défaut 300 (5 min)
  max_tentatives?: number;                 // défaut 3
}): {
  ok: boolean;
  challenge_id: string;
  code: string;
  code_hash: string;                       // FNV-1a 32 bits hex (référence non réversible)
  canal: string;
  destinataire_masque: string;
  expire_dans_s: number;
  expire_le_iso: string;
  max_tentatives: number;
  message: string;
} {
  const longueur = Math.min(8, Math.max(4, args.longueur ?? 6));
  const ttl = args.ttl_secondes ?? 300;
  const maxTent = args.max_tentatives ?? 3;

  // OTP numérique non biaisé via crypto (disponible dans le runtime Deno).
  const buf = new Uint32Array(longueur);
  crypto.getRandomValues(buf);
  const code = Array.from(buf, (n) => (n % 10).toString()).join("");

  // FNV-1a 32 bits (synchrone) — référence de stockage, pas un secret cryptographique.
  let h = 0x811c9dc5;
  for (let i = 0; i < code.length; i++) {
    h ^= code.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const code_hash = h.toString(16).padStart(8, "0");

  const idBuf = new Uint8Array(8);
  crypto.getRandomValues(idBuf);
  const challenge_id = "otp_" + Array.from(idBuf, (b) => b.toString(16).padStart(2, "0")).join("");

  const expireLe = new Date(Date.now() + ttl * 1000).toISOString();

  return {
    ok: true,
    challenge_id,
    code,
    code_hash,
    canal: args.canal,
    destinataire_masque: args.destinataire_masque,
    expire_dans_s: ttl,
    expire_le_iso: expireLe,
    max_tentatives: maxTent,
    message: `Code à usage unique (${longueur} chiffres) envoyé par ${args.canal} — valable ${Math.round(ttl / 60)} min, ${maxTent} tentatives.`,
  };
}

/**
 * Définit un circuit de validation (parapheur) et détecte les incohérences
 * structurelles avant lancement.
 */
export function defineSignatureCircuit(args: {
  signataires: { id: string; nom: string; role: string; ordre?: number }[];
  mode: "sequentiel" | "parallele" | "mixte";
  seuil_validation?: number;               // nb de signatures requises (mode parallèle)
}): {
  ok: boolean;
  circuit: { etape: number; signataires: { id: string; nom: string; role: string }[] }[];
  nb_etapes: number;
  seuil_validation: number;
  incoherences: string[];
} {
  const incoherences: string[] = [];
  const ids = args.signataires.map((s) => s.id);
  if (ids.length === 0) incoherences.push("Aucun signataire défini");
  if (new Set(ids).size !== ids.length) incoherences.push("Signataire en doublon dans le circuit");

  const seuil = args.seuil_validation ?? args.signataires.length;
  if (seuil > args.signataires.length) incoherences.push(`Seuil de validation (${seuil}) supérieur au nombre de signataires (${args.signataires.length})`);
  if (seuil < 1) incoherences.push("Seuil de validation < 1 — circuit jamais validable");

  const circuit: { etape: number; signataires: { id: string; nom: string; role: string }[] }[] = [];
  if (args.mode === "parallele") {
    circuit.push({ etape: 1, signataires: args.signataires.map((s) => ({ id: s.id, nom: s.nom, role: s.role })) });
  } else {
    const manquant = args.signataires.some((s) => s.ordre === undefined);
    if (manquant) incoherences.push("Ordre de passage manquant pour au moins un signataire en mode séquentiel/mixte");
    const tries = [...args.signataires].sort((a, b) => (a.ordre ?? 999) - (b.ordre ?? 999));
    const parOrdre = new Map<number, { id: string; nom: string; role: string }[]>();
    tries.forEach((s, i) => {
      const k = s.ordre ?? i + 1;
      if (!parOrdre.has(k)) parOrdre.set(k, []);
      parOrdre.get(k)!.push({ id: s.id, nom: s.nom, role: s.role });
    });
    let etape = 1;
    for (const [, sigs] of [...parOrdre.entries()].sort((a, b) => a[0] - b[0])) {
      circuit.push({ etape: etape++, signataires: sigs });
    }
  }

  return {
    ok: true,
    circuit,
    nb_etapes: circuit.length,
    seuil_validation: seuil,
    incoherences,
  };
}

/**
 * Suit l'avancement d'un dossier de signature (taux de complétion, retards,
 * prochaine action recommandée).
 */
export function trackSignatureStatus(args: {
  signataires: { id: string; nom: string; statut: "signe" | "en_attente" | "refuse"; date_relance?: string }[];
  date_limite?: string;
  date_courante?: string;                  // défaut : maintenant
}): {
  ok: boolean;
  total: number;
  signes: number;
  en_attente: number;
  refuses: number;
  taux_completion_pct: number;
  en_retard: boolean;
  signataires_a_relancer: string[];
  prochaine_action: string;
} {
  const total = args.signataires.length;
  const signes = args.signataires.filter((s) => s.statut === "signe").length;
  const refuses = args.signataires.filter((s) => s.statut === "refuse").length;
  const enAttente = args.signataires.filter((s) => s.statut === "en_attente").length;
  const taux = total > 0 ? Math.round((signes / total) * 1000) / 10 : 0;

  const now = args.date_courante ? new Date(args.date_courante).getTime() : Date.now();
  const enRetard = !!args.date_limite && new Date(args.date_limite).getTime() < now && enAttente > 0;

  const aRelancer = args.signataires
    .filter((s) => s.statut === "en_attente" && !s.date_relance)
    .map((s) => s.id);

  let prochaine: string;
  if (refuses > 0) prochaine = "Au moins un signataire a refusé — arbitrer (relancer le circuit ou clôturer)";
  else if (signes === total && total > 0) prochaine = "Dossier complet — sceller et archiver à valeur probatoire";
  else if (enRetard) prochaine = "Délai dépassé — relancer en urgence les signataires en attente";
  else if (aRelancer.length > 0) prochaine = `Relancer ${aRelancer.length} signataire(s) jamais relancé(s)`;
  else prochaine = "En attente des signataires — relances automatiques actives";

  return {
    ok: true,
    total,
    signes,
    en_attente: enAttente,
    refuses,
    taux_completion_pct: taux,
    en_retard: enRetard,
    signataires_a_relancer: aRelancer,
    prochaine_action: prochaine,
  };
}

/**
 * Calcule la valeur probante d'un dossier de signature (score 0-100) selon la
 * robustesse de la chaîne de preuve (niveau de signature, horodatage, piste
 * d'audit, archivage probatoire, identité forte).
 */
export function computeSignatureLegalValue(args: {
  niveau_signature: SignatureType;
  horodatage_qualifie: boolean;
  piste_audit_complete: boolean;
  archivage_probatoire: boolean;
  identite_forte: boolean;
}): {
  ok: boolean;
  score_valeur_probante: number;
  niveau: "faible" | "moyen" | "fort" | "presomption_legale";
  recommandations: string[];
} {
  let score = 0;
  score += args.niveau_signature === "qualifiee" ? 40 : args.niveau_signature === "avancee" ? 25 : 10;
  if (args.horodatage_qualifie) score += 15;
  if (args.piste_audit_complete) score += 20;
  if (args.archivage_probatoire) score += 15;
  if (args.identite_forte) score += 10;
  score = Math.min(100, score);

  const recos: string[] = [];
  if (args.niveau_signature !== "qualifiee") recos.push("Passer en signature qualifiée (PSCo) pour la présomption légale de fiabilité");
  if (!args.horodatage_qualifie) recos.push("Ajouter un horodatage qualifié pour dater de façon opposable");
  if (!args.piste_audit_complete) recos.push("Compléter la piste d'audit (consentement, IP, événements)");
  if (!args.archivage_probatoire) recos.push("Mettre en place un archivage à valeur probatoire (coffre-fort numérique)");

  const niveau: "faible" | "moyen" | "fort" | "presomption_legale" =
    args.niveau_signature === "qualifiee" && score >= 90 ? "presomption_legale"
      : score >= 70 ? "fort"
        : score >= 45 ? "moyen"
          : "faible";

  return { ok: true, score_valeur_probante: score, niveau, recommandations: recos };
}
