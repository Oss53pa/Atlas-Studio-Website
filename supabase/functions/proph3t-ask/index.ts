// PROPH3T v2 — Orchestrateur ReAct (CDC §3.4, §5.2)
// Cycle: Reason → Act (tool calls) → Observe → … (max 5 itérations).
// Construit le contexte à partir de mémoire + RAG + business rules,
// applique les garde-fous (citations + confidence + disclaimer).

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { chat, type OllamaMessage } from "../_shared/proph3t/ollama.ts";
import { anthropicChat, getAnthropicKeyForUser } from "../_shared/proph3t/anthropic.ts";
import { geminiChat, getGeminiKeyForUser } from "../_shared/proph3t/gemini.ts";
import { groqChat, getGroqApiKey, getGroqModel } from "../_shared/proph3t/groq.ts";
import { TOOL_DECLARATIONS, runTool, type ToolName } from "../_shared/proph3t/tools.ts";

// Tools qui ne dependent PAS d'Ollama embeddings (utilisables avec Anthropic/Gemini/Groq).
// Sont retires : search_knowledge et search_documents (legacy, necessitent Ollama embeddings).
// Sont retires : get_financial_data (stub jusqu'a Phase 1 CDC).
// search_app_knowledge / search_tenant_documents : fallback ilike sans embedding -> ok cloud.
// extract_from_image / parse_document_visual : OK si user a Gemini BYOK.
const TOOLS_NO_OLLAMA = TOOL_DECLARATIONS.filter(t =>
  !["search_knowledge", "search_documents", "get_financial_data"].includes(t.function.name)
);
// Pour les providers SANS support vision (Groq Llama 3.3 par defaut), on retire aussi vision.
const TOOLS_NO_VISION = TOOLS_NO_OLLAMA.filter(t =>
  !["extract_from_image", "parse_document_visual"].includes(t.function.name)
);
import { appendAudit } from "../_shared/proph3t/audit.ts";

const MAX_ITERATIONS = 5;
const SYSTEM_PROMPT = `Tu es PROPH3T, l'assistant IA souverain d'Atlas Studio dédié à la finance, comptabilité, fiscalité et droit OHADA.

Règles strictes:
1. Toute affirmation factuelle DOIT citer sa source (article SYSCOHADA, AUDCIF, document client, observation enregistrée). Si tu n'as pas de source, dis-le.
2. Pour tout chiffre, fournis un score de confiance 0-100 dans le champ "confidence". Sous 70, prefixe "[à vérifier]".
3. Tu n'inventes JAMAIS un montant ou un article. Si l'information manque, utilise les outils disponibles ou demande à l'utilisateur.
4. Réponds en français, ton professionnel mais accessible.
5. Termine par un rappel court "Décision finale: votre responsabilité, validation expert-comptable recommandée."

Outils à ta disposition: ${TOOL_DECLARATIONS.map(t => t.function.name).join(", ")}.`;

interface AskBody {
  message: string;
  conversation_id?: string;
  product: string;
  society_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const t0 = Date.now();
  try {
    const user = await requireUser(req);
    const body = await req.json() as AskBody;
    if (!body.message) return errorResponse("message requis", 400);
    if (!body.product) return errorResponse("product requis", 400);

    // 1. Conversation: créer ou récupérer
    let conversationId = body.conversation_id;
    if (!conversationId) {
      const { data: conv, error: convErr } = await supabaseAdmin.from("proph3t_conversations").insert({
        user_id: user.id,
        product: body.product,
        society_id: body.society_id ?? null,
      }).select("id").single();
      if (convErr) throw new Error(`conversation: ${convErr.message}`);
      conversationId = conv.id;
    }

    // 2. Charger user_profile pour adapter le ton
    const { data: profile } = await supabaseAdmin
      .from("proph3t_user_profile")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // 2bis. Determiner le provider LLM, dans cet ordre :
    //   1. BYOK Anthropic (si user a saisi sa cle)
    //   2. BYOK Gemini (si user a saisi sa cle)
    //   3. Groq fallback central (si secret GROQ_API_KEY defini cote serveur)
    //   4. Ollama self-hosted (fallback ultime, si OLLAMA_URL defini)
    const [anthropic, gemini] = await Promise.all([
      getAnthropicKeyForUser(supabaseAdmin, user.id).catch((e) => {
        console.warn("[proph3t-ask] BYOK Anthropic indisponible:", (e as Error).message);
        return null;
      }),
      getGeminiKeyForUser(supabaseAdmin, user.id).catch((e) => {
        console.warn("[proph3t-ask] BYOK Gemini indisponible:", (e as Error).message);
        return null;
      }),
    ]);
    const useAnthropic = !!anthropic;
    const useGemini = !useAnthropic && !!gemini;
    const groqKey = (!useAnthropic && !useGemini) ? getGroqApiKey() : undefined;
    const useGroq = !!groqKey;
    const groqModel = useGroq ? getGroqModel() : null;

    // 3. Charger les messages précédents de la conversation (contexte court)
    const { data: history } = await supabaseAdmin
      .from("proph3t_messages")
      .select("role, content, tool_calls")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    // 4. Persister le message user
    await supabaseAdmin.from("proph3t_messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: body.message,
    });

