// PROPH3T v2 — Boucle de feedback (CDC §5.2 Module Boucle de feedback)
// 👍 → indexer la paire Q/R dans proph3t_validated_qa
// 👎 → marquer comme incorrect (utilisable pour eval / audit)
// ✏️ → stocker correction; après 3 corrections similaires sur même périmètre,
//      générer une business_rule auto.

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { embed } from "../_shared/proph3t/ollama.ts";
import { appendAudit } from "../_shared/proph3t/audit.ts";

const CORRECTIONS_THRESHOLD_FOR_RULE = 3;

interface FeedbackBody {
  message_id: string;
  rating: "up" | "down" | "correction";
  correction_text?: string;
  reason?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await requireUser(req);
    const body = await req.json() as FeedbackBody;
    if (!body.message_id || !body.rating) return errorResponse("message_id et rating requis", 400);
    if (body.rating === "correction" && !body.correction_text) return errorResponse("correction_text requis pour rating=correction", 400);

    // 1. Récupérer le message + la conversation pour avoir question/réponse
    const { data: msg, error: msgErr } = await supabaseAdmin
      .from("proph3t_messages")
      .select("id, conversation_id, role, content")
      .eq("id", body.message_id)
      .single();
    if (msgErr || !msg) return errorResponse("Message introuvable", 404);
    if (msg.role !== "assistant") return errorResponse("Feedback uniquement sur messages assistant", 400);

    // 2. Insérer le feedback
    const { data: fb, error: fbErr } = await supabaseAdmin.from("proph3t_feedback").insert({
      message_id: body.message_id,
      user_id: user.id,
      rating: body.rating,
      correction_text: body.correction_text ?? null,
      reason: body.reason ?? null,
    }).select("id").single();
    if (fbErr) throw new Error(`feedback: ${fbErr.message}`);

    // 3. Récupérer le message user qui précède (la question)
    const { data: userMsg } = await supabaseAdmin
      .from("proph3t_messages")
      .select("content")
      .eq("conversation_id", msg.conversation_id)
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let validatedQaId: string | null = null;
    let ruleGenerated: { id: string; rule_text: string } | null = null;

    if (body.rating === "up" && userMsg) {
      // Indexer la paire Q/R comme validée
      const questionEmbedding = await embed(userMsg.content);
      const { data: existing } = await supabaseAdmin
        .from("proph3t_validated_qa")
        .select("id, validation_count")
        .eq("question", userMsg.content)
        .maybeSingle();

      if (existing?.id) {
        await supabaseAdmin.from("proph3t_validated_qa").update({
          validation_count: existing.validation_count + 1,
          last_used_at: new Date().toISOString(),
        }).eq("id", existing.id);
        validatedQaId = existing.id;
      } else {
        const { data: inserted } = await supabaseAdmin.from("proph3t_validated_qa").insert({
          question: userMsg.content,
          answer: msg.content,
          question_embedding: questionEmbedding,
          source_message_id: msg.id,
        }).select("id").single();
        validatedQaId = inserted?.id ?? null;
      }
      await supabaseAdmin.from("proph3t_feedback").update({ applied_at: new Date().toISOString() }).eq("id", fb.id);
    }

    if (body.rating === "correction" && body.correction_text && userMsg) {
      // Stocker correction comme nouvelle paire validated_qa avec la BONNE réponse
      const questionEmbedding = await embed(userMsg.content);
      await supabaseAdmin.from("proph3t_validated_qa").insert({
        question: userMsg.content,
        answer: body.correction_text,
        question_embedding: questionEmbedding,
        source_message_id: msg.id,
      });

      // Compter les corrections similaires (même utilisateur, même type de question)
      // Heuristique simple v0: 3 corrections de cet user dans les 30 derniers jours
      // → on génère une règle métier qu'un admin pourra valider.
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const { count } = await supabaseAdmin
        .from("proph3t_feedback")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("rating", "correction")
        .gte("created_at", since);

      if ((count ?? 0) >= CORRECTIONS_THRESHOLD_FOR_RULE) {
        const ruleText = `Correction utilisateur récurrente: "${body.correction_text.slice(0, 200)}"`;
        const { data: rule } = await supabaseAdmin.from("proph3t_business_rules").insert({
          rule_text: ruleText,
          source_feedback_ids: [fb.id],
          created_by: user.id,
          active: false, // requiert validation admin
        }).select("id, rule_text").single();
        ruleGenerated = rule ?? null;
      }
      await supabaseAdmin.from("proph3t_feedback").update({ applied_at: new Date().toISOString() }).eq("id", fb.id);
    }

    // 4. Audit
    await appendAudit({
      action: "proph3t_feedback",
      actor_user_id: user.id,
      subject_type: "message",
      subject_id: body.message_id,
      content: { rating: body.rating, validated_qa_id: validatedQaId, rule_generated: ruleGenerated?.id },
    });

    return jsonResponse({
      feedback_id: fb.id,
      validated_qa_id: validatedQaId,
      rule_generated: ruleGenerated,
    });
  } catch (err) {
    console.error("[proph3t-feedback] error", err);
    const e = err as Error & { status?: number };
    if (e.status) return errorResponse(e.message, e.status);
    return errorResponse(e.message);
  }
});
