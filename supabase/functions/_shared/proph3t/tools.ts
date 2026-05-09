// Function-calling toolbelt exposed to PROPH3T (CDC §3.2 Core L1 tools — 28 total).
// Chaque tool: declaration JSON Schema + runner que l'orchestrateur appelle.

import { supabaseAdmin } from "../supabase.ts";
import type { OllamaTool } from "./ollama.ts";
import { embed } from "./ollama.ts";
import {
  computeRatio, computeTVA, applyProrata360, formatMoneyFcfa, convertCurrency,
  type RatioType, type FinancialInputs, type CountryCode, type TvaRateType,
} from "./calculators.ts";
import {
  saveEpisodicMemory, saveSemanticMemory, recallSimilarCases,
  updateMemory, forgetMemory,
} from "./memory.ts";
import { searchAppKnowledge, searchTenantDocuments, indexDocument } from "./rag.ts";
import { makeEmbedding, resolveGeminiKey } from "./embeddings.ts";
import { planTask, chainOfThought, verifyHypothesis, routeToModel } from "./orchestration.ts";
import { generateReport, sendNotification, logDecision } from "./communication.ts";
import { extractFromImage, parseDocumentVisual } from "./vision.ts";
import { verifyRlsContext, auditTrailWrite, checkCompliance } from "./security.ts";
import {
  parseGrandLivre, generateBalanceSheet, generateCompteResultat, applyBenfordLaw,
  reconcileBankStatement, computeIrppUemoa, computeIsUemoa, computeCnssContribution,
  validateJournalEntry, detectAccountingAnomalies,
} from "./finance.ts";
import {
  computeSmig, computeSalaireNet, computeIuts, computeIts, computeTaxesParafiscales,
  computeCongesPayes, computeIndemniteLicenciement, computePrimeAnciennete,
  generateFichePaie, simulateEmbaucheCost,
} from "./rh.ts";
import {
  computeLoyerRevise, computeDepotGarantie, computeTaxeFonciere,
  computeChargesCopropriete, computeRendementLocatif,
} from "./immobilier.ts";
import {
  computeMargeBrute, computeTauxMarque, computeRotationStocks,
  computePointMort, computePanierMoyen,
} from "./retail.ts";
import {
  classifyDocument, extractDocumentMetadata, computeLegalRetention,
  detectDocumentDuplicates, generateArchiveIndex,
} from "./documentaire.ts";
import {
  computeAuditSample, computeMateriality, testBalanceGeneral,
  analyzeVarianceInterperiode, scoreInternalControl,
} from "./audit_metier.ts";
import {
  forecastCashflow, computeDecouvertCost, computeEscompteCommercial,
  computeFactoringCost, scoreBankHealth,
} from "./tresorerie.ts";
import {
  scoreLead, computeCommission, forecastPipeline,
  scoreChurnRisk, analyzeCustomerSegment,
} from "./commercial.ts";
import {
  computeIrvm, computeDroitEnregistrement, computeMinimumForfaitaire,
  forecastDsf, computeCreditTva,
} from "./fiscal.ts";
import {
  computeCapitalMinimum, validateSocieteCreation, forecastAgQuorum,
  computeMiseDemeureDelai, analyzeContractClauses,
} from "./juridique.ts";
import {
  computeCacLtvRatio, computeCampaignRoi, abTestSignificance,
  computeConversionFunnel, forecastGrowthCompound,
} from "./marketing.ts";

export type ToolName =
  // Data L1 (legacy + core)
  | "get_financial_data"
  | "search_knowledge"        // legacy alias de search_app_knowledge (Ollama embeddings)
  | "search_documents"        // legacy alias de search_tenant_documents (Ollama embeddings)
  | "get_memory"              // legacy : query directe par type
  | "generate_alert"
  | "save_business_rule"
  // Calcs L1 (5)
  | "compute_ratio"
  | "compute_tva"
  | "apply_prorata_360"
  | "format_money_fcfa"
  | "convert_currency"
  // Reasoning L1 (4)
  | "plan_task"
  | "chain_of_thought"
  | "verify_hypothesis"
  | "route_to_model"
  // Memory L1 (5)
  | "save_episodic_memory"
  | "save_semantic_memory"
  | "recall_similar_cases"
  | "update_memory"
  | "forget_memory"
  // RAG L1 (3)
  | "search_app_knowledge"
  | "search_tenant_documents"
  | "index_document"
  // Output L1 (3)
  | "generate_report"
  | "send_notification"
  | "log_decision"
  // Vision L1 (2)
  | "extract_from_image"
  | "parse_document_visual"
  // Security L1 (3)
  | "verify_rls_context"
  | "audit_trail_write"
  | "check_compliance"
  // FINANCE L2 (10) — Phase 1 CDC
  | "parse_grand_livre"
  | "generate_balance_sheet"
  | "generate_compte_resultat"
  | "apply_benford_law"
  | "reconcile_bank_statement"
  | "compute_irpp_uemoa"
  | "compute_is_uemoa"
  | "compute_cnss_contribution"
  | "validate_journal_entry"
  | "detect_accounting_anomalies"
  // RH L2 (10) — Phase 2
  | "compute_smig"
  | "compute_salaire_net"
  | "compute_iuts"
  | "compute_its"
  | "compute_taxes_parafiscales"
  | "compute_conges_payes"
  | "compute_indemnite_licenciement"
  | "compute_prime_anciennete"
  | "generate_fiche_paie"
  | "simulate_embauche_cost"
  // IMMOBILIER L2 (5)
  | "compute_loyer_revise"
  | "compute_depot_garantie"
  | "compute_taxe_fonciere"
  | "compute_charges_copropriete"
  | "compute_rendement_locatif"
  // RETAIL L2 (5)
  | "compute_marge_brute"
  | "compute_taux_marque"
  | "compute_rotation_stocks"
  | "compute_point_mort"
  | "compute_panier_moyen"
  // DOCUMENTAIRE L2 (5)
  | "classify_document"
  | "extract_document_metadata"
  | "compute_legal_retention"
  | "detect_document_duplicates"
  | "generate_archive_index"
  // AUDIT L2 (5)
  | "compute_audit_sample"
  | "compute_materiality"
  | "test_balance_general"
  | "analyze_variance_interperiode"
  | "score_internal_control"
  // TRESORERIE L2 (5)
  | "forecast_cashflow"
  | "compute_decouvert_cost"
  | "compute_escompte_commercial"
  | "compute_factoring_cost"
  | "score_bank_health"
  // COMMERCIAL L2 (5)
  | "score_lead"
  | "compute_commission"
  | "forecast_pipeline"
  | "score_churn_risk"
  | "analyze_customer_segment"
  // FISCAL L2 (5) — Phase 4
  | "compute_irvm"
  | "compute_droit_enregistrement"
  | "compute_minimum_forfaitaire"
  | "forecast_dsf"
  | "compute_credit_tva"
  // JURIDIQUE L2 (5)
  | "compute_capital_minimum"
  | "validate_societe_creation"
  | "forecast_ag_quorum"
  | "compute_mise_demeure_delai"
  | "analyze_contract_clauses"
  // MARKETING L2 (5)
  | "compute_cac_ltv_ratio"
  | "compute_campaign_roi"
  | "ab_test_significance"
  | "compute_conversion_funnel"
  | "forecast_growth_compound";

/** Convertit les inputs string -> bigint pour les champs financiers. */
function parseFinancialInputs(raw: Record<string, unknown>): FinancialInputs {
  const out: FinancialInputs = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined || v === null || v === "") continue;
    if (typeof v === "string" || typeof v === "number") {
      try {
        (out as Record<string, unknown>)[k] = BigInt(typeof v === "number" ? Math.trunc(v) : v);
      } catch {
        (out as Record<string, unknown>)[k] = v;
      }
    }
  }
  return out;
}

/** Helper: recupere le taux le plus recent pour une paire de devises. */
async function getCurrencyRate(from: string, to: string, date?: string): Promise<number | null> {
  if (from === to) return 1;
  let qb = supabaseAdmin.from("proph3t_currency_rates")
    .select("rate, rate_date")
    .eq("from_code", from)
    .eq("to_code", to)
    .order("rate_date", { ascending: false })
    .limit(1);
  if (date) qb = qb.lte("rate_date", date);
  const { data } = await qb;
  return data?.[0]?.rate ?? null;
}

/** Serialise les bigint pour JSON. */
function jsonifyBigInt(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value, (_k, v) => typeof v === "bigint" ? v.toString() : v));
}

