// PROPH3T Health — diagnostic endpoint
// Retourne le status des providers LLM sans appeler de LLM.
// Public (pas de JWT requis) pour faciliter le diagnostic admin.

import { corsHeaders } from "../_shared/cors.ts";

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const status = {
    timestamp: new Date().toISOString(),
    edge_function: "proph3t-health",
    env_vars: {
      GROQ_API_KEY: !!Deno.env.get("GROQ_API_KEY"),
      GROQ_MODEL: Deno.env.get("GROQ_MODEL") ?? "default",
      OLLAMA_URL: !!Deno.env.get("OLLAMA_URL"),
      APP_ENCRYPTION_KEY: !!Deno.env.get("APP_ENCRYPTION_KEY"),
      GEMINI_API_KEY_FALLBACK: !!Deno.env.get("GEMINI_API_KEY_FALLBACK"),
      ANTHROPIC_API_KEY: !!Deno.env.get("ANTHROPIC_API_KEY"),
      ASVC_ANTHROPIC_API_KEY: !!Deno.env.get("ASVC_ANTHROPIC_API_KEY"),
      CRON_SHARED_SECRET: !!Deno.env.get("CRON_SHARED_SECRET"),
      SUPABASE_URL: !!Deno.env.get("SUPABASE_URL"),
      SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    },
    diagnostic: {
      groq_ready: !!Deno.env.get("GROQ_API_KEY"),
      anthropic_ready: !!Deno.env.get("ANTHROPIC_API_KEY") || !!Deno.env.get("ASVC_ANTHROPIC_API_KEY"),
      llm_provider_ready: !!Deno.env.get("GROQ_API_KEY") || !!Deno.env.get("ANTHROPIC_API_KEY") || !!Deno.env.get("ASVC_ANTHROPIC_API_KEY"),
      byok_anthropic_ready: !!Deno.env.get("APP_ENCRYPTION_KEY"),
      byok_gemini_ready: !!Deno.env.get("APP_ENCRYPTION_KEY"),
      ollama_ready: !!Deno.env.get("OLLAMA_URL"),
      cron_ready: !!Deno.env.get("CRON_SHARED_SECRET"),
    },
  };

  return new Response(JSON.stringify(status, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
