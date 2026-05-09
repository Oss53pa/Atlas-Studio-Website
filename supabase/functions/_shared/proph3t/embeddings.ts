// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — Helper embeddings (768d) avec fallback multi-provider
// ═══════════════════════════════════════════════════════════════════════════
// Ordre de preference :
//   1. Gemini text-embedding-004 (BYOK user OU GEMINI_API_KEY_FALLBACK serveur) - 768d
//   2. Ollama nomic-embed-text (self-hosted, OLLAMA_URL) - 768d
//   3. null (le tool fonctionne avec fallback texte ilike)
// ═══════════════════════════════════════════════════════════════════════════

import { embed as ollamaEmbed } from "./ollama.ts";

/** Genere un embedding 768d via Gemini text-embedding-004. */
export async function geminiEmbed(text: string, apiKey: string): Promise<number[]> {
  const model = "text-embedding-004";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${model}`,
        content: { parts: [{ text }] },
        taskType: "SEMANTIC_SIMILARITY",
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini embed ${res.status}: ${err.slice(0, 200)}`);
    }
    const data = await res.json();
    const values = data?.embedding?.values as number[] | undefined;
    if (!values || !Array.isArray(values)) {
      throw new Error("Gemini embed: pas de values dans la reponse");
    }
    return values;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Genere un embedding 768d en testant plusieurs providers.
 * @param text texte a vectoriser
 * @param geminiKey cle Gemini optionnelle (BYOK ou fallback serveur)
 * @returns vector 768d, ou null si aucun provider dispo
 */
export async function makeEmbedding(text: string, geminiKey?: string): Promise<number[] | null> {
  // 1. Gemini si cle dispo
  if (geminiKey) {
    try {
      const v = await geminiEmbed(text, geminiKey);
      if (v.length === 768) return v;
      console.warn(`[embeddings] Gemini retourne ${v.length}d, attendu 768`);
    } catch (e) {
      console.warn("[embeddings] Gemini fail:", (e as Error).message);
    }
  }
  // 2. Ollama nomic-embed-text si OLLAMA_URL configure
  if (Deno.env.get("OLLAMA_URL")) {
    try {
      const v = await ollamaEmbed(text);
      if (v.length === 768) return v;
      console.warn(`[embeddings] Ollama retourne ${v.length}d, attendu 768`);
    } catch (e) {
      console.warn("[embeddings] Ollama fail:", (e as Error).message);
    }
  }
  return null;
}

/**
 * Helper qui resout la cle Gemini a utiliser pour les embeddings.
 * Ordre : BYOK user (si Gemini provider configure) -> GEMINI_API_KEY_FALLBACK serveur.
 */
export async function resolveGeminiKey(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId?: string,
): Promise<string | undefined> {
  // 1. BYOK user
  if (userId) {
    try {
      const masterKey = Deno.env.get("APP_ENCRYPTION_KEY");
      if (masterKey) {
        const { data } = await supabase.rpc("proph3t_get_gemini_key", {
          p_user_id: userId,
          p_master_key: masterKey,
        });
        if (data) return data as string;
      }
    } catch {
      // fallback silencieux
    }
  }
  // 2. Fallback serveur
  return Deno.env.get("GEMINI_API_KEY_FALLBACK") ?? undefined;
}
