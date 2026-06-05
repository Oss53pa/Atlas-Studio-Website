// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — Tool Routing par domaine
// ═══════════════════════════════════════════════════════════════════════════
// Avec 96+ tools, envoyer toutes les declarations a chaque iteration LLM
// est tres couteux (~100k chars de schema × N iterations × N users).
//
// Strategie : detecter l'intent du message user via mots-cles + product,
// puis ne charger que les Core L1 (toujours dispos) + tools du/des domaine(s)
// pertinents.
//
// Pour les questions ambigues, le LLM peut demander a charger un domaine
// supplementaire via un meta-tool 'load_domain_tools' (a venir).
// ═══════════════════════════════════════════════════════════════════════════

import type { OllamaTool } from "./ollama.ts";

export type Domain =
  | "finance" | "rh" | "immobilier" | "retail"
  | "documentaire" | "audit" | "tresorerie" | "commercial"
  | "fiscal" | "juridique" | "marketing"
  | "productivite" | "support";

interface DomainPattern {
  domain: Domain;
  keywords: RegExp[];
  product_match?: string[];   // app_id qui matche directement ce domaine
}

const DOMAIN_PATTERNS: DomainPattern[] = [
  {
    domain: "finance",
    keywords: [
      /\b(bilan|compte de resultat|grand livre|ecriture|comptabilit|syscohada|audcif)\b/i,
      /\b(actif|passif|capitaux propres|fonds de roulement|bfr|tresorerie nette)\b/i,
      /\b(benford|fraude|anomalie comptable|rapprochement bancaire)\b/i,
      /\b(irpp|impot sur les societes\b|cnss|cnps|parafiscal)\b/i,
    ],
    product_match: ["cockpit-fa", "atlas-fa"],
  },
  {
    domain: "rh",
    keywords: [
      /\b(salair|paie|fiche de paie|bulletin|smig|brut|net|cotisation)\b/i,
      /\b(its|iuts|cnss|cnps|conges paye|licenciement|anciennete|embauche)\b/i,
      /\b(employe|salarie|rh\b|ressources humaines|effectif)\b/i,
    ],
    product_match: ["atlas-rh", "atlas-paie"],
  },
  {
    domain: "immobilier",
    keywords: [
      /\b(loyer|locataire|bail|copropriete|tantieme|charges immo|taxe fonciere)\b/i,
      /\b(rendement locatif|depot de garantie|locatif|appartement|immeuble)\b/i,
    ],
    product_match: ["immotech"],
  },
  {
    domain: "retail",
    keywords: [
      /\b(marge brute|taux de marque|coefficient multiplicateur|stock|rotation)\b/i,
      /\b(point mort|seuil de rentabilite|panier moyen|ltv|caisse)\b/i,
      /\b(boutique|magasin|distribution|alimentaire)\b/i,
    ],
    product_match: ["atlas-retail"],
  },
  {
    domain: "documentaire",
    keywords: [
      /\b(document|archivage|ged|conservation legale|retention|doublon)\b/i,
      /\b(facture scannee|pdf|extraction|metadonnee|classification)\b/i,
      /\b(signature|signataire|parapheur|otp|circuit de validation|valeur probante)\b/i,
    ],
    product_match: ["advist"],
  },
  {
    domain: "audit",
    keywords: [
      /\b(audit\b|cac\b|commissaire aux comptes|materialit|seuil de signification)\b/i,
      /\b(echantillon|isa\s*\d|controle interne|coso)\b/i,
      /\b(variance|inter-?periode|exercice n-1|balance generale)\b/i,
      /\b(benford|z-?score|ghost fees|frais (dupliqu|fantome)|surfacturation|releve bancaire|anomalie bancaire)\b/i,
    ],
    product_match: ["atlas-audit", "atlasbanx"],
  },
  {
    domain: "tresorerie",
    keywords: [
      /\b(cashflow|cash flow|tresorerie|prevision treso|13 semaines)\b/i,
      /\b(decouvert|cpfd|escompte|factoring|affacturage)\b/i,
      /\b(banque|relation bancaire)\b/i,
    ],
    product_match: ["atlas-treso"],
  },
  {
    domain: "commercial",
    keywords: [
      /\b(lead|prospect|bant|qualification|pipeline|opportunite)\b/i,
      /\b(commission|quota|crm\b|client cible|churn|rfm)\b/i,
      /\b(devis|opportunite|deal)\b/i,
    ],
    product_match: ["atlas-crm"],
  },
  {
    domain: "fiscal",
    keywords: [
      /\b(irvm|dividende|interet|droit d'enregistrement|imf|forfaitaire)\b/i,
      /\b(dsf|declaration synthetique|credit (de )?tva|remboursement tva)\b/i,
      /\b(fiscal|impot|taxe)\b/i,
    ],
    product_match: ["atlas-fiscal"],
  },
  {
    domain: "juridique",
    keywords: [
      /\b(juridique|droit ohada|auscgie|capital minimum|forme juridique)\b/i,
      /\b(\bsa\b|\bsarl\b|\bsas\b|sci\b|snc\b|rccm|jal|ifu)\b/i,
      /\b(ag\b|assemblee generale|quorum|mise en demeure|contrat|clause)\b/i,
    ],
    product_match: ["atlas-juridique"],
  },
  {
    domain: "marketing",
    keywords: [
      /\b(cac\b|ltv|roi\b|roas|campagne|ab[\s-]?test)\b/i,
      /\b(funnel|entonnoir|conversion|acquisition|growth|attribution)\b/i,
      /\b(marketing|publicite|reseau social)\b/i,
    ],
    product_match: ["atlas-marketing"],
  },
  {
    domain: "productivite",
    keywords: [
      /\b(reunion|meeting|agenda|calendrier|tache|todo)\b/i,
      /\b(planning|deadline|sprint|kanban|priorisation)\b/i,
    ],
    product_match: ["atlas-prod"],
  },
  {
    domain: "support",
    keywords: [
      /\b(ticket|support|sav|incident|assistance|client mecontent)\b/i,
      /\b(sla|escalade|priorite p\d|csat)\b/i,
    ],
    product_match: ["atlas-support"],
  },
];

/**
 * Detecte les domaines pertinents pour un message user + product.
 * Retourne la liste des domaines triee par score (mots-cles matches).
 *
 * Si product matche un domaine specifique, c'est priorise.
 * Si aucun match, retourne tous les domaines (aucun filtre).
 */
export function detectDomains(args: {
  message: string;
  product?: string;
  conversation_history?: string[];
  max_domains?: number;
}): { domains: Domain[]; scores: Record<string, number>; reason: string } {
  const product = normalizeAppId(args.product);  // catalogue → convention core
  const fullText = [
    args.message,
    ...(args.conversation_history ?? []).slice(-3),  // 3 derniers messages
  ].join("\n").toLowerCase();

  const scores: Record<string, number> = {};
  for (const dp of DOMAIN_PATTERNS) {
    let score = 0;
    for (const k of dp.keywords) {
      const matches = fullText.match(k);
      if (matches) score += matches.length;
    }
    if (product && dp.product_match?.includes(product)) {
      score += 100;  // boost massif si product matche
    }
    if (score > 0) scores[dp.domain] = score;
  }

  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([d]) => d as Domain);

  const max = args.max_domains ?? 3;
  const domains = sorted.slice(0, max);

  let reason: string;
  if (domains.length === 0) {
    reason = "Aucun domaine specifique detecte — chargement Core L1 uniquement";
  } else if (product && DOMAIN_PATTERNS.find(d => d.product_match?.includes(product))) {
    reason = `Product '${product}' -> domaine principal forcer`;
  } else {
    reason = `Mots-cles detectes : ${domains.join(", ")}`;
  }

  return { domains, scores, reason };
}

