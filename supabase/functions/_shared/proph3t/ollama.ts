// Helpers to call the self-hosted Ollama server.
// VPS endpoint configured via OLLAMA_URL secret (default http://localhost:11434).
// Modèles attendus selon CDC §3.3:
//   - llama3.1:8b-instruct-q4_K_M  (génération + function calling)
//   - nomic-embed-text             (embeddings 768d)

const OLLAMA_URL = Deno.env.get("OLLAMA_URL") || "http://localhost:11434";
const CHAT_MODEL = Deno.env.get("OLLAMA_CHAT_MODEL") || "llama3.1:8b-instruct-q4_K_M";
const EMBED_MODEL = Deno.env.get("OLLAMA_EMBED_MODEL") || "nomic-embed-text";

export interface OllamaMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: unknown[];
  name?: string;
}

export interface OllamaTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface OllamaChatResult {
  message: OllamaMessage & { tool_calls?: { function: { name: string; arguments: Record<string, unknown> } }[] };
  done: boolean;
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

/** Single-turn chat completion. Stream is false (used inside the orchestrator). */
export async function chat(params: {
  messages: OllamaMessage[];
  tools?: OllamaTool[];
  format?: "json";
  temperature?: number;
}): Promise<OllamaChatResult> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: params.messages,
      tools: params.tools,
      format: params.format,
      stream: false,
      options: {
        temperature: params.temperature ?? 0.2,
        num_ctx: 8192,
      },
    }),
  });
  if (!res.ok) throw new Error(`Ollama chat error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Streaming chat. Returns a ReadableStream of `data: {delta,done}\n\n` SSE chunks. */
export async function chatStream(params: {
  messages: OllamaMessage[];
  tools?: OllamaTool[];
  temperature?: number;
}): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: params.messages,
      tools: params.tools,
      stream: true,
      options: { temperature: params.temperature ?? 0.2, num_ctx: 8192 },
    }),
  });
  if (!res.ok || !res.body) throw new Error(`Ollama stream error ${res.status}`);
  return res.body;
}

/** Embeddings (single text). Returns vector of `embedding_length` floats. */
export async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
  });
  if (!res.ok) throw new Error(`Ollama embed error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.embedding as number[];
}

/** Vérifie que le VPS Ollama répond et que les modèles sont chargés. */
export async function healthcheck(): Promise<{ ok: boolean; models: string[]; error?: string }> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!res.ok) return { ok: false, models: [], error: `HTTP ${res.status}` };
    const data = await res.json();
    const models = (data.models || []).map((m: { name: string }) => m.name);
    return { ok: true, models };
  } catch (err) {
    return { ok: false, models: [], error: (err as Error).message };
  }
}
