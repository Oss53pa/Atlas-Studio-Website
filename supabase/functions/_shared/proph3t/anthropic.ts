// Adapter Anthropic Claude — meme contrat que ollama.ts pour permettre
// au orchestrateur Proph3t de switcher de provider sans changer son code.
//
// Mapping :
//   - OllamaMessage[]            → Anthropic messages[] + system
//   - OllamaTool[] (function)    → Anthropic tools[] (input_schema)
//   - tool_calls (function call) → content blocks tool_use
//   - role:"tool"                → user message avec tool_result content block
//
// La cle Anthropic est lue depuis la DB (RPC proph3t_get_anthropic_key) avec
// le master_key APP_ENCRYPTION_KEY presente dans l'env de la fonction.

import type { OllamaMessage, OllamaTool, OllamaChatResult } from "./ollama.ts";

export type AnthropicModel =
  | "claude-haiku-4-5-20251001"
  | "claude-sonnet-4-6";

export const DEFAULT_ANTHROPIC_MODEL: AnthropicModel = "claude-haiku-4-5-20251001";

interface AnthropicToolUse {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface AnthropicTextBlock {
  type: "text";
  text: string;
}

type AnthropicContentBlock = AnthropicTextBlock | AnthropicToolUse;

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

interface AnthropicResponse {
  id: string;
  type: "message";
  role: "assistant";
  model: string;
  content: AnthropicContentBlock[];
  stop_reason: string;
  usage: { input_tokens: number; output_tokens: number };
}

/** Convertit le tableau de messages "Ollama-style" en payload Anthropic. */
function toAnthropicMessages(messages: OllamaMessage[]): {
  system: string | undefined;
  messages: AnthropicMessage[];
} {
  let system: string | undefined;
  const out: AnthropicMessage[] = [];
  // Buffer pour empiler les tool_use d'un assistant et les tool_result du tool suivant
  let pendingToolResults: { type: "tool_result"; tool_use_id: string; content: string }[] = [];

  const flushToolResults = () => {
    if (pendingToolResults.length > 0) {
      out.push({ role: "user", content: pendingToolResults as unknown as AnthropicContentBlock[] });
      pendingToolResults = [];
    }
  };

  for (const m of messages) {
    if (m.role === "system") {
      system = (system ? system + "\n\n" : "") + m.content;
      continue;
    }
    if (m.role === "user") {
      flushToolResults();
      out.push({ role: "user", content: m.content });
      continue;
    }
    if (m.role === "assistant") {
      flushToolResults();
      const blocks: AnthropicContentBlock[] = [];
      if (m.content && m.content.length > 0) {
        blocks.push({ type: "text", text: m.content });
      }
      const toolCalls = (m.tool_calls ?? []) as Array<{
        id?: string;
        function: { name: string; arguments: Record<string, unknown> };
      }>;
      for (let i = 0; i < toolCalls.length; i++) {
        const tc = toolCalls[i];
        blocks.push({
          type: "tool_use",
          id: tc.id ?? `tu_${i}_${Date.now()}`,
          name: tc.function.name,
          input: tc.function.arguments ?? {},
        });
      }
      if (blocks.length === 0) blocks.push({ type: "text", text: "" });
      out.push({ role: "assistant", content: blocks });
      continue;
    }
    if (m.role === "tool") {
      // Trouver le dernier assistant pour rapprocher le tool_use_id correspondant
      const lastAssistant = [...out].reverse().find((x) => x.role === "assistant");
      let toolUseId = "";
      if (lastAssistant && Array.isArray(lastAssistant.content)) {
        const matchingToolUse = lastAssistant.content.find(
          (b) => b.type === "tool_use" && b.name === m.name
        ) as AnthropicToolUse | undefined;
        if (matchingToolUse) toolUseId = matchingToolUse.id;
      }
      pendingToolResults.push({
        type: "tool_result",
        tool_use_id: toolUseId || `tu_orphan_${Date.now()}`,
        content: m.content,
      });
      continue;
    }
  }

  flushToolResults();
  return { system, messages: out };
}

/** Convertit les tool declarations Ollama → Anthropic. */
function toAnthropicTools(tools: OllamaTool[]): Array<{
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}> {
  return tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  }));
}

/** Re-emballe la reponse Anthropic au format OllamaChatResult attendu par l'orchestrateur. */
function toOllamaResult(resp: AnthropicResponse): OllamaChatResult {
  const textBlocks = resp.content.filter((b): b is AnthropicTextBlock => b.type === "text");
  const toolUses = resp.content.filter((b): b is AnthropicToolUse => b.type === "tool_use");

  return {
    message: {
      role: "assistant",
      content: textBlocks.map((b) => b.text).join("\n").trim(),
      tool_calls: toolUses.length
        ? toolUses.map((t) => ({
            function: { name: t.name, arguments: t.input },
          }))
        : undefined,
    },
    done: true,
    prompt_eval_count: resp.usage.input_tokens,
    eval_count: resp.usage.output_tokens,
  };
}

export interface AnthropicChatParams {
  apiKey: string;
  model: AnthropicModel | string;
  messages: OllamaMessage[];
  tools?: OllamaTool[];
  temperature?: number;
  maxTokens?: number;
}

/** Single-turn chat completion via Anthropic API. */
export async function anthropicChat(params: AnthropicChatParams): Promise<OllamaChatResult> {
  const { system, messages } = toAnthropicMessages(params.messages);
  const body: Record<string, unknown> = {
    model: params.model,
    max_tokens: params.maxTokens ?? 4096,
    temperature: params.temperature ?? 0.2,
    messages,
  };
  if (system) body.system = system;
  if (params.tools && params.tools.length > 0) body.tools = toAnthropicTools(params.tools);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": params.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${errText.slice(0, 500)}`);
  }
  const data = (await res.json()) as AnthropicResponse;
  return toOllamaResult(data);
}

/** Validation legere d'une cle (appelle l'API avec un mini message pour verifier la cle). */
export async function anthropicTestKey(apiKey: string, model: string): Promise<{
  ok: boolean;
  error?: string;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
}> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 16,
        messages: [{ role: "user", content: "ping" }],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return { ok: false, error: `${res.status} ${t.slice(0, 200)}` };
    }
    const data = (await res.json()) as AnthropicResponse;
    return {
      ok: true,
      model: data.model,
      input_tokens: data.usage?.input_tokens,
      output_tokens: data.usage?.output_tokens,
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/** Recupere la cle Anthropic dechiffree d'un user via la RPC SECURITY DEFINER. */
export async function getAnthropicKeyForUser(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string
): Promise<{ apiKey: string; model: AnthropicModel } | null> {
  const masterKey = Deno.env.get("APP_ENCRYPTION_KEY");
  if (!masterKey) {
    throw new Error("APP_ENCRYPTION_KEY absent — impossible de dechiffrer la cle Anthropic");
  }

  const [{ data: keyData, error: keyErr }, { data: profile }] = await Promise.all([
    supabase.rpc("proph3t_get_anthropic_key", {
      p_user_id: userId,
      p_master_key: masterKey,
    }),
    supabase
      .from("profiles")
      .select("anthropic_model, proph3t_provider")
      .eq("id", userId)
      .single(),
  ]);

  if (keyErr) throw new Error(`get_anthropic_key: ${keyErr.message}`);
  if (!keyData) return null;
  if (profile?.proph3t_provider !== "anthropic") return null;

  const model = (profile?.anthropic_model as AnthropicModel) ?? DEFAULT_ANTHROPIC_MODEL;
  return { apiKey: keyData as string, model };
}