/**
 * Filtre TOOL_DECLARATIONS pour ne garder que :
 *   - Tous les Core L1 (toujours dispos)
 *   - Les tools L2 des domaines passes en argument
 *
 * Permet de reduire la taille des declarations envoyees au LLM.
 */
export function filterToolsByDomains(
  allTools: OllamaTool[],
  toolToDomain: Map<string, Domain | "core">,
  domains: Domain[],
): OllamaTool[] {
  if (domains.length === 0) {
    // Pas de domaine -> juste Core L1
    return allTools.filter(t => toolToDomain.get(t.function.name) === "core");
  }
  const domainSet = new Set<string>(domains);
  domainSet.add("core");
  return allTools.filter(t => {
    const d = toolToDomain.get(t.function.name);
    return d ? domainSet.has(d) : false;
  });
}

/**
 * Construit la map tool_name -> domain a partir de TOOL_DECLARATIONS.
 * Cette map est calculee une seule fois au boot.
 */
export function buildToolDomainMap(coreNames: string[], l2Map: Record<Domain, string[]>, l3Map?: Record<string, string[]>): Map<string, Domain | "core"> {
  const m = new Map<string, Domain | "core">();
  for (const n of coreNames) m.set(n, "core");
  for (const [d, names] of Object.entries(l2Map)) {
    for (const n of names) m.set(n, d as Domain);
  }
  // L3 tools : on les associe au domaine "parent" pour le routing
  // (ex: compute_kpi_dashboard est categorie 'finance' meme si app_id='cockpit-fa')
  if (l3Map) {
    // Domaine « parent » de chaque app encore active (catalogue commercial).
    // advist → documentaire (signature) ; atlasbanx → audit (anomalies bancaires).
    const l3ToDomain: Record<string, Domain> = {
      "cockpit-fa": "finance",
      "advist": "documentaire",
      "atlasbanx": "audit",
      "liasspilot": "fiscal",
      "tablesmart": "retail",
      "atlas-fa": "finance",
    };
    for (const [app, names] of Object.entries(l3Map)) {
      const dom = l3ToDomain[app];
      if (dom) for (const n of names) m.set(n, dom);
    }
  }
  return m;
}

