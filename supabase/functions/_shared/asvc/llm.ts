// Routeur LLM des agents ASVC.
// Avant : chaque agent appelait Anthropic en dur (ANTHROPIC_API_KEY).
// Maintenant : si GROQ_API_KEY est posé (secret partagé côté serveur, free tier),
// on l'utilise ; sinon on retombe sur Anthropic. groqChat et anthropicChat
// partagent la même signature et la même forme de retour (OllamaChatResult),
// donc le remplacement est transparent pour les agents.
import type { OllamaMessage, OllamaChatResult } from "../proph3t/ollama.ts";
import { groqChat, getGroqApiKey, getGroqModel } from "../proph3t/groq.ts";
import { anthropicChat } from "../proph3t/anthropic.ts";

export interface AsvcChatParams {
  apiKey: string;
  model: string;
  messages: OllamaMessage[];
  temperature?: number;
  maxTokens?: number;
}

export async function asvcChat(params: AsvcChatParams): Promise<OllamaChatResult> {
  const groqKey = getGroqApiKey();
  if (groqKey) {
    return groqChat({
      apiKey: groqKey,
      model: getGroqModel(),
      messages: params.messages,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
    });
  }
  return anthropicChat({
    apiKey: params.apiKey,
    model: params.model,
    messages: params.messages,
    temperature: params.temperature,
    maxTokens: params.maxTokens,
  });
}
