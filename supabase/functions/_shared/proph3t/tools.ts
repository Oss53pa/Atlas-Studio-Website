// Function-calling toolbelt exposed to PROPH3T (CDC §5.2 Module Function Calling).
// Each tool: a JSON schema declaration + a runner that the orchestrator calls.

import { supabaseAdmin } from "../supabase.ts";
import type { OllamaTool } from "./ollama.ts";
import { embed } from "./ollama.ts";

export type ToolName =
  | "get_financial_data"
  | "search_knowledge"
  | "search_documents"
  | "get_memory"
  | "compute_ratio"
  | "generate_alert"
  | "save_business_rule";

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
      description: "Calcul ad hoc à partir d'une formule sur les données société.",
      parameters: {
        type: "object",
        properties: {
          society_id: { type: "string" },
          formula: { type: "string", description: "ex: '(actif_circulant - stocks) / passif_circulant'" },
          period: { type: "string" },
        },
        required: ["society_id", "formula"],
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

    case "get_financial_data":
    case "compute_ratio":
      // À brancher sur les schémas finance des produits (Cockpit FnA, etc.) en S3-S4
      return { not_implemented: true, note: "Branchement aux schémas produits à faire en sprint suivant." };

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
