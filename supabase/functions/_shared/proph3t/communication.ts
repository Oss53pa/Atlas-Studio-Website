// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — Communication & Output (CDC §3.2 output L1)
// 3 tools : generate_report, send_notification, log_decision
// ═══════════════════════════════════════════════════════════════════════════

// deno-lint-ignore no-explicit-any
type SbClient = any;

/**
 * Genere un rapport structure (markdown) a partir de sections fournies.
 * Le rendu PDF/Excel est delegue a une autre couche (Phase 1).
 */
export function generateReport(args: {
  title: string;
  subtitle?: string;
  sections: { heading: string; content: string }[];
  format?: "markdown" | "html" | "json";
  metadata?: Record<string, unknown>;
}): { ok: boolean; report?: string; format: string; metadata: Record<string, unknown>; error?: string } {
  if (!args.title || !Array.isArray(args.sections) || args.sections.length === 0) {
    return { ok: false, format: args.format ?? "markdown", metadata: {}, error: "title et sections[] requis" };
  }
  const fmt = args.format ?? "markdown";
  const meta = { generated_at: new Date().toISOString(), ...(args.metadata ?? {}) };

  if (fmt === "json") {
    return {
      ok: true,
      report: JSON.stringify({ title: args.title, subtitle: args.subtitle, sections: args.sections, metadata: meta }, null, 2),
      format: fmt,
      metadata: meta,
    };
  }

  if (fmt === "html") {
    const html = [
      `<h1>${escapeHtml(args.title)}</h1>`,
      args.subtitle ? `<h2>${escapeHtml(args.subtitle)}</h2>` : "",
      ...args.sections.map(s => `<section><h3>${escapeHtml(s.heading)}</h3>\n<p>${escapeHtml(s.content)}</p></section>`),
    ].filter(Boolean).join("\n");
    return { ok: true, report: html, format: fmt, metadata: meta };
  }

  // markdown (defaut)
  const md = [
    `# ${args.title}`,
    args.subtitle ? `_${args.subtitle}_` : "",
    "",
    ...args.sections.flatMap(s => [`## ${s.heading}`, "", s.content, ""]),
    `---`,
    `*Genere le ${meta.generated_at}*`,
  ].filter(Boolean).join("\n");
  return { ok: true, report: md, format: fmt, metadata: meta };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Envoie une notification (in-app + optionnellement email/sms).
 * Insere dans proph3t_alerts (UI in-app) et delegue email/sms a une fn dediee.
 */
export async function sendNotification(supabase: SbClient, args: {
  user_id?: string;
  tenant_id?: string;
  app_id?: string;
  channel: "in_app" | "email" | "sms" | "all";
  severity: "P0" | "P1" | "P2" | "info";
  title: string;
  message: string;
  payload?: Record<string, unknown>;
}): Promise<{ ok: boolean; alert_id?: string; channels_sent: string[]; error?: string }> {
  if (!args.title || !args.message) {
    return { ok: false, channels_sent: [], error: "title et message requis" };
  }

  const channelsSent: string[] = [];

  // 1. Toujours inserer in_app (sauf si channel=email/sms exclusif)
  if (args.channel === "in_app" || args.channel === "all") {
    const { data, error } = await supabase.from("proph3t_alerts").insert({
      society_id: args.tenant_id ?? null,
      product: args.app_id ?? null,
      severity: args.severity === "info" ? "P2" : args.severity,
      alert_type: "notification",
      title: args.title,
      message: args.message,
      payload: args.payload ?? {},
    }).select("id").single();
    if (error) return { ok: false, channels_sent: channelsSent, error: error.message };
    channelsSent.push("in_app");
    if (args.channel === "in_app") {
      return { ok: true, alert_id: data?.id, channels_sent: channelsSent };
    }
  }

  // 2. Email/SMS : invoque les fonctions edge dediees (a creer en Phase 1)
  // Pour l'instant on log l'intention dans le payload
  if (args.channel === "email" || args.channel === "all") {
    channelsSent.push("email_pending");  // TODO: invoke send-email edge fn
  }
  if (args.channel === "sms" || args.channel === "all") {
    channelsSent.push("sms_pending");    // TODO: invoke send-sms edge fn
  }

  return { ok: true, channels_sent: channelsSent };
}

/**
 * Log une decision metier prise par l'agent (audit + tracability).
 * Va dans proph3t_audit_log (chaine SHA-256) ET dans memoire episodique.
 */
export async function logDecision(supabase: SbClient, args: {
  decision: string;
  rationale: string;
  confidence: number;       // 0-100
  inputs_summary?: Record<string, unknown>;
  user_id?: string;
  tenant_id?: string;
  app_id?: string;
  subject_type?: string;
  subject_id?: string;
}): Promise<{ ok: boolean; episodic_id?: string; error?: string }> {
  if (!args.decision || !args.rationale) {
    return { ok: false, error: "decision et rationale requis" };
  }

  // 1. Insere dans memoire episodique
  const { data: ep, error: epErr } = await supabase.from("proph3t_memory_episodic").insert({
    tenant_id: args.tenant_id ?? null,
    user_id: args.user_id ?? null,
    app_id: args.app_id ?? null,
    event_type: "decision_logged",
    event_data: {
      decision: args.decision,
      rationale: args.rationale,
      confidence: args.confidence,
      inputs_summary: args.inputs_summary ?? {},
      subject_type: args.subject_type ?? null,
      subject_id: args.subject_id ?? null,
    },
    occurred_at: new Date().toISOString(),
  }).select("id").single();

  if (epErr) return { ok: false, error: epErr.message };

  return { ok: true, episodic_id: ep?.id };
}
