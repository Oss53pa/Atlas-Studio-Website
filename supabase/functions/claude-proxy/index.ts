// Edge function : claude-proxy (multi-provider Anthropic + Gemini + Ollama)
//
// Le slug "claude-proxy" est conservé pour la rétrocompat front, mais la fonction
// gère désormais Anthropic Claude ET Google Gemini.
//
// Actions (POST { action, ... }) :
//   - save_key   { provider: 'anthropic'|'gemini', api_key, model? }     → chiffre + stocke + bascule provider
//   - test_key   { provider: 'anthropic'|'gemini', api_key?, model? }    → teste (clé fournie ou stockée)
//   - clear_key  { provider: 'anthropic'|'gemini' }                      → efface la clé du provider donné
//   - set_settings { provider?, model? }                                  → met à jour le provider/modèle
//   - get_status {}                                                       → renvoie status complet
//
// Toutes les actions exigent un user authentifié (Bearer JWT).

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { anthropicTestKey, DEFAULT_ANTHROPIC_MODEL } from "../_shared/proph3t/anthropic.ts";
import { geminiTestKey, DEFAULT_GEMINI_MODEL } from "../_shared/proph3t/gemini.ts";

const ANTHROPIC_MODELS = ["claude-haiku-4-5-20251001", "claude-sonnet-4-6"] as const;
const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-pro"] as const;
type AllowedModel = typeof ANTHROPIC_MODELS[number] | typeof GEMINI_MODELS[number];

function isAnthropicModel(m: unknown): m is typeof ANTHROPIC_MODELS[number] {
  return typeof m === "string" && (ANTHROPIC_MODELS as readonly string[]).includes(m);
}
function isGeminiModel(m: unknown): m is typeof GEMINI_MODELS[number] {
  return typeof m === "string" && (GEMINI_MODELS as readonly string[]).includes(m);
}
function isAllowedModel(m: unknown): m is AllowedModel {
  return isAnthropicModel(m) || isGeminiModel(m);
}

type Provider = "anthropic" | "gemini";

interface Body {
  action: "save_key" | "test_key" | "clear_key" | "set_settings" | "get_status";
  provider?: Provider | "ollama";
  api_key?: string;
  model?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("POST requis", 405);

