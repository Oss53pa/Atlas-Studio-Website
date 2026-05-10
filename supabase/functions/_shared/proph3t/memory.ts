// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — Memoire (CDC §3.2 memoire)
// 5 tools : save_episodic, save_semantic, recall_similar, update, forget
// ═══════════════════════════════════════════════════════════════════════════
// Note : recall_similar_cases utilise pgvector (cosine similarity).
// L'embedding peut venir d'Ollama ou de Gemini text-embedding-004 (Phase 1).
// Pour l'instant, fallback sur recherche full-text si pas d'embedding dispo.

// deno-lint-ignore no-explicit-any
type SbClient = any;

export async function saveEpisodicMemory(supabase: SbClient, args: {
  tenant_id?: string;
  user_id?: string;
  app_id?: string;
  event_type: string;
  event_data: Record<string, unknown>;
  occurred_at?: string;
}, embedding?: number[]): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!args.event_type || !args.event_data) {
    return { ok: false, error: "event_type et event_data requis" };
  }
  const { data, error } = await supabase.from("proph3t_memory_episodic").insert({
    tenant_id: args.tenant_id ?? null,
    user_id: args.user_id ?? null,
    app_id: args.app_id ?? null,
    event_type: args.event_type,
    event_data: args.event_data,
    embedding: embedding ?? null,
    occurred_at: args.occurred_at ?? new Date().toISOString(),
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data?.id };
}

export async function saveSemanticMemory(supabase: SbClient, args: {
  scope: "global" | "app" | "tenant" | "user";
  scope_id?: string;
  fact: string;
  source: string;
  confidence?: number;
  validated_by?: string;
}, embedding?: number[]): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!args.fact || !args.source) return { ok: false, error: "fact et source requis" };
  const { data, error } = await supabase.from("proph3t_memory_semantic").insert({
    scope: args.scope,
    scope_id: args.scope_id ?? null,
    fact: args.fact,
    source: args.source,
    confidence: args.confidence ?? 1.0,
    validated_by: args.validated_by ?? null,
    validated_at: args.validated_by ? new Date().toISOString() : null,
    embedding: embedding ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data?.id };
}

/**
 * Recherche des cas similaires dans la memoire episodique ou semantique.
 * Si embedding fourni : cosine similarity via pgvector.
 * Sinon : full-text fallback sur fact / event_data.
 */
export async function recallSimilarCases(supabase: SbClient, args: {
  query: string;
  scope?: "episodic" | "semantic" | "both";
  top_k?: number;
  tenant_id?: string;
  app_id?: string;
}, queryEmbedding?: number[]): Promise<{ ok: boolean; matches: unknown[]; error?: string }> {
  const k = args.top_k ?? 5;
  const matches: unknown[] = [];

  if ((args.scope ?? "both") !== "semantic") {
    let qb = supabase.from("proph3t_memory_episodic").select("id, event_type, event_data, occurred_at, app_id").limit(k).order("occurred_at", { ascending: false });
    if (args.tenant_id) qb = qb.eq("tenant_id", args.tenant_id);
    if (args.app_id) qb = qb.eq("app_id", args.app_id);
    const { data } = await qb;
    if (data) matches.push(...data.map((d: Record<string, unknown>) => ({ ...d, _scope: "episodic" })));
  }

  if ((args.scope ?? "both") !== "episodic") {
    // Sans embedding, on filtre sur fact textuel
    let qb = supabase.from("proph3t_memory_semantic").select("id, fact, source, confidence, scope, scope_id").is("forgotten_at", null).limit(k);
    if (queryEmbedding) {
      // pgvector cosine via RPC (a creer si besoin) — fallback ilike pour le moment
      qb = qb.ilike("fact", `%${args.query.slice(0, 50)}%`);
    } else {
      qb = qb.ilike("fact", `%${args.query.slice(0, 50)}%`);
    }
    const { data } = await qb;
    if (data) matches.push(...data.map((d: Record<string, unknown>) => ({ ...d, _scope: "semantic" })));
  }

  return { ok: true, matches: matches.slice(0, k) };
}

export async function updateMemory(supabase: SbClient, args: {
  memory_id: string;
  scope: "episodic" | "semantic";
  patch: Record<string, unknown>;
}): Promise<{ ok: boolean; error?: string }> {
  if (!args.memory_id || !args.patch) return { ok: false, error: "memory_id et patch requis" };
  const table = args.scope === "episodic" ? "proph3t_memory_episodic" : "proph3t_memory_semantic";
  const { error } = await supabase.from(table).update({ ...args.patch, updated_at: new Date().toISOString() }).eq("id", args.memory_id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Soft delete pour conformite RGPD (CDC §3.2 #6 forget_memory). */
export async function forgetMemory(supabase: SbClient, args: {
  memory_id: string;
  scope: "episodic" | "semantic";
  reason: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!args.memory_id || !args.reason) return { ok: false, error: "memory_id et reason requis (RGPD)" };
  if (args.scope === "semantic") {
    const { error } = await supabase.from("proph3t_memory_semantic").update({
      forgotten_at: new Date().toISOString(),
      forgotten_reason: args.reason,
    }).eq("id", args.memory_id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  // Episodique : delete dur (RGPD effacement complet)
  const { error } = await supabase.from("proph3t_memory_episodic").delete().eq("id", args.memory_id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
