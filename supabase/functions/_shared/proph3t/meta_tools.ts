// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — Meta-tools : permettent au LLM de gerer son propre toolset
// ═══════════════════════════════════════════════════════════════════════════
//
// load_domain_tools : retourne la liste des tools d'un domaine que le LLM
// pourra ensuite appeler. Utile quand le routing initial n'a pas charge
// le bon domaine et que le LLM realise au cours de la conversation qu'il
// a besoin d'autres tools.
//
// list_available_tools : retourne la liste de TOUS les tools disponibles,
// regroupes par domaine, sans leurs schemas (juste nom + description courte).
// Permet au LLM de "savoir" ce qui existe sans surcharger son contexte.
//
// describe_tool : retourne la description detaillee d'un tool specifique
// (avec son schema complet). Utile pour drill-down avant un appel.
// ═══════════════════════════════════════════════════════════════════════════

import type { OllamaTool } from "./ollama.ts";

export function loadDomainTools(args: { domain: string }, allTools: OllamaTool[], toolDomainMap: Map<string, string>): {
  ok: boolean;
  domain: string;
  tools_loaded: { name: string; description: string }[];
  count: number;
  hint: string;
} {
  const filtered = allTools.filter(t => toolDomainMap.get(t.function.name) === args.domain);
  return {
    ok: true,
    domain: args.domain,
    tools_loaded: filtered.map(t => ({ name: t.function.name, description: t.function.description })),
    count: filtered.length,
    hint: filtered.length > 0
      ? `${filtered.length} tools du domaine '${args.domain}' charges. Tu peux les appeler directement maintenant.`
      : `Aucun tool dans le domaine '${args.domain}' (verifie le nom : finance, rh, immobilier, retail, documentaire, audit, tresorerie, commercial, fiscal, juridique, marketing, productivite, support, workflows).`,
  };
}

export function listAvailableTools(allTools: OllamaTool[], toolDomainMap: Map<string, string>): {
  ok: boolean;
  total: number;
  by_domain: Record<string, { count: number; tools: { name: string; description: string }[] }>;
} {
  const byDomain: Record<string, { count: number; tools: { name: string; description: string }[] }> = {};
  for (const t of allTools) {
    const d = toolDomainMap.get(t.function.name) ?? "unknown";
    byDomain[d] ??= { count: 0, tools: [] };
    byDomain[d].count++;
    byDomain[d].tools.push({ name: t.function.name, description: t.function.description.slice(0, 100) });
  }
  return { ok: true, total: allTools.length, by_domain: byDomain };
}

export function describeTool(args: { tool_name: string }, allTools: OllamaTool[]): {
  ok: boolean;
  found: boolean;
  tool?: { name: string; description: string; schema: unknown };
  hint?: string;
} {
  const t = allTools.find(x => x.function.name === args.tool_name);
  if (!t) {
    return { ok: true, found: false, hint: `Tool '${args.tool_name}' non trouve. Utilise list_available_tools pour voir tous les noms.` };
  }
  return {
    ok: true,
    found: true,
    tool: {
      name: t.function.name,
      description: t.function.description,
      schema: t.function.parameters,
    },
  };
}
