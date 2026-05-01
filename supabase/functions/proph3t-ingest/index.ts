// PROPH3T v2 — Pipeline RAG d'ingestion (CDC §5.2 Module RAG vectoriel)
// Pipeline: text → chunks 500 tokens (overlap 50) → embed → stockage pgvector.
//
// Endpoints supportés:
//   POST /proph3t-ingest          { document_id, text, metadata? }
//   POST /proph3t-ingest          { society_id, product, title, source_type, text }
// (Si document_id fourni, ré-indexe ; sinon crée un nouveau document.)

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { embed } from "../_shared/proph3t/ollama.ts";
import { appendAudit } from "../_shared/proph3t/audit.ts";

const CHUNK_SIZE = 500;          // ~500 tokens via heuristique (1 token ≈ 4 chars FR)
const CHUNK_OVERLAP = 50;
const CHARS_PER_TOKEN = 4;

interface IngestBody {
  document_id?: string;
  society_id?: string;
  product?: string;
  title?: string;
  source_type?: string;
  text: string;
  metadata?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await requireUser(req);
    const body = await req.json() as IngestBody;
    if (!body.text || body.text.length < 10) return errorResponse("Texte trop court", 400);

    // 1. Document: créer ou réutiliser
    let documentId = body.document_id;
    if (!documentId) {
      if (!body.title || !body.source_type) return errorResponse("title et source_type requis si document_id absent", 400);
      const { data: doc, error: docErr } = await supabaseAdmin.from("proph3t_documents").insert({
        title: body.title,
        source_type: body.source_type,
        product: body.product ?? null,
        society_id: body.society_id ?? null,
        created_by: user.id,
        metadata: body.metadata ?? {},
        ingestion_status: "processing",
      }).select("id").single();
      if (docErr) throw new Error(`document: ${docErr.message}`);
      documentId = doc.id;
    } else {
      // Re-ingestion: purger les anciens chunks
      await supabaseAdmin.from("proph3t_chunks").delete().eq("document_id", documentId);
      await supabaseAdmin.from("proph3t_documents").update({ ingestion_status: "processing" }).eq("id", documentId);
    }

    // 2. Découper en chunks
    const chunks = splitIntoChunks(body.text, CHUNK_SIZE, CHUNK_OVERLAP);

    // 3. Embedder + insérer en lot
    let totalChunks = 0;
    for (let i = 0; i < chunks.length; i++) {
      const content = chunks[i];
      let embedding: number[];
      try {
        embedding = await embed(content);
      } catch (err) {
        await supabaseAdmin.from("proph3t_documents").update({
          ingestion_status: "failed",
          ingestion_error: `Échec embedding chunk ${i}: ${(err as Error).message}`,
        }).eq("id", documentId);
        throw err;
      }
      const { error: chunkErr } = await supabaseAdmin.from("proph3t_chunks").insert({
        document_id: documentId,
        chunk_index: i,
        content,
        embedding,
        token_count: Math.ceil(content.length / CHARS_PER_TOKEN),
        metadata: body.metadata ?? {},
      });
      if (chunkErr) throw new Error(`chunk ${i}: ${chunkErr.message}`);
      totalChunks++;
    }

    // 4. Marquer le document comme done
    await supabaseAdmin.from("proph3t_documents").update({
      ingestion_status: "done",
      total_chunks: totalChunks,
    }).eq("id", documentId);

    // 5. Audit
    await appendAudit({
      action: "proph3t_ingest",
      actor_user_id: user.id,
      subject_type: "document",
      subject_id: documentId,
      content: { chunk_count: totalChunks, char_count: body.text.length },
    });

    return jsonResponse({
      document_id: documentId,
      chunk_count: totalChunks,
      ingestion_status: "done",
    });
  } catch (err) {
    console.error("[proph3t-ingest] error", err);
    const e = err as Error & { status?: number };
    if (e.status) return errorResponse(e.message, e.status);
    return errorResponse(e.message);
  }
});

/**
 * Découpe un texte en chunks de ~chunkSize tokens avec overlap.
 * Heuristique: 1 token ≈ 4 caractères en français. Préserve les frontières
 * de phrase quand possible (split sur ponctuation forte).
 */
function splitIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
  const chunkChars = chunkSize * CHARS_PER_TOKEN;
  const overlapChars = overlap * CHARS_PER_TOKEN;
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const s of sentences) {
    if ((current + " " + s).length > chunkChars && current.length > 0) {
      chunks.push(current.trim());
      // Démarrer le prochain chunk avec un overlap (les derniers chars du précédent)
      current = current.slice(-overlapChars) + " " + s;
    } else {
      current = current ? current + " " + s : s;
    }
  }
  if (current.trim().length > 0) chunks.push(current.trim());
  return chunks;
}