/**
 * Mapping des tools L2 par domaine. A maintenir en sync avec tools.ts.
 * (Pourrait etre genere automatiquement depuis le registry DB en runtime.)
 */
export const L2_TOOLS_BY_DOMAIN: Record<Domain, string[]> = {
  finance: [
    "parse_grand_livre", "generate_balance_sheet", "generate_compte_resultat",
    "apply_benford_law", "reconcile_bank_statement", "compute_irpp_uemoa",
    "compute_is_uemoa", "compute_cnss_contribution", "validate_journal_entry",
    "detect_accounting_anomalies",
  ],
  rh: [
    "compute_smig", "compute_salaire_net", "compute_iuts", "compute_its",
    "compute_taxes_parafiscales", "compute_conges_payes",
    "compute_indemnite_licenciement", "compute_prime_anciennete",
    "generate_fiche_paie", "simulate_embauche_cost",
  ],
  immobilier: [
    "compute_loyer_revise", "compute_depot_garantie", "compute_taxe_fonciere",
    "compute_charges_copropriete", "compute_rendement_locatif",
  ],
  retail: [
    "compute_marge_brute", "compute_taux_marque", "compute_rotation_stocks",
    "compute_point_mort", "compute_panier_moyen",
  ],
  documentaire: [
    "classify_document", "extract_document_metadata", "compute_legal_retention",
    "detect_document_duplicates", "generate_archive_index",
  ],
  audit: [
    "compute_audit_sample", "compute_materiality", "test_balance_general",
    "analyze_variance_interperiode", "score_internal_control",
  ],
  tresorerie: [
    "forecast_cashflow", "compute_decouvert_cost", "compute_escompte_commercial",
    "compute_factoring_cost", "score_bank_health",
  ],
  commercial: [
    "score_lead", "compute_commission", "forecast_pipeline",
    "score_churn_risk", "analyze_customer_segment",
  ],
  fiscal: [
    "compute_irvm", "compute_droit_enregistrement", "compute_minimum_forfaitaire",
    "forecast_dsf", "compute_credit_tva",
  ],
  juridique: [
    "compute_capital_minimum", "validate_societe_creation", "forecast_ag_quorum",
    "compute_mise_demeure_delai", "analyze_contract_clauses",
  ],
  marketing: [
    "compute_cac_ltv_ratio", "compute_campaign_roi", "ab_test_significance",
    "compute_conversion_funnel", "forecast_growth_compound",
  ],
  // Phase 5
  productivite: [
    "prioritize_tasks", "compute_meeting_efficiency", "schedule_optimization",
    "estimate_project_duration", "compute_team_capacity",
  ],
  support: [
    "compute_csat_nps", "score_ticket_priority", "compute_sla_compliance",
    "predict_resolution_time", "analyze_ticket_categories",
  ],
};

