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
import { planTask, chainOfThought, verifyHypothesis, routeToModel } from "./orchestration.ts";
import { generateReport, sendNotification, logDecision } from "./communication.ts";
import { extractFromImage, parseDocumentVisual } from "./vision.ts";
import { verifyRlsContext, auditTrailWrite, checkCompliance } from "./security.ts";

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
  | "check_compliance";

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
];

// ────────────────────────────────────────────────────────────────────────────
// Runner — implementation cote Supabase
// ────────────────────────────────────────────────────────────────────────────

export async function runTool(name: ToolName, args: Record<string, unknown>): Promise<unknown> {
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

    // ─── Memory L1 (5) ───
    case "save_episodic_memory":
      return await saveEpisodicMemory(supabaseAdmin, args as Parameters<typeof saveEpisodicMemory>[1]);

    case "save_semantic_memory":
      return await saveSemanticMemory(supabaseAdmin, args as Parameters<typeof saveSemanticMemory>[1]);

    case "recall_similar_cases":
      return await recallSimilarCases(supabaseAdmin, args as Parameters<typeof recallSimilarCases>[1]);

    case "update_memory":
      return await updateMemory(supabaseAdmin, args as Parameters<typeof updateMemory>[1]);

    case "forget_memory":
      return await forgetMemory(supabaseAdmin, args as Parameters<typeof forgetMemory>[1]);

    // ─── RAG L1 (3) ───
    case "search_app_knowledge":
      return await searchAppKnowledge(supabaseAdmin, args as Parameters<typeof searchAppKnowledge>[1]);

    case "search_tenant_documents":
      return await searchTenantDocuments(supabaseAdmin, args as Parameters<typeof searchTenantDocuments>[1]);

    case "index_document":
      return await indexDocument(supabaseAdmin, args as Parameters<typeof indexDocument>[1]);

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

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
