// ASVC — Chargement des system prompts agents depuis la DB.
//
// Pattern : chaque agent appelle `loadAgentSystemPrompt(code, fallback)` au
// lieu d'utiliser directement la constante hardcodée. Si une version active
// existe en DB (table asvc_agent_prompts), elle est retournée. Sinon : fallback.
//
// Cache module-scoped TTL 5 min pour éviter de marteler la DB sur runs en
// rafale (cold start = cache vide, c'est OK : 1 round-trip Postgres au pire).

import { supabaseAdmin } from "../supabase.ts";

const TTL_MS = 5 * 60 * 1000;

type CacheEntry = { content: string; expires: number };
const cache = new Map<string, CacheEntry>();

export function clearAgentPromptCache(agentCode?: string) {
  if (agentCode) cache.delete(agentCode);
  else cache.clear();
}

export async function loadAgentSystemPrompt(
  agentCode: string,
  fallback: string,
): Promise<string> {
  const now = Date.now();
  const hit = cache.get(agentCode);
  if (hit && hit.expires > now) {
    return hit.content;
  }
  try {
    const { data, error } = await supabaseAdmin.rpc("asvc_get_active_agent_prompt", {
      p_agent_code: agentCode,
    });
    if (error) throw error;
    const row = Array.isArray(data) && data.length > 0
      ? (data[0] as { content?: string })
      : null;
    const content = row?.content && row.content.trim() !== "" ? row.content : fallback;
    cache.set(agentCode, { content, expires: now + TTL_MS });
    return content;
  } catch (e) {
    console.warn(`[asvc/prompts] fallback for ${agentCode}: ${(e as Error).message}`);
    cache.set(agentCode, { content: fallback, expires: now + TTL_MS });
    return fallback;
  }
}
