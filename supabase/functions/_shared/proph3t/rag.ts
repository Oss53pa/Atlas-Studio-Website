// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — RAG (CDC §3.2 RAG L1)
// 3 tools : search_app_knowledge, search_tenant_documents, index_document
// ═══════════════════════════════════════════════════════════════════════════
// Note : utilise pgvector cosine similarity quand un embedding est fourni,
// sinon fallback ilike full-text. Phase 1 ajoutera Gemini text-embedding-004.

// deno-lint-ignore no-explicit-any
type SbClient = any;

/**
 * Recherche dans la base de connaissances knowledge (scope global ou app).
 * - scope_id optionnel : 'cockpit-fa', 'atlas-fa', 'global', etc.
 * - top_k : nombre de chunks a remonter.
 */
export async function searchAppKnowledge(supabase: SbClient, args: {
  query: string;
  scope_id?: string;       // ex: 'cockpit-fa' ou 'global'
  source_type?: string;    // 'syscohada', 'audcif', 'cgi-ci', etc.
  top_k?: number;
}, queryEmbedding?: number[]): Promise<{ ok: boolean; results: unknown[]; error?: string }> {
  const k = args.top_k ?? 5;

  if (queryEmbedding && queryEmbedding.length === 768) {
    // Recherche vectorielle via RPC (a creer si besoin) — fallback ilike pour le moment
    const { data, error } = await supabase.rpc("proph3t_search_rag_chunks", {
      query_embedding: queryEmbedding,
      filter_scope_id: args.scope_id ?? null,
      filter_source_type: args.source_type ?? null,
      match_count: k,
    });
    if (!error && data) {
      return { ok: true, results: data };
    }
    // Si la RPC n'existe pas encore, on tombe sur le fallback texte
  }

  // Fallback : full-text sur chunks.content + filtre via document parent
  let qb = supabase
    .from("proph3t_rag_chunks")
    .select("id, content, chunk_index, document_id, proph3t_rag_documents!inner(scope, scope_id, source_type, title, source_url)")
    .ilike("content", `%${args.query.slice(0, 80)}%`)
    .limit(k);

  if (args.scope_id) {
    qb = qb.eq("proph3t_rag_documents.scope_id", args.scope_id);
  }
  if (args.source_type) {
    qb = qb.eq("proph3t_rag_documents.source_type", args.source_type);
  }

  const { data, error } = await qb;
  if (error) return { ok: false, results: [], error: error.message };
  return { ok: true, results: data ?? [] };
}

/**
 * Recherche dans les documents propres a un tenant (scope='tenant').
 */
export async function searchTenantDocuments(supabase: SbClient, args: {
  query: string;
  tenant_id: string;
  source_type?: string;
  top_k?: number;
}, queryEmbedding?: number[]): Promise<{ ok: boolean; results: unknown[]; error?: string }> {
  if (!args.tenant_id) return { ok: false, results: [], error: "tenant_id requis" };
  const k = args.top_k ?? 8;

  if (queryEmbedding && queryEmbedding.length === 768) {
    const { data, error } = await supabase.rpc("proph3t_search_rag_chunks", {
      query_embedding: queryEmbedding,
      filter_scope_id: args.tenant_id,
      filter_source_type: args.source_type ?? null,
      match_count: k,
    });
    if (!error && data) return { ok: true, results: data };
  }

  let qb = supabase
    .from("proph3t_rag_chunks")
    .select("id, content, chunk_index, document_id, proph3t_rag_documents!inner(scope, scope_id, source_type, title)")
    .eq("proph3t_rag_documents.scope", "tenant")
    .eq("proph3t_rag_documents.scope_id", args.tenant_id)
    .ilike("content", `%${args.query.slice(0, 80)}%`)
    .limit(k);

  if (args.source_type) qb = qb.eq("proph3t_rag_documents.source_type", args.source_type);

  const { data, error } = await qb;
  if (error) return { ok: false, results: [], error: error.message };
  return { ok: true, results: data ?? [] };
}

/**
 * Indexe un document dans le RAG : cree le row document + decoupe en chunks.
 * Si embeddingFn fourni, calcule l'embedding pour chaque chunk.
 */
export async function indexDocument(supabase: SbClient, args: {
  scope: "global" | "app" | "tenant";
  scope_id?: string;
  source_url?: string;
  source_type: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}, embeddingFn?: (text: string) => Promise<number[]>): Promise<{ ok: boolean; document_id?: string; chunks_created?: number; error?: string }> {
  if (!args.title || !args.content || !args.scope || !args.source_type) {
    return { ok: false, error: "title, content, scope, source_type requis" };
  }

  // 1. Inserer le document
  const { data: doc, error: docErr } = await supabase.from("proph3t_rag_documents").insert({
    scope: args.scope,
    scope_id: args.scope_id ?? null,
    source_url: args.source_url ?? null,
    source_type: args.source_type,
    title: args.title,
    content: args.content,
    metadata: args.metadata ?? {},
  }).select("id").single();
  if (docErr) return { ok: false, error: docErr.message };

  // 2. Chunker le contenu : ~500 chars par chunk avec overlap 50 chars
  const chunks: string[] = [];
  const text = args.content;
  const size = 500;
  const overlap = 50;
  for (let i = 0; i < text.length; i += (size - overlap)) {
    chunks.push(text.slice(i, i + size));
  }

  // 3. Inserer chaque chunk (avec embedding si fonction fournie)
  const chunkRows = await Promise.all(chunks.map(async (chunk, idx) => ({
    document_id: doc.id,
    chunk_index: idx,
    content: chunk,
    embedding: embeddingFn ? await embeddingFn(chunk).catch(() => null) : null,
    token_count: Math.ceil(chunk.length / 4),  // approximation grossiere
  })));

  const { error: chunkErr } = await supabase.from("proph3t_rag_chunks").insert(chunkRows);
  if (chunkErr) return { ok: false, error: chunkErr.message };

  return { ok: true, document_id: doc.id, chunks_created: chunkRows.length };
}
