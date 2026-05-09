// PROPH3T RAG Reindex — recalcule les embeddings 768d pour tous les chunks
// dont l'embedding est NULL. Utilise Gemini text-embedding-004.
//
// Reserve aux admins. Body : { scope?: 'global' | 'all', limit?: number }

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { makeEmbedding, resolveGeminiKey } from "../_shared/proph3t/embeddings.ts";

interface ReindexBody {
  scope?: "global" | "all";
  limit?: number;
  force?: boolean;          // recalcule meme si embedding existe deja
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const user = await requireUser(req);
    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
      return errorResponse("Acces reserve aux admins", 403);
    }

    const body = await req.json() as ReindexBody;
    const limit = body.limit ?? 100;
    const force = body.force ?? false;

    // Resoudre la cle Gemini (BYOK admin ou fallback serveur)
    const apiKey = await resolveGeminiKey(supabaseAdmin, user.id);
    if (!apiKey) {
      return errorResponse("Pas de cle Gemini disponible (BYOK admin ou GEMINI_API_KEY_FALLBACK serveur)", 400);
    }

    // Selection des chunks a indexer
    let qb = supabaseAdmin
      .from("proph3t_rag_chunks")
      .select("id, content, document_id, proph3t_rag_documents!inner(scope, scope_id)")
      .limit(limit);
    if (!force) qb = qb.is("embedding", null);
    if (body.scope === "global") qb = qb.eq("proph3t_rag_documents.scope", "global");

    const { data: chunks, error } = await qb;
    if (error) throw new Error(`select chunks: ${error.message}`);
    if (!chunks || chunks.length === 0) {
      return jsonResponse({ ok: true, processed: 0, message: "Aucun chunk a indexer" });
    }

    const t0 = Date.now();
    const results = { processed: 0, succeeded: 0, failed: 0, errors: [] as string[] };

    // Traitement sequentiel pour respecter les rate limits Gemini (60 req/min sur free tier)
    for (const c of chunks) {
      results.processed++;
      try {
        const emb = await makeEmbedding(c.content, apiKey);
        if (!emb) {
          results.failed++;
          results.errors.push(`Chunk ${c.id}: embedding null`);
          continue;
        }
        const { error: updErr } = await supabaseAdmin
          .from("proph3t_rag_chunks")
          .update({ embedding: emb })
          .eq("id", c.id);
        if (updErr) {
          results.failed++;
          results.errors.push(`Chunk ${c.id}: ${updErr.message}`);
          continue;
        }
        results.succeeded++;
        // Petit delai pour eviter rate limit (1.1s entre 2 calls = max 54/min)
        if (results.processed < chunks.length) {
          await new Promise(r => setTimeout(r, 1100));
        }
      } catch (e) {
        results.failed++;
        results.errors.push(`Chunk ${c.id}: ${(e as Error).message}`);
      }
    }

    return jsonResponse({
      ok: true,
      duration_ms: Date.now() - t0,
      ...results,
      errors: results.errors.slice(0, 10),  // limite logs
    });
  } catch (err) {
    const e = err as Error & { status?: number };
    return errorResponse(e.message, e.status ?? 500);
  }
});
