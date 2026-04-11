import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

interface NotifPayload {
  title: string;
  message?: string;
  severity?: "info" | "success" | "warning" | "critical";
  source?: "activity" | "alert" | "notification" | "manual";
  link?: string;
  metadata?: Record<string, unknown>;
}

const SEVERITY_COLORS = {
  critical: "#EF4444",
  warning: "#F59E0B",
  success: "#22C55E",
  info: "#3B82F6",
};

const SEVERITY_LABELS = {
  critical: "🔴 Critique",
  warning: "🟠 Avertissement",
  success: "🟢 Succès",
  info: "🔵 Information",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload: NotifPayload = await req.json();
    const { title, message, severity = "info", source = "manual", link, metadata } = payload;

    if (!title) return errorResponse("Title required", 400);

    // Fetch all active admin emails
    const { data: admins, error: adminError } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("role", "admin")
      .eq("is_active", true);

    if (adminError) {
      console.error("Admin fetch error:", adminError);
      return errorResponse("Failed to fetch admins", 500);
    }

    if (!admins || admins.length === 0) {
      return jsonResponse({ success: true, sent: 0, warning: "No active admins found" });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return errorResponse("RESEND_API_KEY not configured", 500);
    }

    const color = SEVERITY_COLORS[severity] || SEVERITY_COLORS.info;
    const severityLabel = SEVERITY_LABELS[severity] || SEVERITY_LABELS.info;
    const baseUrl = Deno.env.get("FRONTEND_URL") || "https://atlas-studio.org";
    const fullLink = link ? (link.startsWith("http") ? link : `${baseUrl}${link}`) : `${baseUrl}/admin`;

    // Build metadata rows for HTML
    const metaRows = metadata
      ? Object.entries(metadata)
          .filter(([, v]) => v !== null && v !== undefined && v !== "")
          .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666;font-size:12px;">${k}</td><td style="padding:4px 0;color:#1a1a1a;font-size:12px;font-family:monospace;">${String(v)}</td></tr>`)
          .join("")
      : "";

    // Send to each admin
    let sentCount = 0;
    const errors: string[] = [];

    for (const admin of admins) {
      if (!admin.email) continue;

      const html = `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#F5F5F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:30px 20px;">
      <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        <!-- Header -->
        <tr><td style="background:#0A0A0A;padding:24px 32px;border-bottom:3px solid ${color};">
          <div style="color:#EF9F27;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Atlas Studio — Console Admin</div>
          <div style="color:#fff;font-size:11px;margin-top:4px;opacity:0.6;">Notification ${severityLabel}</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <div style="display:inline-block;padding:4px 10px;border-radius:6px;background:${color}15;color:${color};font-size:11px;font-weight:600;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px;">${source}</div>
          <h1 style="margin:0 0 12px;color:#1a1a1a;font-size:20px;font-weight:600;line-height:1.3;">${escapeHtml(title)}</h1>
          ${message ? `<p style="margin:0 0 20px;color:#444;font-size:14px;line-height:1.6;">${escapeHtml(message)}</p>` : ""}

          ${metaRows ? `<table style="width:100%;margin:16px 0;border-top:1px solid #eee;border-bottom:1px solid #eee;padding:12px 0;">${metaRows}</table>` : ""}

          <div style="margin-top:24px;">
            <a href="${fullLink}" style="display:inline-block;padding:12px 28px;background:#EF9F27;color:#0A0A0B;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;">
              Ouvrir la console →
            </a>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 32px;background:#FAFAFA;border-top:1px solid #eee;text-align:center;">
          <div style="color:#999;font-size:11px;">
            Bonjour ${escapeHtml(admin.full_name || "Admin")} — Cette notification a été envoyée automatiquement par Atlas Studio.<br>
            Pour gérer vos préférences de notification, allez dans <a href="${baseUrl}/admin/settings" style="color:#EF9F27;text-decoration:none;">Paramètres</a>.
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Atlas Studio Admin <notifications@atlasstudio.org>",
            to: [admin.email],
            subject: `[${severity.toUpperCase()}] ${title}`,
            html,
          }),
        });

        if (res.ok) {
          sentCount++;
        } else {
          const errText = await res.text();
          errors.push(`${admin.email}: ${errText}`);
        }
      } catch (err) {
        errors.push(`${admin.email}: ${(err as Error).message}`);
      }
    }

    return jsonResponse({
      success: true,
      sent: sentCount,
      total_admins: admins.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("notify-admin-email error:", error);
    return errorResponse((error as Error).message, 500);
  }
});

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
