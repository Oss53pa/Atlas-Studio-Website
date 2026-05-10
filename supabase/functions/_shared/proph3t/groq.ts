// Adapter Groq — API compatible OpenAI.
// Utilise comme FALLBACK CENTRAL (un seul GROQ_API_KEY secret cote serveur,
// partage par tous les users sans BYOK Anthropic/Gemini).
//
// Free tier Groq (mai 2026) :
//   - llama-3.3-70b-versatile : 30 req/min, 14400 req/jour, 100k tokens/jour
//   - llama-3.1-8b-instant : 30 req/min, 14400 req/jour
// Documentation : https://console.groq.com/docs/rate-limits
//
// Function calling : supporte sur llama-3.3-70b et llama-3.1-70b.

import type { OllamaMessage, OllamaTool, OllamaChatResult } from "./ollama.ts";

export type GroqModel =
  | "llama-3.3-70b-versatile"
  | "llama-3.1-8b-instant"
  | "mixtral-8x7b-32768"
  | "gemma2-9b-it";

export const DEFAULT_GROQ_MODEL: GroqModel = "llama-3.3-70b-versatile";

interface GroqMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
}

interface GroqResponse {
  id: string;
  choices: Array<{
    message: GroqMessage;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

function toGroqMessages(messages: OllamaMessage[]): GroqMessage[] {
  return messages.map((m, idx) => {
    if (m.role === "tool") {
      return {
        role: "tool" as const,
        content: m.content,
        // Groq/OpenAI requiert un tool_call_id matchant le precedent assistant.tool_calls
        // On fabrique un id stable par index — l'assistant precedent doit avoir le meme.
        tool_call_id: `tc_${idx}`,
        name: m.name,
      };
    }
    if (m.role === "assistant") {
      const toolCalls = (m.tool_calls ?? []) as Array<{
        function: { name: string; arguments: Record<string, unknown> };
      }>;
      if (toolCalls.length > 0) {
        return {
          role: "assistant" as const,
          content: m.content || null,
          tool_calls: toolCalls.map((tc, i) => ({
            id: `tc_${idx + i + 1}`,
            type: "function" as const,
            function: {
              name: tc.function.name,
              arguments: JSON.stringify(tc.function.arguments ?? {}),
            },
          })),
        };
      }
      return { role: "assistant" as const, content: m.content };
    }
    return { role: m.role as "system" | "user", content: m.content };
  });
}

function toGroqTools(tools: OllamaTool[]): Array<{
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}> {
  return tools.map(t => ({
    type: "function" as const,
    function: {
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    },
  }));
}

function toOllamaResult(resp: GroqResponse): OllamaChatResult {
  const msg = resp.choices[0]?.message;
  const toolCalls = msg?.tool_calls ?? [];
  return {
    message: {
      role: "assistant",
      content: msg?.content ?? "",
      tool_calls: toolCalls.length
        ? toolCalls.map(tc => ({
            function: {
              name: tc.function.name,
              arguments: (() => {
                try { return JSON.parse(tc.function.arguments); }
                catch { return { _raw: tc.function.arguments }; }
              })(),
            },
          }))
        : undefined,
    },
    done: true,
    prompt_eval_count: resp.usage?.prompt_tokens,
    eval_count: resp.usage?.completion_tokens,
  };
}

export interface GroqChatParams {
  apiKey: string;
  model: GroqModel | string;
  messages: OllamaMessage[];
  tools?: OllamaTool[];
  temperature?: number;
  maxTokens?: number;
}

export async function groqChat(params: GroqChatParams): Promise<OllamaChatResult> {
  const body: Record<string, unknown> = {
    model: params.model,
    messages: toGroqMessages(params.messages),
    temperature: params.temperature ?? 0.2,
    max_tokens: params.maxTokens ?? 4096,
  };
  if (params.tools && params.tools.length > 0) {
    body.tools = toGroqTools(params.tools);
    body.tool_choice = "auto";
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq API ${res.status}: ${errText.slice(0, 500)}`);
    }
    const data = (await res.json()) as GroqResponse;
    return toOllamaResult(data);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function groqTestKey(apiKey: string, model: string = DEFAULT_GROQ_MODEL): Promise<{
  ok: boolean;
  error?: string;
  model?: string;
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
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
    return { ok: true, model };
  } catch (err) {
    const e = err as Error;
    return { ok: false, error: e.name === "AbortError" ? "Timeout 15s — Groq API ne repond pas" : e.message };
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Le secret partage cote serveur. Pas de BYOK pour Groq. */
export function getGroqApiKey(): string | undefined {
  return Deno.env.get("GROQ_API_KEY") || undefined;
}

export function getGroqModel(): GroqModel {
  const m = Deno.env.get("GROQ_MODEL");
  if (m && (["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"] as string[]).includes(m)) {
    return m as GroqModel;
  }
  return DEFAULT_GROQ_MODEL;
}