    // 5. Boucle ReAct — Reason / Act / Observe (max 5 itérations)
    const messages: OllamaMessage[] = [
      { role: "system", content: buildSystemPrompt(profile) },
      ...(history || []).map(h => ({ role: h.role as OllamaMessage["role"], content: h.content })),
      { role: "user", content: body.message },
    ];

    const citations: unknown[] = [];
    let finalAnswer = "";
    let modelUsed = useAnthropic
      ? anthropic!.model
      : useGemini
        ? gemini!.model
        : useGroq
          ? groqModel!
          : "llama3.1:8b-instruct-q4_K_M";

    // Strategie tools selon provider (CDC §3 tools registry L1, 28 tools) :
    // - Ollama self-hosted : TOUS tools, y compris vision si modele multimodal
    // - Anthropic / Gemini : TOOLS_NO_OLLAMA (vision OK, embeddings via fallback texte)
    // - Groq Llama 3.3     : TOOLS_NO_VISION (pas de vision native)
    const tools = useGroq
      ? TOOLS_NO_VISION
      : (useAnthropic || useGemini)
        ? TOOLS_NO_OLLAMA
        : TOOL_DECLARATIONS;

    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      const result = useAnthropic
        ? await anthropicChat({
            apiKey: anthropic!.apiKey,
            model: anthropic!.model,
            messages,
            tools,
            temperature: 0.2,
          })
        : useGemini
          ? await geminiChat({
              apiKey: gemini!.apiKey,
              model: gemini!.model,
              messages,
              tools,
              temperature: 0.2,
            })
          : useGroq
            ? await groqChat({
                apiKey: groqKey!,
                model: groqModel!,
                messages,
                tools,
                temperature: 0.2,
              })
            : await chat({
                messages,
                tools: TOOL_DECLARATIONS,
                temperature: 0.2,
              });

      const toolCalls = result.message.tool_calls || [];
      if (toolCalls.length === 0) {
        finalAnswer = result.message.content || "";
        break;
      }

      // Phase Act: exécuter chaque tool call
      messages.push({ role: "assistant", content: result.message.content || "", tool_calls: toolCalls });
      for (const tc of toolCalls) {
        const toolName = tc.function.name as ToolName;
        let toolResult: unknown;
        try {
          toolResult = await runTool(toolName, tc.function.arguments);
          if (
            toolName === "search_knowledge" ||
            toolName === "search_documents" ||
            toolName === "search_app_knowledge" ||
            toolName === "search_tenant_documents" ||
            toolName === "recall_similar_cases"
          ) {
            citations.push({ tool: toolName, args: tc.function.arguments, hits: toolResult });
          }
        } catch (err) {
          toolResult = { error: (err as Error).message };
        }
        messages.push({
          role: "tool",
          name: toolName,
          content: JSON.stringify(toolResult),
        });
      }
    }

    // 6. Garde-fou: si réponse vide, fallback explicite
    if (!finalAnswer) {
      finalAnswer = "Je n'ai pas pu produire une réponse fiable dans les itérations imparties. Reformulez votre question ou contactez un expert-comptable.";
    }

    // 7. Estimer un score de confiance simple basé sur présence de citations
    const confidence = citations.length > 0 ? 80 : 50;

    // 8. Persister le message assistant
    const { data: assistantMsg } = await supabaseAdmin.from("proph3t_messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: finalAnswer,
      citations,
      confidence_score: confidence,
      model_used: modelUsed,
      latency_ms: Date.now() - t0,
    }).select("id").single();

    // 9. Audit chaîné
    await appendAudit({
      action: "proph3t_ask",
      actor_user_id: user.id,
      subject_type: "conversation",
      subject_id: conversationId,
      content: { question: body.message, answer_length: finalAnswer.length, iterations: messages.length, confidence },
    });

    return jsonResponse({
      conversation_id: conversationId,
      message_id: assistantMsg?.id,
      answer: finalAnswer,
      citations,
      confidence,
      disclaimer: "PROPH3T est un assistant. Les décisions financières et fiscales restent sous votre responsabilité. Consultez un expert-comptable pour validation.",
    });
  } catch (err) {
    console.error("[proph3t-ask] error", err);
    const e = err as Error & { status?: number };
    if (e.status) return errorResponse(e.message, e.status);
    return errorResponse(e.message);
  }
});

function buildSystemPrompt(profile: { verbosity?: string; preferred_tone?: string; expertise_level?: string; custom_instructions?: string } | null): string {
  let prompt = SYSTEM_PROMPT;
  if (profile?.verbosity) prompt += `\n\nVerbosity: ${profile.verbosity}.`;
  if (profile?.preferred_tone) prompt += ` Tonalité: ${profile.preferred_tone}.`;
  if (profile?.expertise_level) prompt += ` Niveau utilisateur: ${profile.expertise_level}.`;
  if (profile?.custom_instructions) prompt += `\n\nInstructions perso: ${profile.custom_instructions}`;
  return prompt;
}
