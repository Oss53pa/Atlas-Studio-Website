/**
 * Centralized email service for Atlas Studio Core.
 * All apps in the catalog must use this service — no app manages its own mailer.
 *
 * Provider: Resend (https://resend.com)
 * Domain: atlasstudio.org
 *
 * Env vars:
 *   RESEND_API_KEY   — Resend API token
 *   EMAIL_FROM       — Fallback sender (e.g. "Atlas Studio <notifications@atlasstudio.org>")
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Types ──────────────────────────────────────────────────────────

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface EmailSender {
  from: string;
  fromName: string;
}

export interface TenantEmailOptions {
  tenantId?: string;
  appId: string;
  templateKey?: string;
  to: string;
  subject?: string;
  html?: string;
  payload?: Record<string, string>;
}

// ── Low-level send (Resend API) ────────────────────────────────────

export async function sendMail(options: SendMailOptions): Promise<string | null> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const defaultFrom = Deno.env.get("EMAIL_FROM") || "Atlas Studio <notifications@atlasstudio.org>";
  const from = options.from || defaultFrom;

  if (!apiKey) {
    console.warn("[MAILER] RESEND_API_KEY not set, skipping email");
    return null;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [options.to],
      subject: options.subject,
      html: options.html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[MAILER] Resend error:", err);
    throw new Error(`Email sending failed: ${res.status}`);
  }

  const data = await res.json();
  return data.id || null;
}

// ── Sender resolution (multi-tenant) ──────────────────────────────

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function resolveEmailSender(tenantId?: string): Promise<EmailSender> {
  if (!tenantId) {
    return {
      from: "notifications@atlasstudio.org",
      fromName: "Atlas Studio",
    };
  }

  const supabase = getSupabaseAdmin();

  // Check tenant custom email config
  const { data: config } = await supabase
    .from("atlas_email_config")
    .select("custom_domain_enabled, custom_from_email, custom_from_name, spf_verified, dkim_verified")
    .eq("tenant_id", tenantId)
    .single();

  // Get tenant name
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name")
    .eq("id", tenantId)
    .single();

  const companyName = tenant?.name || "Atlas Studio";

  // Custom domain if verified
  if (config?.custom_domain_enabled && config?.spf_verified && config?.dkim_verified && config?.custom_from_email) {
    return {
      from: config.custom_from_email,
      fromName: config.custom_from_name || companyName,
    };
  }

  // Default: company name via Atlas Studio
  return {
    from: "notifications@atlasstudio.org",
    fromName: `${companyName} via Atlas Studio`,
  };
}

// ── Template resolution ───────────────────────────────────────────

function interpolate(template: string, payload: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => payload[key] || "");
}

async function resolveTemplate(
  appId: string,
  templateKey: string,
  lang = "fr"
): Promise<{ subject: string; body_html: string } | null> {
  const supabase = getSupabaseAdmin();

  const { data } = await supabase
    .from("atlas_email_templates")
    .select("subject, body_html")
    .eq("app_id", appId)
    .eq("template_key", templateKey)
    .eq("lang", lang)
    .single();

  return data || null;
}

// ── Log email ─────────────────────────────────────────────────────

async function logEmail(options: {
  tenantId?: string;
  appId: string;
  templateKey?: string;
  recipient: string;
  subject: string;
  status: string;
  resendId?: string | null;
  errorMessage?: string;
}) {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("atlas_email_log").insert({
      tenant_id: options.tenantId || null,
      app_id: options.appId,
      template_key: options.templateKey || null,
      recipient: options.recipient,
      subject: options.subject,
      status: options.status,
      resend_id: options.resendId || null,
      error_message: options.errorMessage || null,
    });
  } catch (err) {
    console.error("[MAILER] Failed to log email:", err);
  }
}

// ── Main: sendTenantEmail ─────────────────────────────────────────

export async function sendTenantEmail(options: TenantEmailOptions): Promise<void> {
  const { tenantId, appId, templateKey, to, payload } = options;

  // 1. Resolve sender
  const sender = await resolveEmailSender(tenantId);
  const fromHeader = `${sender.fromName} <${sender.from}>`;

  // 2. Resolve content
  let subject = options.subject || "";
  let html = options.html || "";

  if (templateKey) {
    const template = await resolveTemplate(appId, templateKey);
    if (template) {
      subject = payload ? interpolate(template.subject, payload) : template.subject;
      html = payload ? interpolate(template.body_html, payload) : template.body_html;
    } else {
      console.warn(`[MAILER] Template not found: ${appId}/${templateKey}, using provided subject/html`);
    }
  }

  if (!subject || !html) {
    throw new Error("Email subject and html are required (no template found and none provided)");
  }

  // 3. Send
  let resendId: string | null = null;
  try {
    resendId = await sendMail({ to, subject, html, from: fromHeader });

    // 4. Log success
    await logEmail({
      tenantId,
      appId,
      templateKey,
      recipient: to,
      subject,
      status: "sent",
      resendId,
    });
  } catch (err) {
    // Log failure
    await logEmail({
      tenantId,
      appId,
      templateKey,
      recipient: to,
      subject,
      status: "failed",
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