  try {
    const user = await requireUser(req);
    const body = (await req.json()) as Body;

    const masterKey = Deno.env.get("APP_ENCRYPTION_KEY");
    if (!masterKey && (body.action === "save_key" || body.action === "test_key")) {
      return errorResponse(
        "Configuration serveur incomplète : APP_ENCRYPTION_KEY non défini.",
        500
      );
    }

    switch (body.action) {
      // ─── save_key ──────────────────────────────────────────────────────
      case "save_key": {
        const provider = (body.provider ?? "anthropic") as Provider;
        if (provider !== "anthropic" && provider !== "gemini") {
          return errorResponse("Provider invalide pour save_key (anthropic|gemini)", 400);
        }
        if (!body.api_key || body.api_key.length < 20) {
          return errorResponse("Clé API invalide ou manquante", 400);
        }

        if (provider === "anthropic") {
          const model = body.model && isAnthropicModel(body.model) ? body.model : DEFAULT_ANTHROPIC_MODEL;
          const test = await anthropicTestKey(body.api_key, model);
          if (!test.ok) return errorResponse(`Clé Anthropic refusée : ${test.error}`, 400);

          const { data, error } = await supabaseAdmin.rpc("proph3t_set_anthropic_key", {
            p_user_id: user.id,
            p_api_key: body.api_key,
            p_master_key: masterKey,
            p_model: model,
          });
          if (error) return errorResponse(`set_anthropic_key: ${error.message}`, 500);
          return jsonResponse({
            ok: true,
            provider: "anthropic",
            model: data?.model ?? model,
            tested: true,
          });
        }

        // gemini
        const model = body.model && isGeminiModel(body.model) ? body.model : DEFAULT_GEMINI_MODEL;
        const test = await geminiTestKey(body.api_key, model);
        if (!test.ok) return errorResponse(`Clé Gemini refusée : ${test.error}`, 400);

        const { data, error } = await supabaseAdmin.rpc("proph3t_set_gemini_key", {
          p_user_id: user.id,
          p_api_key: body.api_key,
          p_master_key: masterKey,
          p_model: model,
        });
        if (error) return errorResponse(`set_gemini_key: ${error.message}`, 500);
        return jsonResponse({
          ok: true,
          provider: "gemini",
          model: data?.model ?? model,
          tested: true,
        });
      }

      // ─── test_key ──────────────────────────────────────────────────────
      case "test_key": {
        const provider = (body.provider ?? "anthropic") as Provider;
        if (provider !== "anthropic" && provider !== "gemini") {
          return errorResponse("Provider invalide pour test_key", 400);
        }

        let apiKey = body.api_key;
        let model = body.model;

        if (!apiKey) {
          const rpcName = provider === "anthropic" ? "proph3t_get_anthropic_key" : "proph3t_get_gemini_key";
          const { data, error } = await supabaseAdmin.rpc(rpcName, {
            p_user_id: user.id,
            p_master_key: masterKey,
          });
          if (error) return errorResponse(error.message, 500);
          if (!data) return errorResponse(`Aucune clé ${provider} stockée à tester`, 400);
          apiKey = data as string;
          if (!model) {
            const col = provider === "anthropic" ? "anthropic_model" : "gemini_model";
            const { data: prof } = await supabaseAdmin
              .from("profiles")
              .select(col)
              .eq("id", user.id)
              .single();
            model = (prof as Record<string, string>)?.[col]
              ?? (provider === "anthropic" ? DEFAULT_ANTHROPIC_MODEL : DEFAULT_GEMINI_MODEL);
          }
        }

        if (provider === "anthropic") {
          if (model && !isAnthropicModel(model)) return errorResponse("Modèle Anthropic invalide", 400);
          const r = await anthropicTestKey(apiKey, model ?? DEFAULT_ANTHROPIC_MODEL);
          return jsonResponse(r);
        }
        if (model && !isGeminiModel(model)) return errorResponse("Modèle Gemini invalide", 400);
        const r = await geminiTestKey(apiKey, model ?? DEFAULT_GEMINI_MODEL);
        return jsonResponse(r);
      }

      // ─── clear_key ─────────────────────────────────────────────────────
      case "clear_key": {
        const provider = (body.provider ?? "anthropic") as Provider;
        if (provider !== "anthropic" && provider !== "gemini") {
          return errorResponse("Provider invalide pour clear_key", 400);
        }
        const rpcName = provider === "anthropic" ? "proph3t_clear_anthropic_key" : "proph3t_clear_gemini_key";
        const { error } = await supabaseAdmin.rpc(rpcName, { p_user_id: user.id });
        if (error) return errorResponse(error.message, 500);
        return jsonResponse({ ok: true, cleared: provider });
      }

      // ─── set_settings ──────────────────────────────────────────────────
      case "set_settings": {
        if (body.provider && !["ollama", "anthropic", "gemini"].includes(body.provider)) {
          return errorResponse("Provider invalide", 400);
        }
        if (body.model && !isAllowedModel(body.model)) {
          return errorResponse("Modèle invalide", 400);
        }
        const { data, error } = await supabaseAdmin.rpc("proph3t_set_settings", {
          p_user_id: user.id,
          p_provider: body.provider ?? null,
          p_model: body.model ?? null,
        });
        if (error) return errorResponse(error.message, 400);
        return jsonResponse(data);
      }

      // ─── get_status ────────────────────────────────────────────────────
      case "get_status": {
        const { data, error } = await supabaseAdmin.rpc("proph3t_get_status", {
          p_user_id: user.id,
        });
        if (error) return errorResponse(error.message, 500);
        return jsonResponse(data ?? {
          provider: "ollama",
          anthropic: { has_key: false, model: DEFAULT_ANTHROPIC_MODEL },
          gemini: { has_key: false, model: DEFAULT_GEMINI_MODEL },
        });
      }

      default:
        return errorResponse(`Action inconnue : ${(body as { action?: string }).action}`, 400);
    }
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status) return errorResponse(e.message, e.status);
    console.error("[claude-proxy] error", err);
    return errorResponse(e.message ?? "Erreur serveur", 500);
  }
});