/**
 * Tools L3 app-specific. Charges quand le product matche l'app_id.
 */
// NB : seules les apps présentes au catalogue commercial sont câblées ici.
// Les 9 apps « fantômes » (cashpilot, duedeck, wisehr, wisefm, atlas-lease,
// atlas-mall-suite, atlastrade, docjourney, cockpit-journey) ont été purgées
// (audit 360° §Uniformité). advist/atlasbanx exposent désormais leurs vrais
// tools métier (signature ; audit d'anomalies) — voir l3_advist / l3_atlasbanx.
export const L3_TOOLS_BY_APP: Record<string, string[]> = {
  "cockpit-fa": [
    "compute_kpi_dashboard", "detect_cycle_breaks", "forecast_dso_evolution",
    "compute_grand_livre_summary", "validate_clos_exercice",
    "compute_immobilisations_amortissements", "detect_ecart_inventaire",
    "generate_situation_intermediaire",
  ],
  "advist": ["verify_signature_validity", "generate_otp_challenge", "define_signature_circuit", "track_signature_status", "compute_signature_legal_value"],
  "atlasbanx": ["apply_benford_analysis", "compute_zscore_anomalies", "detect_ghost_fees", "score_bank_risk_global", "generate_audit_report_anomalies"],
  "liasspilot": ["generate_liasse_fiscale", "check_conformite_fiscale", "compute_acomptes_provisionnels", "generate_declaration_tva", "detect_erreurs_liasse"],
  "tablesmart": ["compute_addition_table", "compute_taux_occupation_salle", "analyze_menu_performance", "forecast_approvisionnement", "compute_pourboire_repartition"],
  "atlas-fa": ["consolidate_group_accounts", "compute_intercompany_eliminations", "generate_reporting_pnl", "compute_free_cash_flow", "compute_wacc_company"],
};

/**
 * Aliases d'app_id : certaines apps s'annoncent avec un id de facturation ou un
 * ancien codename différent de l'id canonique utilisé par le routage core/outils.
 * On normalise vers la convention canonique pour qu'une app puisse s'annoncer
 * avec son id historique sans casser le routage SSO → L3.
 *   - atlas-compta → atlas-fa   (id de facturation → id core)
 *   - taxpilot     → liasspilot (id de facturation → id core)
 *   - scrutix      → atlasbanx  (ancien codename → id canonique, cf. seed_atlasbanx)
 */
export const APP_ID_ALIASES: Record<string, string> = {
  "atlas-compta": "atlas-fa",
  "taxpilot": "liasspilot",
  "scrutix": "atlasbanx",
};

export function normalizeAppId(id?: string): string | undefined {
  if (!id) return id;
  return APP_ID_ALIASES[id] ?? id;
}

/**
 * Liste des Core L1 tools (toujours charges).
 */
export const CORE_L1_TOOLS: string[] = [
  "get_financial_data", "search_knowledge", "search_documents", "get_memory",
  "generate_alert", "save_business_rule",
  "compute_ratio", "compute_tva", "apply_prorata_360", "format_money_fcfa", "convert_currency",
  "plan_task", "chain_of_thought", "verify_hypothesis", "route_to_model",
  "save_episodic_memory", "save_semantic_memory", "recall_similar_cases",
  "update_memory", "forget_memory",
  "search_app_knowledge", "search_tenant_documents", "index_document",
  "generate_report", "send_notification", "log_decision",
  "extract_from_image", "parse_document_visual",
  "verify_rls_context", "audit_trail_write", "check_compliance",
  // Workflows orchestres : toujours dispo
  "workflow_audit_complet_societe", "workflow_closing_mensuel",
  "workflow_due_diligence_lite", "workflow_simulation_recrutement",
  "workflow_analyse_client_360",
  "workflow_closing_annuel", "workflow_paie_mensuelle", "workflow_audit_juridique",
  // Meta-tools : toujours dispo (le LLM doit pouvoir charger des tools dynamiquement)
  "load_domain_tools", "list_available_tools", "describe_tool",
];
