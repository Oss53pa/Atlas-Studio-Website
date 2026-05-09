// Adapter Google Gemini — meme contrat que ollama.ts pour permettre
// au orchestrateur Proph3t de switcher de provider sans changer son code.
//
// Mapping :
//   - OllamaMessage[]            → Gemini contents[] + systemInstruction
//   - OllamaTool[] (function)    → Gemini tools[].functionDeclarations[]
//   - tool_calls (function call) → parts: [{ functionCall: { name, args } }]
//   - role:"tool"                → role:"function" + parts: [{ functionResponse }]
//
// La cle Gemini est lue depuis la DB (RPC proph3t_get_gemini_key) avec
// le master_key APP_ENCRYPTION_KEY presente dans l'env de la fonction.

import type { OllamaMessage, OllamaTool, OllamaChatResult } from "./ollama.ts";

export type GeminiModel =
  | "gemini-2.0-flash"
  | "gemini-2.5-flash"
  | "gemini-2.5-pro";

export const DEFAULT_GEMINI_MODEL: GeminiModel = "gemini-2.0-flash";

interface GeminiFunctionCall {
  name: string;
  args: Record<string, unknown>;
}
interface GeminiFunctionResponse {
  name: string;
  response: Record<string, unknown>;
}
interface GeminiPart {
  text?: string;
  functionCall?: GeminiFunctionCall;
  functionResponse?: GeminiFunctionResponse;
}
interface GeminiContent {
  role: "user" | "model" | "function";
  parts: GeminiPart[];
}
interface GeminiResponse {
  candidates: Array<{
    content: { parts: GeminiPart[]; role?: string };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

function safeJsonParse(s: string): Record<string, unknown> {
  try {
    const o = JSON.parse(s);
    return typeof o === "object" && o !== null ? (o as Record<string, unknown>) : { value: s };
  } catch {
    return { raw: s };
  }
}

function toGeminiContents(messages: OllamaMessage[]): {
  systemInstruction?: { parts: { text: string }[] };
  contents: GeminiContent[];
} {
  let systemText = "";
  const contents: GeminiContent[] = [];

  for (const m of messages) {
    if (m.role === "system") {
      systemText += (systemText ? "\n\n" : "") + m.content;
      continue;
    }
    if (m.role === "user") {
      contents.push({ role: "user", parts: [{ text: m.content }] });
      continue;
    }
    if (m.role === "assistant") {
      const parts: GeminiPart[] = [];
      if (m.content) parts.push({ text: m.content });
      const toolCalls = (m.tool_calls ?? []) as Array<{
        function: { name: string; arguments: Record<string, unknown> };
      }>;
      for (const tc of toolCalls) {
        parts.push({
          functionCall: {
            name: tc.function.name,
            args: tc.function.arguments ?? {},
          },
        });
      }
      if (parts.length === 0) parts.push({ text: "" });
      contents.push({ role: "model", parts });
      continue;
    }
    if (m.role === "tool") {
      contents.push({
        role: "function",
        parts: [
          {
            functionResponse: {
              name: m.name ?? "tool",
              response: safeJsonParse(m.content),
            },
          },
        ],
      });
      continue;
    }
  }

  return systemText
    ? { systemInstruction: { parts: [{ text: systemText }] }, contents }
    : { contents };
}

function toGeminiTools(tools: OllamaTool[]): Array<{
  functionDeclarations: Array<{ name: string; description: string; parameters: Record<string, unknown> }>;
}> {
  return [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      })),
    },
  ];
}

function toOllamaResult(resp: GeminiResponse): OllamaChatResult {
  const candidate = resp.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const textBlocks = parts.filter((p): p is GeminiPart & { text: string } => typeof p.text === "string");
  const toolCallParts = parts.filter((p): p is GeminiPart & { functionCall: GeminiFunctionCall } => !!p.functionCall);

  return {
    message: {
      role: "assistant",
      content: textBlocks.map((p) => p.text).join("\n").trim(),
      tool_calls: toolCallParts.length
        ? toolCallParts.map((p) => ({
            function: { name: p.functionCall!.name, arguments: p.functionCall!.args ?? {} },
          }))
        : undefined,
    },
    done: true,
    prompt_eval_count: resp.usageMetadata?.promptTokenCount,
    eval_count: resp.usageMetadata?.candidatesTokenCount,
  };
}

export interface GeminiChatParams {
  apiKey: string;
  model: GeminiModel | string;
  messages: OllamaMessage[];
  tools?: OllamaTool[];
  temperature?: number;
  maxTokens?: number;
}

export async function geminiChat(params: GeminiChatParams): Promise<OllamaChatResult> {
  const { systemInstruction, contents } = toGeminiContents(params.messages);
  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: params.temperature ?? 0.2,
      maxOutputTokens: params.maxTokens ?? 4096,
    },
  };
  if (systemInstruction) body.systemInstruction = systemInstruction;
  if (params.tools && params.tools.length > 0) body.tools = toGeminiTools(params.tools);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(params.model)}:generateContent?key=${encodeURIComponent(params.apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API ${res.status}: ${errText.slice(0, 500)}`);
  }
  const data = (await res.json()) as GeminiResponse;
  return toOllamaResult(data);
}

/** Validation legere d'une cle (mini message pour verifier la cle). */
export async function geminiTestKey(apiKey: string, model: string): Promise<{
  ok: boolean;
  error?: string;
  model?: string;
  prompt_tokens?: number;
  output_tokens?: number;
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "ping" }] }],
        generationConfig: { maxOutputTokens: 16 },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return { ok: false, error: `${res.status} ${t.slice(0, 200)}` };
    }
    const data = (await res.json()) as GeminiResponse;
    return {
      ok: true,
      model,
      prompt_tokens: data.usageMetadata?.promptTokenCount,
      output_tokens: data.usageMetadata?.candidatesTokenCount,
    };
  } catch (err) {
    const e = err as Error;
    return { ok: false, error: e.name === "AbortError" ? "Timeout 20s — Gemini API ne repond pas" : e.message };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getGeminiKeyForUser(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string
): Promise<{ apiKey: string; model: GeminiModel } | null> {
  const masterKey = Deno.env.get("APP_ENCRYPTION_KEY");
  if (!masterKey) {
    throw new Error("APP_ENCRYPTION_KEY absent — impossible de dechiffrer la cle Gemini");
  }

  const [{ data: keyData, error: keyErr }, { data: profile }] = await Promise.all([
    supabase.rpc("proph3t_get_gemini_key", {
      p_user_id: userId,
      p_master_key: masterKey,
    }),
    supabase
      .from("profiles")
      .select("gemini_model, proph3t_provider")
      .eq("id", userId)
      .single(),
  ]);

  if (keyErr) throw new Error(`get_gemini_key: ${keyErr.message}`);
  if (!keyData) return null;
  if (profile?.proph3t_provider !== "gemini") return null;

  const model = (profile?.gemini_model as GeminiModel) ?? DEFAULT_GEMINI_MODEL;
  return { apiKey: keyData as string, model };
}