export const TOOL_DECLARATIONS: OllamaTool[] = [
  // ─────────────── Data L1 (legacy + core) ───────────────
  {
    type: "function",
    function: {
      name: "get_financial_data",
      description: "Récupère un KPI ou jeu de données financier d'une société sur une période.",
      parameters: {
        type: "object",
        properties: {
          society_id: { type: "string", description: "UUID de la société" },
          period: { type: "string", description: "ISO date ou plage 'YYYY-MM' / 'YYYY-Qx'" },
          indicator: { type: "string", description: "Nom de l'indicateur, ex: 'CA','BFR','tresorerie'" },
        },
        required: ["society_id", "indicator"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_knowledge",
      description: "[Legacy / Ollama only] Recherche sémantique dans la base SYSCOHADA pré-indexée. Necessite Ollama embeddings.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          category: { type: "string", enum: ["syscohada","ohada","fiscal","rh","immobilier","retail","sectoriel","autre"] },
          k: { type: "integer", default: 5 },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_documents",
      description: "[Legacy / Ollama only] Recherche sémantique dans les documents propres à la société (RAG dynamique).",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          society_id: { type: "string" },
          product: { type: "string" },
          k: { type: "integer", default: 8 },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_memory",
      description: "Récupère observations, règles métier ou Q/R validées pour une société (query directe par type).",
      parameters: {
        type: "object",
        properties: {
          society_id: { type: "string" },
          memory_type: { type: "string", enum: ["observations","rules","validated_qa"] },
          limit: { type: "integer", default: 20 },
        },
        required: ["society_id", "memory_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_alert",
      description: "Émet une alerte proactive (P0/P1/P2) à destination des utilisateurs concernés.",
      parameters: {
        type: "object",
        properties: {
          society_id: { type: "string" },
          product: { type: "string" },
          severity: { type: "string", enum: ["P0","P1","P2"] },
          alert_type: { type: "string" },
          title: { type: "string" },
          message: { type: "string" },
          payload: { type: "object" },
        },
        required: ["society_id", "product", "severity", "alert_type", "title", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_business_rule",
      description: "Enregistre une règle métier validée par l'utilisateur (admin).",
      parameters: {
        type: "object",
        properties: {
          society_id: { type: "string" },
          product: { type: "string" },
          rule_text: { type: "string" },
          rule_payload: { type: "object" },
        },
        required: ["rule_text"],
      },
    },
  },

  // ─────────────── Calcs L1 (5) ───────────────
  {
    type: "function",
    function: {
      name: "compute_ratio",
      description: "Calcule un ratio financier SYSCOHADA de maniere deterministe (TS pur, AUCUN LLM dans la formule). Argent en centimes (FCFA × 100).",
      parameters: {
        type: "object",
        properties: {
          ratio_type: {
            type: "string",
            enum: ["fr", "bfr", "tresorerie_nette", "autonomie_financiere", "liquidite_generale", "caf", "ebe", "altman_z_score", "dso", "dpo"],
            description: "Type de ratio"
          },
          inputs: {
            type: "object",
            description: "Inputs financiers en CENTIMES FCFA (string pour bigint).",
            properties: {
              totalActif: { type: "string" }, capitauxPropres: { type: "string" }, dettesFinancieres: { type: "string" },
              immobilisationsNettes: { type: "string" }, stocks: { type: "string" }, creancesClients: { type: "string" },
              autresCreances: { type: "string" }, tresorerieActif: { type: "string" }, dettesFournisseurs: { type: "string" },
              dettesFiscalesSociales: { type: "string" }, autresDettes: { type: "string" }, tresoreriePassif: { type: "string" },
              chiffreAffaires: { type: "string" }, achatsConsommes: { type: "string" }, chargesPersonnel: { type: "string" },
              impotsTaxes: { type: "string" }, subventionsExploitation: { type: "string" }, dotationsAmortissements: { type: "string" },
              reprises: { type: "string" }, resultatNet: { type: "string" },
            },
          },
        },
        required: ["ratio_type", "inputs"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compute_tva",
      description: "Calcule la TVA UEMOA/CEMAC sur une base HT. Retourne base + taux + montant TVA + total TTC.",
      parameters: {
        type: "object",
        properties: {
          base_ht_centimes: { type: "string" },
          country: { type: "string", enum: ["CI","SN","BF","ML","BJ","TG","NE","GW","CM","CG","GA","TD","CF"] },
          rate_type: { type: "string", enum: ["standard","reduit","zero","exonere"], default: "standard" },
        },
        required: ["base_ht_centimes", "country"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "apply_prorata_360",
      description: "Applique la regle de prorata 360 jours SYSCOHADA (interets, cotisations).",
      parameters: {
        type: "object",
        properties: {
          amount_centimes: { type: "string" },
          days: { type: "integer", minimum: 0, maximum: 360 },
        },
        required: ["amount_centimes", "days"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "format_money_fcfa",
      description: "Formate un montant en centimes en string lisible : '1 234 567 FCFA'.",
      parameters: {
        type: "object",
        properties: { centimes: { type: "string" } },
        required: ["centimes"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "convert_currency",
      description: "Convertit un montant entre devises (XOF/XAF/EUR/USD). Utilise les taux BCEAO/BEAC fixes ou le taux historique le plus recent.",
      parameters: {
        type: "object",
        properties: {
          amount_centimes: { type: "string", description: "Montant en centimes (devise source)" },
          from_code: { type: "string", description: "ISO 4217 source (XOF, EUR, USD…)" },
          to_code: { type: "string", description: "ISO 4217 cible" },
          date: { type: "string", description: "YYYY-MM-DD : taux a la date (defaut: dernier connu)" },
        },
        required: ["amount_centimes", "from_code", "to_code"],
      },
    },
  },

  // ─────────────── Reasoning L1 (4) ───────────────
  {
    type: "function",
    function: {
      name: "plan_task",
      description: "Decompose une tache complexe en etapes ordonnees avant de l'executer (CDC §3.2 reasoning).",
      parameters: {
        type: "object",
        properties: {
          task: { type: "string", description: "Tache a planifier" },
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                step: { type: "integer" },
                description: { type: "string" },
                tool: { type: "string", description: "Tool a appeler (optionnel)" },
                inputs: { type: "object" },
                expected_output: { type: "string" },
              },
              required: ["description"],
            },
          },
          estimated_iterations: { type: "integer" },
        },
        required: ["task", "steps"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "chain_of_thought",
      description: "Encapsule une chaine de raisonnement explicite (Q -> steps -> conclusion + confiance + caveats).",
      parameters: {
        type: "object",
        properties: {
          question: { type: "string" },
          reasoning_steps: { type: "array", items: { type: "string" } },
          conclusion: { type: "string" },
          confidence: { type: "integer", minimum: 0, maximum: 100 },
          caveats: { type: "array", items: { type: "string" } },
        },
        required: ["question", "reasoning_steps", "conclusion", "confidence"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "verify_hypothesis",
      description: "Verifie une hypothese metier en confrontant evidence pour/contre. Retourne verdict + score plausibilite.",
      parameters: {
        type: "object",
        properties: {
          hypothesis: { type: "string" },
          evidence_for: { type: "array", items: { type: "string" } },
          evidence_against: { type: "array", items: { type: "string" } },
          sources: { type: "array", items: { type: "string" } },
        },
        required: ["hypothesis"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "route_to_model",
      description: "Recommande un LLM optimal selon le type de tache (CDC §5.3 routing).",
      parameters: {
        type: "object",
        properties: {
          task_type: { type: "string", enum: ["simple_qa", "analytical", "vision", "cost_sensitive", "long_context", "code_gen"] },
          context_size_estimate: { type: "integer", description: "Tokens estimes" },
          user_has_byok: {
            type: "object",
            properties: {
              anthropic: { type: "boolean" },
              gemini: { type: "boolean" },
            },
          },
        },
        required: ["task_type"],
      },
    },
  },

  // ─────────────── Memory L1 (5) ───────────────
  {
    type: "function",
    function: {
      name: "save_episodic_memory",
      description: "Enregistre un evenement date dans la memoire episodique (CDC §3.2 memoire).",
      parameters: {
        type: "object",
        properties: {
          tenant_id: { type: "string" }, user_id: { type: "string" }, app_id: { type: "string" },
          event_type: { type: "string", description: "ex: 'alert_triggered', 'rule_applied', 'user_correction'" },
          event_data: { type: "object" },
          occurred_at: { type: "string", description: "ISO timestamp (defaut: now)" },
        },
        required: ["event_type", "event_data"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_semantic_memory",
      description: "Enregistre un fait/regle metier dans la memoire semantique (avec scope global/app/tenant/user).",
      parameters: {
        type: "object",
        properties: {
          scope: { type: "string", enum: ["global", "app", "tenant", "user"] },
          scope_id: { type: "string" },
          fact: { type: "string", description: "Connaissance en langage naturel" },
          source: { type: "string", description: "'validation_user', 'inference', 'training', 'manual'" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          validated_by: { type: "string", description: "UUID user qui valide (optionnel)" },
        },
        required: ["scope", "fact", "source"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "recall_similar_cases",
      description: "Recherche des cas similaires dans la memoire (episodique + semantique). Cosine similarity si embedding dispo, sinon fallback texte.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          scope: { type: "string", enum: ["episodic", "semantic", "both"], default: "both" },
          top_k: { type: "integer", default: 5 },
          tenant_id: { type: "string" },
          app_id: { type: "string" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_memory",
      description: "Met a jour une entree memoire existante (correction, enrichissement).",
      parameters: {
        type: "object",
        properties: {
          memory_id: { type: "string" },
          scope: { type: "string", enum: ["episodic", "semantic"] },
          patch: { type: "object", description: "Champs a mettre a jour" },
        },
        required: ["memory_id", "scope", "patch"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "forget_memory",
      description: "Soft-delete RGPD pour memoire semantique, hard-delete pour episodique. Reason obligatoire.",
      parameters: {
        type: "object",
        properties: {
          memory_id: { type: "string" },
          scope: { type: "string", enum: ["episodic", "semantic"] },
          reason: { type: "string", description: "Justification RGPD obligatoire" },
        },
        required: ["memory_id", "scope", "reason"],
      },
    },
  },

  // ─────────────── RAG L1 (3) ───────────────
  {
    type: "function",
    function: {
      name: "search_app_knowledge",
      description: "Recherche dans la base de connaissances knowledge (scope global ou app). Doctrine OHADA, CGI, manuels metier.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          scope_id: { type: "string", description: "ex: 'cockpit-fa', 'global'" },
          source_type: { type: "string", description: "'syscohada', 'audcif', 'cgi-ci', etc." },
          top_k: { type: "integer", default: 5 },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_tenant_documents",
      description: "Recherche dans les documents propres a un tenant (factures, contrats, bilans clients).",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          tenant_id: { type: "string" },
          source_type: { type: "string" },
          top_k: { type: "integer", default: 8 },
        },
        required: ["query", "tenant_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "index_document",
      description: "Indexe un nouveau document dans le RAG (chunking automatique + embeddings si dispo).",
      parameters: {
        type: "object",
        properties: {
          scope: { type: "string", enum: ["global", "app", "tenant"] },
          scope_id: { type: "string" },
          source_url: { type: "string" },
          source_type: { type: "string" },
          title: { type: "string" },
          content: { type: "string" },
          metadata: { type: "object" },
        },
        required: ["scope", "source_type", "title", "content"],
      },
    },
  },

  // ─────────────── Output L1 (3) ───────────────
  {
    type: "function",
    function: {
      name: "generate_report",
      description: "Genere un rapport structure (markdown / html / json) a partir de sections.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          subtitle: { type: "string" },
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: { heading: { type: "string" }, content: { type: "string" } },
              required: ["heading", "content"],
            },
          },
          format: { type: "string", enum: ["markdown", "html", "json"], default: "markdown" },
          metadata: { type: "object" },
        },
        required: ["title", "sections"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_notification",
      description: "Envoie une notification (in-app / email / sms / all) a un utilisateur ou tenant.",
      parameters: {
        type: "object",
        properties: {
          user_id: { type: "string" }, tenant_id: { type: "string" }, app_id: { type: "string" },
          channel: { type: "string", enum: ["in_app", "email", "sms", "all"] },
          severity: { type: "string", enum: ["P0", "P1", "P2", "info"] },
          title: { type: "string" },
          message: { type: "string" },
          payload: { type: "object" },
        },
        required: ["channel", "severity", "title", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_decision",
      description: "Log une decision metier (audit + memoire episodique). Tracability requise mode strict.",
      parameters: {
        type: "object",
        properties: {
          decision: { type: "string" },
          rationale: { type: "string" },
          confidence: { type: "integer", minimum: 0, maximum: 100 },
          inputs_summary: { type: "object" },
          user_id: { type: "string" }, tenant_id: { type: "string" }, app_id: { type: "string" },
          subject_type: { type: "string" }, subject_id: { type: "string" },
        },
        required: ["decision", "rationale", "confidence"],
      },
    },
  },

  // ─────────────── Vision L1 (2) ───────────────
  {
    type: "function",
    function: {
      name: "extract_from_image",
      description: "Extrait du texte/donnees d'une image (OCR + comprehension via Gemini Vision). Necessite cle Gemini.",
      parameters: {
        type: "object",
        properties: {
          image_base64: { type: "string", description: "Image en base64 (sans prefix data:)" },
          mime_type: { type: "string", description: "image/png, image/jpeg, application/pdf" },
          prompt: { type: "string", description: "Ce qu'on cherche a extraire" },
          expected_schema: { type: "object", description: "Schema JSON attendu (force JSON output)" },
        },
        required: ["image_base64", "mime_type", "prompt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "parse_document_visual",
      description: "Parse un document visuel (facture, releve, bilan, fiche paie) en JSON structure SYSCOHADA.",
      parameters: {
        type: "object",
        properties: {
          image_base64: { type: "string" },
          mime_type: { type: "string" },
          document_type: {
            type: "string",
            enum: ["facture", "releve_bancaire", "bilan", "compte_resultat", "fiche_paie", "contrat", "auto"],
          },
        },
        required: ["image_base64", "mime_type", "document_type"],
      },
    },
  },

  // ─────────────── Security L1 (3) ───────────────
  {
    type: "function",
    function: {
      name: "verify_rls_context",
      description: "Verifie que le contexte RLS d'une table empeche bien la fuite cross-tenant.",
      parameters: {
        type: "object",
        properties: {
          user_id: { type: "string" },
          expected_tenant_id: { type: "string" },
          table_to_test: { type: "string" },
          test_query_filter: { type: "object" },
        },
        required: ["user_id", "table_to_test"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "audit_trail_write",
      description: "Ecrit une entree dans l'audit trail chaine SHA-256 (CDC §4.1). Immuable.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string" },
          actor_user_id: { type: "string" },
          subject_type: { type: "string" },
          subject_id: { type: "string" },
          content: { type: "object" },
        },
        required: ["action", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_compliance",
      description: "Verifie compliance CDC : citations, confidence, RGPD PII, money en BIGINT centimes.",
      parameters: {
        type: "object",
        properties: {
          mode: { type: "string", enum: ["strict", "standard"] },
          payload: { type: "object" },
          citations: { type: "array", items: { type: "object" } },
          confidence: { type: "integer", minimum: 0, maximum: 100 },
          app_id: { type: "string" },
          rules: {
            type: "object",
            properties: {
              min_confidence: { type: "integer" },
              require_citations: { type: "boolean" },
              forbid_pii: { type: "boolean" },
            },
          },
        },
        required: ["mode", "payload"],
      },
    },
  },

  // ─────────────── FINANCE L2 (10) — Phase 1 ───────────────
  {
    type: "function",
    function: {
      name: "parse_grand_livre",
      description: "Parse un grand livre SYSCOHADA (CSV ou JSON) en JournalEntry[]. Verifie equilibre debit/credit.",
      parameters: {
        type: "object",
        properties: {
          format: { type: "string", enum: ["csv", "json"] },
          content: { type: "string", description: "Contenu brut du fichier" },
          decimal_separator: { type: "string", enum: [".", ","], default: "," },
          thousand_separator: { type: "string", default: " " },
        },
        required: ["format", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_balance_sheet",
      description: "Produit le Bilan SYSCOHADA (Actif/Passif) a partir des ecritures. Verifie equilibre.",
      parameters: {
        type: "object",
        properties: {
          entries: { type: "array", description: "JournalEntry[] avec compte, debit_centimes, credit_centimes" },
          exercice: { type: "string", description: "Annee, ex 2025" },
          raison_sociale: { type: "string" },
        },
        required: ["entries", "exercice", "raison_sociale"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_compte_resultat",
      description: "Produit le Compte de Resultat (Charges classe 6 / Produits classe 7).",
      parameters: {
        type: "object",
        properties: {
          entries: { type: "array" },
          exercice: { type: "string" },
          raison_sociale: { type: "string" },
        },
        required: ["entries", "exercice", "raison_sociale"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "apply_benford_law",
      description: "Detecte fraude/anomalies via la loi de Benford sur le 1er chiffre. Retourne chi2 + verdict.",
      parameters: {
        type: "object",
        properties: {
          amounts_centimes: { type: "array", items: { type: "string" }, description: "Liste de montants en centimes" },
          min_amount_threshold: { type: "integer", description: "Ignore les petits montants < threshold (centimes)" },
        },
        required: ["amounts_centimes"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reconcile_bank_statement",
      description: "Rapprochement bancaire automatique : ecritures comptables vs releve bancaire.",
      parameters: {
        type: "object",
        properties: {
          compta_entries: { type: "array" },
          bank_entries: { type: "array" },
          tolerance_days: { type: "integer", default: 3 },
        },
        required: ["compta_entries", "bank_entries"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compute_irpp_uemoa",
      description: "Calcule IRPP avec bareme progressif UEMOA (CI/SN/BF disponibles).",
      parameters: {
        type: "object",
        properties: {
          revenu_imposable_centimes: { type: "string" },
          pays: { type: "string", enum: ["CI", "SN", "BF", "ML", "BJ", "TG", "NE"] },
          parts_fiscales: { type: "number", default: 1 },
        },
        required: ["revenu_imposable_centimes", "pays"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compute_is_uemoa",
      description: "Calcule IS (Impot sur les Societes) selon taux du pays UEMOA/CEMAC.",
      parameters: {
        type: "object",
        properties: {
          benefice_imposable_centimes: { type: "string" },
          pays: { type: "string" },
          taux_reduit: { type: "boolean", default: false },
        },
        required: ["benefice_imposable_centimes", "pays"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compute_cnss_contribution",
      description: "Calcule cotisations CNSS/CNPS (salarie + employeur) avec plafond pays.",
      parameters: {
        type: "object",
        properties: {
          salaire_brut_centimes: { type: "string" },
          pays: { type: "string" },
        },
        required: ["salaire_brut_centimes", "pays"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "validate_journal_entry",
      description: "Valide partie double, comptes SYSCOHADA, dates. Retourne errors[] + warnings[].",
      parameters: {
        type: "object",
        properties: {
          entries: { type: "array" },
          current_date: { type: "string", description: "ISO date pour validation 'pas dans le futur'" },
        },
        required: ["entries"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "detect_accounting_anomalies",
      description: "Detecte ecritures suspectes : montants ronds, weekend, doublons, sous-seuils.",
      parameters: {
        type: "object",
        properties: {
          entries: { type: "array" },
          thresholds: { type: "array", items: { type: "integer" }, description: "Seuils reglementaires en FCFA" },
        },
        required: ["entries"],
      },
    },
  },

  // ─────────────── RH L2 (10) — Phase 2 ───────────────
  { type: "function", function: { name: "compute_smig", description: "Retourne le SMIG mensuel ou horaire d'un pays UEMOA/CEMAC.", parameters: { type: "object", properties: { pays: { type: "string" }, type: { type: "string", enum: ["mensuel", "horaire"] } }, required: ["pays"] } } },
  { type: "function", function: { name: "compute_salaire_net", description: "Calcule salaire net (brut moins cotisations CNSS salarie et ITS/IUTS).", parameters: { type: "object", properties: { salaire_brut_centimes: { type: "string" }, pays: { type: "string" }, enfants_a_charge: { type: "integer" } }, required: ["salaire_brut_centimes", "pays"] } } },
  { type: "function", function: { name: "compute_iuts", description: "Calcule IUTS (Impot Unique sur Traitements Salaires) Burkina Faso.", parameters: { type: "object", properties: { salaire_brut_centimes: { type: "string" } }, required: ["salaire_brut_centimes"] } } },
  { type: "function", function: { name: "compute_its", description: "Calcule ITS (Impot sur Traitements et Salaires) UEMOA bareme progressif.", parameters: { type: "object", properties: { salaire_imposable_centimes: { type: "string" }, pays: { type: "string" } }, required: ["salaire_imposable_centimes", "pays"] } } },
  { type: "function", function: { name: "compute_taxes_parafiscales", description: "Calcule taxes parafiscales (FDFP CI, FNAEF SN, TPA BF, etc.).", parameters: { type: "object", properties: { salaire_brut_centimes: { type: "string" }, pays: { type: "string" } }, required: ["salaire_brut_centimes", "pays"] } } },
  { type: "function", function: { name: "compute_conges_payes", description: "Calcule conges payes acquis (2.5j/mois) et indemnite solde.", parameters: { type: "object", properties: { salaire_mensuel_brut_centimes: { type: "string" }, mois_travailles: { type: "integer" }, jours_deja_pris: { type: "integer" } }, required: ["salaire_mensuel_brut_centimes", "mois_travailles"] } } },
  { type: "function", function: { name: "compute_indemnite_licenciement", description: "Indemnite legale licenciement OHADA (30/35/40% selon anciennete, plafond 12 mois).", parameters: { type: "object", properties: { salaire_moyen_centimes: { type: "string" }, annees_anciennete: { type: "number" }, pays: { type: "string" } }, required: ["salaire_moyen_centimes", "annees_anciennete"] } } },
  { type: "function", function: { name: "compute_prime_anciennete", description: "Prime anciennete progressive (2-25%) convention collective UEMOA.", parameters: { type: "object", properties: { salaire_base_centimes: { type: "string" }, annees_anciennete: { type: "number" } }, required: ["salaire_base_centimes", "annees_anciennete"] } } },
  { type: "function", function: { name: "generate_fiche_paie", description: "Fiche de paie complete : lignes brut, retenues, net, cout employeur.", parameters: { type: "object", properties: { salarie: { type: "object" }, periode: { type: "string" }, pays: { type: "string" }, salaire_base_centimes: { type: "string" }, primes_centimes: { type: "string" }, heures_supp_centimes: { type: "string" }, annees_anciennete: { type: "number" } }, required: ["salarie", "periode", "pays", "salaire_base_centimes"] } } },
  { type: "function", function: { name: "simulate_embauche_cost", description: "Simule cout total employeur d'une embauche (bruts + cotisations + parafiscales) sur N mois.", parameters: { type: "object", properties: { salaire_brut_mensuel_centimes: { type: "string" }, pays: { type: "string" }, duree_mois: { type: "integer" } }, required: ["salaire_brut_mensuel_centimes", "pays"] } } },

  // ─────────────── IMMOBILIER L2 (5) ───────────────
  { type: "function", function: { name: "compute_loyer_revise", description: "Indexation loyer via IRL ou inflation BCEAO/BEAC.", parameters: { type: "object", properties: { loyer_actuel_centimes: { type: "string" }, irl_initial: { type: "number" }, irl_actuel: { type: "number" }, inflation_pct: { type: "number" } }, required: ["loyer_actuel_centimes"] } } },
  { type: "function", function: { name: "compute_depot_garantie", description: "Depot garantie selon usage (habitation/commercial/bureau).", parameters: { type: "object", properties: { loyer_mensuel_centimes: { type: "string" }, usage: { type: "string", enum: ["habitation", "commercial", "bureau", "autre"] }, pays: { type: "string" } }, required: ["loyer_mensuel_centimes", "usage"] } } },
  { type: "function", function: { name: "compute_taxe_fonciere", description: "Taxe fonciere bati/non-bati par pays UEMOA.", parameters: { type: "object", properties: { valeur_locative_annuelle_centimes: { type: "string" }, pays: { type: "string" }, type: { type: "string", enum: ["bati", "non_bati"] } }, required: ["valeur_locative_annuelle_centimes", "pays", "type"] } } },
  { type: "function", function: { name: "compute_charges_copropriete", description: "Repartition charges copropriete au tantieme.", parameters: { type: "object", properties: { charges_annuelles_totales_centimes: { type: "string" }, lots: { type: "array" }, cles_repartition: { type: "array" } }, required: ["charges_annuelles_totales_centimes", "lots"] } } },
  { type: "function", function: { name: "compute_rendement_locatif", description: "Rendement locatif brut/net (vacance + charges + taxe fonciere).", parameters: { type: "object", properties: { prix_achat_centimes: { type: "string" }, frais_acquisition_centimes: { type: "string" }, loyer_mensuel_centimes: { type: "string" }, charges_annuelles_centimes: { type: "string" }, taxe_fonciere_centimes: { type: "string" }, vacance_locative_pct: { type: "number" } }, required: ["prix_achat_centimes", "loyer_mensuel_centimes"] } } },

  // ─────────────── RETAIL L2 (5) ───────────────
  { type: "function", function: { name: "compute_marge_brute", description: "Marge brute commerciale (CA - cout achat) + taux + interpretation par secteur.", parameters: { type: "object", properties: { ca_ht_centimes: { type: "string" }, cout_achat_marchandises_centimes: { type: "string" } }, required: ["ca_ht_centimes", "cout_achat_marchandises_centimes"] } } },
  { type: "function", function: { name: "compute_taux_marque", description: "Taux marque vs taux marge + coefficient multiplicateur.", parameters: { type: "object", properties: { prix_achat_centimes: { type: "string" }, prix_vente_centimes: { type: "string" } }, required: ["prix_achat_centimes", "prix_vente_centimes"] } } },
  { type: "function", function: { name: "compute_rotation_stocks", description: "Rotation stocks et duree moyenne stockage.", parameters: { type: "object", properties: { ca_ou_achats_centimes: { type: "string" }, stock_debut_centimes: { type: "string" }, stock_fin_centimes: { type: "string" } }, required: ["ca_ou_achats_centimes", "stock_debut_centimes", "stock_fin_centimes"] } } },
  { type: "function", function: { name: "compute_point_mort", description: "Seuil de rentabilite (CA et quantite). CF / Taux marge sur CV.", parameters: { type: "object", properties: { charges_fixes_centimes: { type: "string" }, ca_total_centimes: { type: "string" }, charges_variables_centimes: { type: "string" }, prix_vente_unitaire_centimes: { type: "string" } }, required: ["charges_fixes_centimes", "ca_total_centimes", "charges_variables_centimes"] } } },
  { type: "function", function: { name: "compute_panier_moyen", description: "Panier moyen + frequence achat + LTV client.", parameters: { type: "object", properties: { ca_total_centimes: { type: "string" }, nb_transactions: { type: "integer" }, nb_clients_uniques: { type: "integer" }, duree_retention_annees: { type: "number" }, marge_brute_pct: { type: "number" } }, required: ["ca_total_centimes", "nb_transactions", "nb_clients_uniques"] } } },

  // ─────────────── DOCUMENTAIRE L2 (5) — Phase 3 ───────────────
  { type: "function", function: { name: "classify_document", description: "Classification automatique d'un document (facture/contrat/releve...) via heuristiques.", parameters: { type: "object", properties: { text_content: { type: "string" }, threshold: { type: "number" } }, required: ["text_content"] } } },
  { type: "function", function: { name: "extract_document_metadata", description: "Extrait dates, montants, emails, telephones, RIB, parties d'un document texte.", parameters: { type: "object", properties: { text_content: { type: "string" }, expected_doc_type: { type: "string" } }, required: ["text_content"] } } },
  { type: "function", function: { name: "compute_legal_retention", description: "Duree de conservation legale OHADA selon type de document.", parameters: { type: "object", properties: { document_type: { type: "string" }, date_creation: { type: "string" } }, required: ["document_type", "date_creation"] } } },
  { type: "function", function: { name: "detect_document_duplicates", description: "Detection doublons (hash exact + metadata + similarite Jaccard).", parameters: { type: "object", properties: { documents: { type: "array" }, similarity_threshold: { type: "number" } }, required: ["documents"] } } },
  { type: "function", function: { name: "generate_archive_index", description: "Index d'archivage CSV/JSON avec retention legale calculee.", parameters: { type: "object", properties: { documents: { type: "array" }, format: { type: "string", enum: ["csv", "json"] } }, required: ["documents"] } } },

  // ─────────────── AUDIT L2 (5) ───────────────
  { type: "function", function: { name: "compute_audit_sample", description: "Echantillonnage audit ISA 530 : taille + selection (systematique/aleatoire/ciblee).", parameters: { type: "object", properties: { population_size: { type: "integer" }, confidence_level: { type: "number" }, expected_error_rate: { type: "number" }, tolerable_error_rate: { type: "number" }, selection_method: { type: "string" }, amounts_centimes: { type: "array" } }, required: ["population_size"] } } },
  { type: "function", function: { name: "compute_materiality", description: "Seuil de signification ISA 320 (5% resultat / 1% CA / 1% capitaux).", parameters: { type: "object", properties: { resultat_avant_impot_centimes: { type: "string" }, ca_total_centimes: { type: "string" }, capitaux_propres_centimes: { type: "string" }, approche: { type: "string", enum: ["resultat", "ca", "capitaux"] } } } } },
  { type: "function", function: { name: "test_balance_general", description: "Controle equilibre balance + soldes anormaux + coherence GL.", parameters: { type: "object", properties: { balance: { type: "array" }, grand_livre: { type: "array" } }, required: ["balance"] } } },
  { type: "function", function: { name: "analyze_variance_interperiode", description: "Analyse variations significatives entre N et N-1.", parameters: { type: "object", properties: { exercice_n: { type: "array" }, exercice_n_minus_1: { type: "array" }, seuil_variation_pct: { type: "number" }, seuil_variation_centimes: { type: "string" } }, required: ["exercice_n", "exercice_n_minus_1"] } } },
  { type: "function", function: { name: "score_internal_control", description: "Score controle interne sur 100 selon criteres COSO (5 categories).", parameters: { type: "object", properties: { responses: { type: "array" } }, required: ["responses"] } } },

  // ─────────────── TRESORERIE L2 (5) ───────────────
  { type: "function", function: { name: "forecast_cashflow", description: "Prevision tresorerie 13 semaines + alertes negatif.", parameters: { type: "object", properties: { solde_initial_centimes: { type: "string" }, encaissements: { type: "array" }, decaissements: { type: "array" }, horizon_semaines: { type: "integer" } }, required: ["solde_initial_centimes", "encaissements", "decaissements"] } } },
  { type: "function", function: { name: "compute_decouvert_cost", description: "Cout decouvert bancaire (interets + CPFD + frais) + TEG.", parameters: { type: "object", properties: { montant_decouvert_centimes: { type: "string" }, duree_jours: { type: "integer" }, taux_decouvert_annuel: { type: "number" }, cpfd_pct: { type: "number" }, frais_fixes_centimes: { type: "string" } }, required: ["montant_decouvert_centimes", "duree_jours"] } } },
  { type: "function", function: { name: "compute_escompte_commercial", description: "Escompte commercial paiement anticipe + decision vs placement alternatif.", parameters: { type: "object", properties: { valeur_nominale_centimes: { type: "string" }, taux_escompte_pct: { type: "number" }, jours_avant_echeance: { type: "integer" }, taux_placement_alternatif_pct: { type: "number" } }, required: ["valeur_nominale_centimes", "taux_escompte_pct", "jours_avant_echeance"] } } },
  { type: "function", function: { name: "compute_factoring_cost", description: "Cout affacturage (commission + financement + retenue) + taux effectif.", parameters: { type: "object", properties: { montant_creance_centimes: { type: "string" }, jours_avant_echeance: { type: "integer" }, commission_factoring_pct: { type: "number" }, taux_financement_annuel_pct: { type: "number" }, retenue_garantie_pct: { type: "number" } }, required: ["montant_creance_centimes", "jours_avant_echeance", "commission_factoring_pct", "taux_financement_annuel_pct", "retenue_garantie_pct"] } } },
  { type: "function", function: { name: "score_bank_health", description: "Score sante banque partenaire (5 criteres ponderes).", parameters: { type: "object", properties: { bank_name: { type: "string" }, criteria: { type: "object" } }, required: ["bank_name", "criteria"] } } },

  // ─────────────── COMMERCIAL L2 (5) ───────────────
  { type: "function", function: { name: "score_lead", description: "Score lead BANT + classement hot/warm/cold/disqualifie.", parameters: { type: "object", properties: { budget_confirme: { type: "boolean" }, budget_centimes: { type: "string" }, decideur_identifie: { type: "boolean" }, besoin_exprime: { type: "string", enum: ["vague", "qualifie", "urgent"] }, timeline_mois: { type: "integer" }, industrie_strategique: { type: "boolean" }, taille_entreprise: { type: "string", enum: ["TPE", "PME", "ETI", "GE"] } }, required: ["budget_confirme", "decideur_identifie", "besoin_exprime"] } } },
  { type: "function", function: { name: "compute_commission", description: "Commission commerciale paliers progressifs + bonus quota.", parameters: { type: "object", properties: { ca_realise_centimes: { type: "string" }, quota_centimes: { type: "string" }, paliers: { type: "array" }, bonus_quota_pct: { type: "number" }, bonus_overperformance_seuil_pct: { type: "number" }, bonus_overperformance_pct: { type: "number" } }, required: ["ca_realise_centimes", "quota_centimes", "paliers"] } } },
  { type: "function", function: { name: "forecast_pipeline", description: "Prevision CA pondere + breakdown par stage et par mois.", parameters: { type: "object", properties: { opportunites: { type: "array" }, periode_mois: { type: "integer" }, stages_overrides: { type: "object" } }, required: ["opportunites"] } } },
  { type: "function", function: { name: "score_churn_risk", description: "Risque churn 0-100 + actions recommandees.", parameters: { type: "object", properties: { derniere_commande_jours: { type: "integer" }, frequence_actuelle: { type: "number" }, frequence_baseline: { type: "number" }, tickets_critiques_ouverts: { type: "integer" }, jours_avant_renouvellement: { type: "integer" }, rdv_planifie: { type: "boolean" } }, required: ["derniere_commande_jours", "frequence_actuelle", "frequence_baseline"] } } },
  { type: "function", function: { name: "analyze_customer_segment", description: "Segmentation RFM (Recence/Frequence/Montant) en quintiles + segments.", parameters: { type: "object", properties: { clients: { type: "array" }, periode_jours: { type: "integer" } }, required: ["clients"] } } },

  // ─────────────── FISCAL L2 (5) — Phase 4 ───────────────
  { type: "function", function: { name: "compute_irvm", description: "IRVM (Impot Revenus Valeurs Mobilieres) selon pays et residence beneficiaire.", parameters: { type: "object", properties: { montant_brut_centimes: { type: "string" }, pays: { type: "string" }, beneficiaire_residence: { type: "string", enum: ["resident", "non_resident"] }, type_revenu: { type: "string" } }, required: ["montant_brut_centimes", "pays", "beneficiaire_residence"] } } },
  { type: "function", function: { name: "compute_droit_enregistrement", description: "Droits d'enregistrement (cession parts, vente immo, augmentation capital, bail).", parameters: { type: "object", properties: { type_acte: { type: "string", enum: ["cession_parts_sociales", "vente_immobiliere", "augmentation_capital", "bail_commercial"] }, montant_acte_centimes: { type: "string" }, pays: { type: "string" }, duree_bail_annees: { type: "integer" } }, required: ["type_acte", "montant_acte_centimes", "pays"] } } },
  { type: "function", function: { name: "compute_minimum_forfaitaire", description: "Impot Minimum Forfaitaire IMF (max IS, IMF).", parameters: { type: "object", properties: { ca_ht_centimes: { type: "string" }, is_calcule_centimes: { type: "string" }, pays: { type: "string" } }, required: ["ca_ht_centimes", "pays"] } } },
  { type: "function", function: { name: "forecast_dsf", description: "Projection DSF annuelle agreges (IS + IMF + IRVM).", parameters: { type: "object", properties: { pays: { type: "string" }, exercice: { type: "string" }, ca_ht_centimes: { type: "string" }, benefice_imposable_centimes: { type: "string" }, taux_is_pays: { type: "number" }, dividendes_distribues_centimes: { type: "string" }, beneficiaire_dividende: { type: "string" } }, required: ["pays", "exercice", "ca_ht_centimes", "benefice_imposable_centimes"] } } },
  { type: "function", function: { name: "compute_credit_tva", description: "Credit TVA + eligibilite remboursement.", parameters: { type: "object", properties: { tva_collectee_centimes: { type: "string" }, tva_deductible_centimes: { type: "string" }, pays: { type: "string" }, type_activite: { type: "string", enum: ["exportateur", "investissement", "standard"] }, credit_anterieur_centimes: { type: "string" } }, required: ["tva_collectee_centimes", "tva_deductible_centimes", "pays"] } } },

  // ─────────────── JURIDIQUE L2 (5) ───────────────
  { type: "function", function: { name: "compute_capital_minimum", description: "Capital minimum legal selon forme juridique OHADA.", parameters: { type: "object", properties: { forme_juridique: { type: "string" }, appel_public_epargne: { type: "boolean" }, pays: { type: "string" }, capital_propose_centimes: { type: "string" } }, required: ["forme_juridique"] } } },
  { type: "function", function: { name: "validate_societe_creation", description: "Checklist conformite formalites creation societe OHADA.", parameters: { type: "object", properties: { forme_juridique: { type: "string" }, pays: { type: "string" }, nb_associes: { type: "integer" }, capital_propose_centimes: { type: "string" }, statuts_rediges: { type: "boolean" }, acte_authentique: { type: "boolean" }, rccm_depose: { type: "boolean" }, publication_jal: { type: "boolean" }, numero_ifu_obtenu: { type: "boolean" }, declaration_existence_fiscale: { type: "boolean" }, agrement_specifique_obtenu: { type: "boolean" } }, required: ["forme_juridique", "pays", "nb_associes", "capital_propose_centimes", "statuts_rediges"] } } },
  { type: "function", function: { name: "forecast_ag_quorum", description: "Quorum AGO/AGE et majorite requise selon AUSCGIE.", parameters: { type: "object", properties: { forme_juridique: { type: "string", enum: ["SA", "SARL"] }, type_assemblee: { type: "string", enum: ["AGO", "AGE"] }, capital_total_centimes: { type: "string" }, capital_present_centimes: { type: "string" }, voix_pour: { type: "integer" }, voix_contre: { type: "integer" }, voix_abstention: { type: "integer" }, premiere_convocation: { type: "boolean" } }, required: ["forme_juridique", "type_assemblee", "capital_total_centimes", "capital_present_centimes", "voix_pour", "voix_contre"] } } },
  { type: "function", function: { name: "compute_mise_demeure_delai", description: "Delai mise en demeure + interets retard + indemnite.", parameters: { type: "object", properties: { date_mise_demeure: { type: "string" }, delai_octroye_jours: { type: "integer" }, montant_principal_centimes: { type: "string" }, taux_legal_annuel: { type: "number" }, date_calcul: { type: "string" }, indemnite_forfaitaire_fcfa: { type: "integer" } }, required: ["date_mise_demeure", "montant_principal_centimes"] } } },
  { type: "function", function: { name: "analyze_contract_clauses", description: "Analyse clauses-types (presentes/manquantes/suspectes) + score completude.", parameters: { type: "object", properties: { contract_text: { type: "string" } }, required: ["contract_text"] } } },

  // ─────────────── MARKETING L2 (5) ───────────────
  { type: "function", function: { name: "compute_cac_ltv_ratio", description: "CAC + LTV + ratio LTV/CAC + payback period.", parameters: { type: "object", properties: { marketing_spend_centimes: { type: "string" }, nb_nouveaux_clients: { type: "integer" }, panier_moyen_centimes: { type: "string" }, frequence_achats_par_an: { type: "number" }, duree_retention_annees: { type: "number" }, marge_brute_pct: { type: "number" } }, required: ["marketing_spend_centimes", "nb_nouveaux_clients", "panier_moyen_centimes", "frequence_achats_par_an", "duree_retention_annees", "marge_brute_pct"] } } },
  { type: "function", function: { name: "compute_campaign_roi", description: "ROI/ROAS d'une campagne marketing + recommandation scaling.", parameters: { type: "object", properties: { campagne_nom: { type: "string" }, cout_campagne_centimes: { type: "string" }, revenu_attribue_centimes: { type: "string" }, nb_conversions: { type: "integer" }, marge_brute_pct: { type: "number" } }, required: ["campagne_nom", "cout_campagne_centimes", "revenu_attribue_centimes", "nb_conversions"] } } },
  { type: "function", function: { name: "ab_test_significance", description: "Significativite statistique A/B test (Z-test 2 proportions).", parameters: { type: "object", properties: { variant_a: { type: "object" }, variant_b: { type: "object" }, niveau_confiance: { type: "number" } }, required: ["variant_a", "variant_b"] } } },
  { type: "function", function: { name: "compute_conversion_funnel", description: "Analyse entonnoir + drop-off + bottleneck.", parameters: { type: "object", properties: { steps: { type: "array" }, benchmarks: { type: "array" } }, required: ["steps"] } } },
  { type: "function", function: { name: "forecast_growth_compound", description: "Projection croissance composee mensuelle (MRR, users, leads).", parameters: { type: "object", properties: { valeur_initiale: { type: "number" }, taux_croissance_mensuel_pct: { type: "number" }, horizon_mois: { type: "integer" }, cout_unitaire_centimes: { type: "string" }, metric_name: { type: "string" } }, required: ["valeur_initiale", "taux_croissance_mensuel_pct", "horizon_mois"] } } },
];

// ────────────────────────────────────────────────────────────────────────────
// Runner — implementation cote Supabase
// ────────────────────────────────────────────────────────────────────────────

/**
 * Contexte d'execution propage par l'orchestrateur. Permet aux tools
 * embedding-aware (memory, rag) de reutiliser la cle Gemini de l'utilisateur.
 */
export interface ToolContext {
  user_id?: string;
}

export async function runTool(
  name: ToolName,
  args: Record<string, unknown>,
  ctx?: ToolContext,
): Promise<unknown> {
  switch (name) {
    // ─── Data L1 (legacy + core) ───
    case "search_knowledge": {
      const query = args.query as string;
      const category = args.category as string | undefined;
      const k = (args.k as number | undefined) ?? 5;
      const queryEmbedding = await embed(query);
      const { data, error } = await supabaseAdmin.rpc("proph3t_search_knowledge", {
        query_embedding: queryEmbedding,
        filter_category: category ?? null,
        match_count: k,
      });
      if (error) throw new Error(`search_knowledge: ${error.message}`);
      return data;
    }

    case "search_documents": {
      const query = args.query as string;
      const society = args.society_id as string | undefined;
      const product = args.product as string | undefined;
      const k = (args.k as number | undefined) ?? 8;
      const queryEmbedding = await embed(query);
      const { data, error } = await supabaseAdmin.rpc("proph3t_search_chunks", {
        query_embedding: queryEmbedding,
        filter_society: society ?? null,
        filter_product: product ?? null,
        match_count: k,
      });
      if (error) throw new Error(`search_documents: ${error.message}`);
      return data;
    }

    case "get_memory": {
      const society = args.society_id as string;
      const type = args.memory_type as string;
      const limit = (args.limit as number | undefined) ?? 20;
      let query;
      if (type === "observations") {
        query = supabaseAdmin.from("proph3t_observations").select("*").eq("society_id", society).order("observed_at", { ascending: false }).limit(limit);
      } else if (type === "rules") {
        query = supabaseAdmin.from("proph3t_business_rules").select("*").eq("active", true).or(`society_id.eq.${society},society_id.is.null`).limit(limit);
      } else {
        query = supabaseAdmin.from("proph3t_validated_qa").select("*").or(`society_id.eq.${society},society_id.is.null`).order("last_used_at", { ascending: false, nullsFirst: false }).limit(limit);
      }
      const { data, error } = await query;
      if (error) throw new Error(`get_memory: ${error.message}`);
      return data;
    }

    case "generate_alert": {
      const { data, error } = await supabaseAdmin.from("proph3t_alerts").insert({
        society_id: args.society_id,
        product: args.product,
        severity: args.severity,
        alert_type: args.alert_type,
        title: args.title,
        message: args.message,
        payload: args.payload ?? {},
      }).select("id").single();
      if (error) throw new Error(`generate_alert: ${error.message}`);
      return { alert_id: data.id };
    }

    case "save_business_rule": {
      const { data, error } = await supabaseAdmin.from("proph3t_business_rules").insert({
        society_id: args.society_id ?? null,
        product: args.product ?? null,
        rule_text: args.rule_text,
        rule_payload: args.rule_payload ?? null,
      }).select("id").single();
      if (error) throw new Error(`save_business_rule: ${error.message}`);
      return { rule_id: data.id };
    }

    case "get_financial_data":
      return { not_implemented: true, note: "Branchement aux schemas produits a faire en Phase 1." };

    // ─── Calcs L1 (5) ───
    case "compute_ratio": {
      const ratioType = args.ratio_type as RatioType;
      const inputs = parseFinancialInputs((args.inputs as Record<string, unknown>) ?? {});
      try {
        return jsonifyBigInt(computeRatio(ratioType, inputs));
      } catch (err) {
        return { error: (err as Error).message, hint: "Verifie inputs requis pour ce ratio." };
      }
    }

    case "compute_tva": {
      try {
        const baseHt = BigInt(args.base_ht_centimes as string);
        const country = args.country as CountryCode;
        const rateType = (args.rate_type as TvaRateType) ?? "standard";
        return jsonifyBigInt(computeTVA(baseHt, country, rateType));
      } catch (err) {
        return { error: (err as Error).message };
      }
    }

    case "apply_prorata_360": {
      try {
        const amount = BigInt(args.amount_centimes as string);
        const days = Number(args.days);
        const result = applyProrata360(amount, days);
        return { result_centimes: result.toString(), formatted: formatMoneyFcfa(result), formula: `(${args.amount_centimes} × ${days}) / 360` };
      } catch (err) {
        return { error: (err as Error).message };
      }
    }

    case "format_money_fcfa": {
      try {
        const centimes = BigInt(args.centimes as string);
        return { formatted: formatMoneyFcfa(centimes), centimes: centimes.toString(), fcfa: (centimes / 100n).toString() };
      } catch (err) {
        return { error: (err as Error).message };
      }
    }

    case "convert_currency": {
      try {
        const amount = BigInt(args.amount_centimes as string);
        const from = args.from_code as string;
        const to = args.to_code as string;
        const date = args.date as string | undefined;
        const rate = await getCurrencyRate(from, to, date);
        if (rate === null) return { error: `Aucun taux trouve pour ${from} -> ${to}`, hint: "Verifie proph3t_currency_rates ou fournis manuellement." };
        return jsonifyBigInt(convertCurrency(amount, from, to, rate));
      } catch (err) {
        return { error: (err as Error).message };
      }
    }

    // ─── Reasoning L1 (4) ───
    case "plan_task":
      return planTask(args as Parameters<typeof planTask>[0]);

    case "chain_of_thought":
      return chainOfThought(args as Parameters<typeof chainOfThought>[0]);

    case "verify_hypothesis":
      return verifyHypothesis(args as Parameters<typeof verifyHypothesis>[0]);

    case "route_to_model":
      return routeToModel(args as Parameters<typeof routeToModel>[0]);

    // ─── Memory L1 (5) ─── (embeddings-aware quand cle Gemini dispo)
    case "save_episodic_memory": {
      const a = args as Parameters<typeof saveEpisodicMemory>[1];
      const key = await resolveGeminiKey(supabaseAdmin, ctx?.user_id);
      const text = `${a.event_type}: ${JSON.stringify(a.event_data).slice(0, 1000)}`;
      const emb = await makeEmbedding(text, key);
      return await saveEpisodicMemory(supabaseAdmin, a, emb ?? undefined);
    }

    case "save_semantic_memory": {
      const a = args as Parameters<typeof saveSemanticMemory>[1];
      const key = await resolveGeminiKey(supabaseAdmin, ctx?.user_id);
      const emb = await makeEmbedding(a.fact, key);
      return await saveSemanticMemory(supabaseAdmin, a, emb ?? undefined);
    }

    case "recall_similar_cases": {
      const a = args as Parameters<typeof recallSimilarCases>[1];
      const key = await resolveGeminiKey(supabaseAdmin, ctx?.user_id);
      const emb = await makeEmbedding(a.query, key);
      return await recallSimilarCases(supabaseAdmin, a, emb ?? undefined);
    }

    case "update_memory":
      return await updateMemory(supabaseAdmin, args as Parameters<typeof updateMemory>[1]);

    case "forget_memory":
      return await forgetMemory(supabaseAdmin, args as Parameters<typeof forgetMemory>[1]);

    // ─── RAG L1 (3) ─── (embeddings-aware)
    case "search_app_knowledge": {
      const a = args as Parameters<typeof searchAppKnowledge>[1];
      const key = await resolveGeminiKey(supabaseAdmin, ctx?.user_id);
      const emb = await makeEmbedding(a.query, key);
      return await searchAppKnowledge(supabaseAdmin, a, emb ?? undefined);
    }

    case "search_tenant_documents": {
      const a = args as Parameters<typeof searchTenantDocuments>[1];
      const key = await resolveGeminiKey(supabaseAdmin, ctx?.user_id);
      const emb = await makeEmbedding(a.query, key);
      return await searchTenantDocuments(supabaseAdmin, a, emb ?? undefined);
    }

    case "index_document": {
      const a = args as Parameters<typeof indexDocument>[1];
      const key = await resolveGeminiKey(supabaseAdmin, ctx?.user_id);
      // Si on a une cle, on cree une fonction qui calcule embedding par chunk
      const embeddingFn = key
        ? async (chunkText: string) => {
            const v = await makeEmbedding(chunkText, key);
            return v ?? [];
          }
        : undefined;
      return await indexDocument(supabaseAdmin, a, embeddingFn);
    }

    // ─── Output L1 (3) ───
    case "generate_report":
      return generateReport(args as Parameters<typeof generateReport>[0]);

    case "send_notification":
      return await sendNotification(supabaseAdmin, args as Parameters<typeof sendNotification>[1]);

    case "log_decision":
      return await logDecision(supabaseAdmin, args as Parameters<typeof logDecision>[1]);

    // ─── Vision L1 (2) — necessitent une cle Gemini ───
    case "extract_from_image": {
      const apiKey = Deno.env.get("GEMINI_API_KEY_FALLBACK") ?? "";
      if (!apiKey) return { error: "Pas de cle Gemini disponible (BYOK ou GEMINI_API_KEY_FALLBACK)" };
      return await extractFromImage({
        apiKey,
        imageBase64: args.image_base64 as string,
        mimeType: args.mime_type as string,
        prompt: args.prompt as string,
        expected_schema: args.expected_schema as Record<string, unknown> | undefined,
      });
    }

    case "parse_document_visual": {
      const apiKey = Deno.env.get("GEMINI_API_KEY_FALLBACK") ?? "";
      if (!apiKey) return { error: "Pas de cle Gemini disponible (BYOK ou GEMINI_API_KEY_FALLBACK)" };
      return await parseDocumentVisual({
        apiKey,
        imageBase64: args.image_base64 as string,
        mimeType: args.mime_type as string,
        document_type: args.document_type as Parameters<typeof parseDocumentVisual>[0]["document_type"],
      });
    }

    // ─── Security L1 (3) ───
    case "verify_rls_context":
      return await verifyRlsContext(supabaseAdmin, args as Parameters<typeof verifyRlsContext>[1]);

    case "audit_trail_write":
      return await auditTrailWrite(args as Parameters<typeof auditTrailWrite>[0]);

    case "check_compliance":
      return checkCompliance(args as Parameters<typeof checkCompliance>[0]);

    // ─── FINANCE L2 (10) — Phase 1 ───
    case "parse_grand_livre":
      return parseGrandLivre(args as Parameters<typeof parseGrandLivre>[0]);

    case "generate_balance_sheet":
      return generateBalanceSheet(args as Parameters<typeof generateBalanceSheet>[0]);

    case "generate_compte_resultat":
      return generateCompteResultat(args as Parameters<typeof generateCompteResultat>[0]);

    case "apply_benford_law":
      return applyBenfordLaw(args as Parameters<typeof applyBenfordLaw>[0]);

    case "reconcile_bank_statement":
      return reconcileBankStatement(args as Parameters<typeof reconcileBankStatement>[0]);

    case "compute_irpp_uemoa":
      return computeIrppUemoa(args as Parameters<typeof computeIrppUemoa>[0]);

    case "compute_is_uemoa":
      return computeIsUemoa(args as Parameters<typeof computeIsUemoa>[0]);

    case "compute_cnss_contribution":
      return computeCnssContribution(args as Parameters<typeof computeCnssContribution>[0]);

    case "validate_journal_entry":
      return validateJournalEntry(args as Parameters<typeof validateJournalEntry>[0]);

    case "detect_accounting_anomalies":
      return detectAccountingAnomalies(args as Parameters<typeof detectAccountingAnomalies>[0]);

    // ─── RH L2 (10) ───
    case "compute_smig":
      return computeSmig(args as Parameters<typeof computeSmig>[0]);
    case "compute_salaire_net":
      return computeSalaireNet(args as Parameters<typeof computeSalaireNet>[0]);
    case "compute_iuts":
      return computeIuts(args as Parameters<typeof computeIuts>[0]);
    case "compute_its":
      return computeIts(args as Parameters<typeof computeIts>[0]);
    case "compute_taxes_parafiscales":
      return computeTaxesParafiscales(args as Parameters<typeof computeTaxesParafiscales>[0]);
    case "compute_conges_payes":
      return computeCongesPayes(args as Parameters<typeof computeCongesPayes>[0]);
    case "compute_indemnite_licenciement":
      return computeIndemniteLicenciement(args as Parameters<typeof computeIndemniteLicenciement>[0]);
    case "compute_prime_anciennete":
      return computePrimeAnciennete(args as Parameters<typeof computePrimeAnciennete>[0]);
    case "generate_fiche_paie":
      return generateFichePaie(args as Parameters<typeof generateFichePaie>[0]);
    case "simulate_embauche_cost":
      return simulateEmbaucheCost(args as Parameters<typeof simulateEmbaucheCost>[0]);

    // ─── IMMOBILIER L2 (5) ───
    case "compute_loyer_revise":
      return computeLoyerRevise(args as Parameters<typeof computeLoyerRevise>[0]);
    case "compute_depot_garantie":
      return computeDepotGarantie(args as Parameters<typeof computeDepotGarantie>[0]);
    case "compute_taxe_fonciere":
      return computeTaxeFonciere(args as Parameters<typeof computeTaxeFonciere>[0]);
    case "compute_charges_copropriete":
      return computeChargesCopropriete(args as Parameters<typeof computeChargesCopropriete>[0]);
    case "compute_rendement_locatif":
      return computeRendementLocatif(args as Parameters<typeof computeRendementLocatif>[0]);

    // ─── RETAIL L2 (5) ───
    case "compute_marge_brute":
      return computeMargeBrute(args as Parameters<typeof computeMargeBrute>[0]);
    case "compute_taux_marque":
      return computeTauxMarque(args as Parameters<typeof computeTauxMarque>[0]);
    case "compute_rotation_stocks":
      return computeRotationStocks(args as Parameters<typeof computeRotationStocks>[0]);
    case "compute_point_mort":
      return computePointMort(args as Parameters<typeof computePointMort>[0]);
    case "compute_panier_moyen":
      return computePanierMoyen(args as Parameters<typeof computePanierMoyen>[0]);

    // ─── DOCUMENTAIRE L2 (5) — Phase 3 ───
    case "classify_document":
      return classifyDocument(args as Parameters<typeof classifyDocument>[0]);
    case "extract_document_metadata":
      return extractDocumentMetadata(args as Parameters<typeof extractDocumentMetadata>[0]);
    case "compute_legal_retention":
      return computeLegalRetention(args as Parameters<typeof computeLegalRetention>[0]);
    case "detect_document_duplicates":
      return detectDocumentDuplicates(args as Parameters<typeof detectDocumentDuplicates>[0]);
    case "generate_archive_index":
      return generateArchiveIndex(args as Parameters<typeof generateArchiveIndex>[0]);

    // ─── AUDIT L2 (5) ───
    case "compute_audit_sample":
      return computeAuditSample(args as Parameters<typeof computeAuditSample>[0]);
    case "compute_materiality":
      return computeMateriality(args as Parameters<typeof computeMateriality>[0]);
    case "test_balance_general":
      return testBalanceGeneral(args as Parameters<typeof testBalanceGeneral>[0]);
    case "analyze_variance_interperiode":
      return analyzeVarianceInterperiode(args as Parameters<typeof analyzeVarianceInterperiode>[0]);
    case "score_internal_control":
      return scoreInternalControl(args as Parameters<typeof scoreInternalControl>[0]);

    // ─── TRESORERIE L2 (5) ───
    case "forecast_cashflow":
      return forecastCashflow(args as Parameters<typeof forecastCashflow>[0]);
    case "compute_decouvert_cost":
      return computeDecouvertCost(args as Parameters<typeof computeDecouvertCost>[0]);
    case "compute_escompte_commercial":
      return computeEscompteCommercial(args as Parameters<typeof computeEscompteCommercial>[0]);
    case "compute_factoring_cost":
      return computeFactoringCost(args as Parameters<typeof computeFactoringCost>[0]);
    case "score_bank_health":
      return scoreBankHealth(args as Parameters<typeof scoreBankHealth>[0]);

    // ─── COMMERCIAL L2 (5) ───
    case "score_lead":
      return scoreLead(args as Parameters<typeof scoreLead>[0]);
    case "compute_commission":
      return computeCommission(args as Parameters<typeof computeCommission>[0]);
    case "forecast_pipeline":
      return forecastPipeline(args as Parameters<typeof forecastPipeline>[0]);
    case "score_churn_risk":
      return scoreChurnRisk(args as Parameters<typeof scoreChurnRisk>[0]);
    case "analyze_customer_segment":
      return analyzeCustomerSegment(args as Parameters<typeof analyzeCustomerSegment>[0]);

    // ─── FISCAL L2 (5) — Phase 4 ───
    case "compute_irvm":
      return computeIrvm(args as Parameters<typeof computeIrvm>[0]);
    case "compute_droit_enregistrement":
      return computeDroitEnregistrement(args as Parameters<typeof computeDroitEnregistrement>[0]);
    case "compute_minimum_forfaitaire":
      return computeMinimumForfaitaire(args as Parameters<typeof computeMinimumForfaitaire>[0]);
    case "forecast_dsf":
      return forecastDsf(args as Parameters<typeof forecastDsf>[0]);
    case "compute_credit_tva":
      return computeCreditTva(args as Parameters<typeof computeCreditTva>[0]);

    // ─── JURIDIQUE L2 (5) ───
    case "compute_capital_minimum":
      return computeCapitalMinimum(args as Parameters<typeof computeCapitalMinimum>[0]);
    case "validate_societe_creation":
      return validateSocieteCreation(args as Parameters<typeof validateSocieteCreation>[0]);
    case "forecast_ag_quorum":
      return forecastAgQuorum(args as Parameters<typeof forecastAgQuorum>[0]);
    case "compute_mise_demeure_delai":
      return computeMiseDemeureDelai(args as Parameters<typeof computeMiseDemeureDelai>[0]);
    case "analyze_contract_clauses":
      return analyzeContractClauses(args as Parameters<typeof analyzeContractClauses>[0]);

    // ─── MARKETING L2 (5) ───
    case "compute_cac_ltv_ratio":
      return computeCacLtvRatio(args as Parameters<typeof computeCacLtvRatio>[0]);
    case "compute_campaign_roi":
      return computeCampaignRoi(args as Parameters<typeof computeCampaignRoi>[0]);
    case "ab_test_significance":
      return abTestSignificance(args as Parameters<typeof abTestSignificance>[0]);
    case "compute_conversion_funnel":
      return computeConversionFunnel(args as Parameters<typeof computeConversionFunnel>[0]);
    case "forecast_growth_compound":
      return forecastGrowthCompound(args as Parameters<typeof forecastGrowthCompound>[0]);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
