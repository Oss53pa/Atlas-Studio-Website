import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Edge Function : error-alert
 *
 * Déclenchée par un Database Webhook Supabase sur INSERT dans public.error_logs.
 * Si l'erreur est critical ET nouvelle (occurrence_count = 1), envoie une alerte
 * formatée vers un webhook Slack (env var SLACK_WEBHOOK_URL).
 *
 * Format du payload webhook Supabase :
 * {
 *   type: 'INSERT',
 *   table: 'error_logs',
 *   schema: 'public',
 *   record: { ... ligne complète ... },
 *   old_record: null
 * }
 *
 * Cette fonction ne bloque JAMAIS l'ingestion — en cas d'erreur, elle log et
 * retourne 200 pour que Supabase ne retente pas indéfiniment.
 */

interface ErrorLogRecord {
  id: string;
  app_id: string;
  severity: string;
  message: string;
  component_name: string | null;
  environment: string;
  occurrence_count: number;
  url: string | null;
  created_at: string;
}

interface WebhookPayload {
  type: string;
  table: string;
  schema: string;
  record: ErrorLogRecord;
  old_record: ErrorLogRecord | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  // Garde : on ne traite que les INSERT sur error_logs
  if (payload?.table !== "error_logs" || payload?.type !== "INSERT") {
    return jsonResponse({ skipped: "not an error_logs INSERT" });
  }

  const record = payload.record;
  if (!record) {
    return jsonResponse({ skipped: "no record" });
  }

  // On n'alerte que sur les erreurs critiques nouvelles (première occurrence)
  if (record.severity !== "critical" || record.occurrence_count !== 1) {
    return jsonResponse({ skipped: "not a new critical" });
  }

  const slackUrl = Deno.env.get("SLACK_WEBHOOK_URL");
  if (!slackUrl) {
    console.log("[error-alert] SLACK_WEBHOOK_URL not set, skipping alert");
    return jsonResponse({ skipped: "slack webhook not configured" });
  }

  // Récupère le nom de l'app (via service role pour bypasser la RLS)
  let appName = record.app_id;
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && serviceRoleKey) {
      const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
      });
      const { data } = await admin
        .from("apps")
        .select("name")
        .eq("id", record.app_id)
        .maybeSingle();
      if (data?.name) appName = data.name;
    }
  } catch (err) {
    console.warn("[error-alert] Failed to fetch app name:", err);
  }

  const slackPayload = {
    text: `:red_circle: [${appName}] — Nouvelle erreur critique`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `🔴 [${appName}] — Nouvelle erreur critique`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Message :*\n\`\`\`${truncate(record.message, 500)}\`\`\``,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Composant :*\n${record.component_name || "—"}` },
          { type: "mrkdwn", text: `*Environnement :*\n${record.environment}` },
        ],
      },
      ...(record.url
        ? [{
            type: "section",
            text: { type: "mrkdwn", text: `*URL :* ${record.url}` },
          }]
        : []),
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Error ID: \`${record.id}\` · ${new Date(record.created_at).toISOString()}`,
          },
        ],
      },
    ],
  };

  try {
    const res = await fetch(slackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slackPayload),
    });
    if (!res.ok) {
      const body = await res.text();
      console.warn("[error-alert] Slack returned non-ok:", res.status, body);
      return jsonResponse({ slack_status: res.status, body });
    }
  } catch (err) {
    console.error("[error-alert] Failed to post to Slack:", err);
    // On ne renvoie pas d'erreur HTTP pour ne pas bloquer Supabase
    return jsonResponse({ error: String(err) });
  }

  return jsonResponse({ ok: true, error_id: record.id });
});

function truncate(s: string, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + "…" : s;
}
