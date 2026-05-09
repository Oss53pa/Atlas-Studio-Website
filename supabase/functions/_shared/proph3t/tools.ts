// Function-calling toolbelt exposed to PROPH3T (CDC §5.2 Module Function Calling).
// Each tool: a JSON schema declaration + a runner that the orchestrator calls.

import { supabaseAdmin } from "../supabase.ts";
import type { OllamaTool } from "./ollama.ts";
import { embed } from "./ollama.ts";
import {
  computeRatio, computeTVA, applyProrata360, formatMoneyFcfa,
  type RatioType, type FinancialInputs, type CountryCode, type TvaRateType,
} from "./calculators.ts";

export type ToolName =
  | "get_financial_data"
  | "search_knowledge"
  | "search_documents"
  | "get_memory"
  | "compute_ratio"
  | "compute_tva"
  | "apply_prorata_360"
  | "format_money_fcfa"
  | "generate_alert"
  | "save_business_rule";

/** Convertit les inputs string -> bigint pour les champs financiers. */
function parseFinancialInputs(raw: Record<string, unknown>): FinancialInputs {
  const out: FinancialInputs = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined || v === null || v === "") continue;
    if (typeof v === "string" || typeof v === "number") {
      try {
        // Le LLM peut renvoyer string ("1234") ou number (1234) — on accepte les deux
        (out as Record<string, unknown>)[k] = BigInt(typeof v === "number" ? Math.trunc(v) : v);
      } catch {
        // Si ce n'est pas un nombre (ex: "periodeDebut"), on garde tel quel
        (out as Record<string, unknown>)[k] = v;
      }
    }
  }
  return out;
}

export const TOOL_DECLARATIONS: OllamaTool[] = [
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
      description: "Recherche sémantique dans la base SYSCOHADA / OHADA / fiscal pré-indexée.",
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
      description: "Recherche sémantique dans les documents propres à la société (RAG dynamique).",
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
      description: "Récupère observations, règles métier ou Q/R validées pour une société.",
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
      name: "compute_ratio",
      description: "Calcule un ratio financier SYSCOHADA de maniere deterministe (TS pur, AUCUN LLM dans la formule). Retourne valeur exacte + interpretation. Argent en centimes (FCFA × 100).",
      parameters: {
        type: "object",
        properties: {
          ratio_type: {
            type: "string",
            enum: ["fr", "bfr", "tresorerie_nette", "autonomie_financiere", "liquidite_generale", "caf", "ebe", "altman_z_score", "dso", "dpo"],
            description: "Type de ratio : fr=Fonds de Roulement, bfr=Besoin en FdR, autonomie_financiere=Capitaux propres/Total bilan, altman_z_score=risque faillite, dso=delai clients, dpo=delai fournisseurs"
          },
          inputs: {
            type: "object",
            description: "Inputs financiers en CENTIMES FCFA (bigint). Champs requis varient selon ratio_type.",
            properties: {
              totalActif: { type: "string", description: "centimes (string pour bigint)" },
              capitauxPropres: { type: "string" },
              dettesFinancieres: { type: "string" },
              immobilisationsNettes: { type: "string" },
              stocks: { type: "string" },
              creancesClients: { type: "string" },
              autresCreances: { type: "string" },
              tresorerieActif: { type: "string" },
              dettesFournisseurs: { type: "string" },
              dettesFiscalesSociales: { type: "string" },
              autresDettes: { type: "string" },
              tresoreriePassif: { type: "string" },
              chiffreAffaires: { type: "string" },
              achatsConsommes: { type: "string" },
              chargesPersonnel: { type: "string" },
              impotsTaxes: { type: "string" },
              subventionsExploitation: { type: "string" },
              dotationsAmortissements: { type: "string" },
              reprises: { type: "string" },
              resultatNet: { type: "string" },
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
          base_ht_centimes: { type: "string", description: "Base HT en centimes FCFA (string pour bigint)" },
          country: { type: "string", enum: ["CI","SN","BF","ML","BJ","TG","NE","GW","CM","CG","GA","TD","CF"], description: "Code pays" },
          rate_type: { type: "string", enum: ["standard","reduit","zero","exonere"], description: "Type de taux", default: "standard" },
        },
        required: ["base_ht_centimes", "country"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "apply_prorata_360",
      description: "Applique la regle de prorata 360 jours SYSCOHADA (interets, cotisations, etc.).",
      parameters: {
        type: "object",
        properties: {
          amount_centimes: { type: "string", description: "Montant annuel en centimes FCFA" },
          days: { type: "integer", minimum: 0, maximum: 360, description: "Nombre de jours d'application" },
        },
        required: ["amount_centimes", "days"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "format_money_fcfa",
      description: "Formate un montant en centimes en string lisible FCFA avec separateurs : '1 234 567 FCFA'.",
      parameters: {
        type: "object",
        properties: {
          centimes: { type: "string", description: "Montant en centimes FCFA (string pour bigint)" },
        },
        required: ["centimes"],
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
];

// ────────────────────────────────────────────────────────────────────────────
// Runners — implémentation côté Supabase
// ────────────────────────────────────────────────────────────────────────────

export async function runTool(name: ToolName, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
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

    case "compute_ratio": {
      const ratioType = args.ratio_type as RatioType;
      const inputs = parseFinancialInputs((args.inputs as Record<string, unknown>) ?? {});
      try {
        const result = computeRatio(ratioType, inputs);
        // Serialise les bigint pour JSON
        return JSON.parse(JSON.stringify(result, (_k, v) => typeof v === "bigint" ? v.toString() : v));
      } catch (err) {
        return { error: (err as Error).message, hint: "Verifie que tu fournis tous les inputs requis pour ce ratio." };
      }
    }

    case "compute_tva": {
      try {
        const baseHt = BigInt(args.base_ht_centimes as string);
        const country = args.country as CountryCode;
        const rateType = (args.rate_type as TvaRateType) ?? "standard";
        const result = computeTVA(baseHt, country, rateType);
        return JSON.parse(JSON.stringify(result, (_k, v) => typeof v === "bigint" ? v.toString() : v));
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

    case "get_financial_data":
      // Necessite branchement sur les schemas finance des produits (Cockpit FA / Atlas FA / etc.)
      // Sera implemente en Phase 1 du CDC quand les apps exposeront leurs donnees.
      return { not_implemented: true, note: "Branchement aux schemas produits a faire en Phase 1. Pour le moment, fournis les chiffres a la main et utilise compute_ratio." };

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
