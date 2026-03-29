/**
 * Edge Function: send-email
 * Centralized email endpoint for all Atlas Studio apps.
 *
 * POST /functions/v1/send-email
 * Body: {
 *   tenantId?: string,    // Tenant UUID (optional for core/system emails)
 *   appId: string,        // "core", "atlas-fna", "wisehr", etc.
 *   templateKey?: string, // Template key in atlas_email_templates
 *   to: string,           // Recipient email
 *   subject?: string,     // Override or fallback subject
 *   html?: string,        // Override or fallback HTML body
 *   payload?: Record<string, string> // Template variables (e.g. { firstName: "Jean" })
 * }
 *
 * Auth: Requires either service_role key or valid user JWT.
 *
 * Deploy: supabase functions deploy send-email
 */
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { sendTenantEmail } from "../_shared/mailer.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const body = await req.json();
    const { tenantId, appId, templateKey, to, subject, html, payload } = body;

    // Validate required fields
    if (!appId) {
      return errorResponse("appId is required", 400);
    }
    if (!to) {
      return errorResponse("to (recipient email) is required", 400);
    }
    if (!templateKey && (!subject || !html)) {
      return errorResponse("Either templateKey or both subject+html are required", 400);
    }

    await sendTenantEmail({
      tenantId,
      appId,
      templateKey,
      to,
      subject,
      html,
      payload,
    });

    return jsonResponse({ success: true, message: "Email sent" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.error("[send-email]", error);
    return errorResponse(message, 500);
  }
});
