import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    await requireAdmin(req);

    if (req.method === "POST") {
      const { email, password, full_name, company_name, phone, send_welcome } = await req.json();

      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, company_name },
      });

      if (authError) return errorResponse(authError.message, 400);

      await supabaseAdmin.from("profiles").upsert({
        id: authUser.user.id,
        email,
        full_name,
        company_name: company_name || "",
        phone: phone || "",
        role: "client",
        is_active: true,
      });

      // Send welcome email with credentials
      if (send_welcome !== false) {
        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (resendKey) {
          try {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                from: "Atlas Studio <notifications@atlasstudio.org>",
                to: [email],
                subject: "Bienvenue sur Atlas Studio — Vos identifiants",
                html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
                  <div style="background:#0A0A0A;color:#fff;padding:30px;text-align:center;border-radius:12px 12px 0 0;">
                    <h1 style="margin:0;font-size:24px;">Atlas <span style="color:#C8A960;">Studio</span></h1>
                    <p style="margin:8px 0 0;opacity:0.7;font-size:14px;">Bienvenue !</p>
                  </div>
                  <div style="background:#fff;padding:30px;">
                    <h2 style="color:#1a1a1a;margin-top:0;">Bonjour ${full_name},</h2>
                    <p style="color:#444;line-height:1.6;">Votre compte Atlas Studio a été créé par notre équipe. Voici vos identifiants de connexion :</p>
                    <div style="background:#FAFAF8;padding:20px;border-radius:10px;margin:20px 0;border-left:4px solid #C8A960;">
                      <p style="margin:0 0 8px;"><strong>Email :</strong> ${email}</p>
                      <p style="margin:0;"><strong>Mot de passe :</strong> <code style="background:#fff;padding:2px 6px;border-radius:4px;">${password}</code></p>
                    </div>
                    <p style="color:#666;font-size:13px;">Pour des raisons de sécurité, nous vous recommandons de changer votre mot de passe dès votre première connexion.</p>
                    <p style="text-align:center;margin:30px 0;">
                      <a href="https://atlas-studio.org/portal/login" style="display:inline-block;background:#C8A960;color:#0A0A0B;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;">Se connecter</a>
                    </p>
                  </div>
                  <div style="text-align:center;padding:20px;color:#999;font-size:12px;">
                    Atlas Studio — Solutions digitales professionnelles<br>
                    Si vous n'attendiez pas cet email, contactez-nous à support@atlasstudio.org
                  </div>
                </div>`,
              }),
            });
          } catch (emailErr) {
            console.error("Welcome email error (non-blocking):", emailErr);
          }
        }
      }

      return jsonResponse({ success: true, userId: authUser.user.id });
    }

    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      if (!id) return errorResponse("Client ID requis", 400);

      await supabaseAdmin.auth.admin.deleteUser(id);
      return jsonResponse({ success: true });
    }

    return errorResponse("Methode non supportee", 405);
  } catch (error: any) {
    console.error("Admin clients error:", error);
    if (error.status) return errorResponse(error.message, error.status);
    return errorResponse(error.message);
  }
});
