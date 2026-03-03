import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { sendMail } from "../_shared/mailer.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name, email, company, message } = await req.json();

    if (!name || !email) {
      return errorResponse("Nom et email sont requis", 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse("Format d'email invalide", 400);
    }

    const contactEmail = Deno.env.get("CONTACT_EMAIL") || "contact@atlasstudio.com";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #000; color: #fff; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .field { margin-bottom: 15px; }
    .label { font-weight: bold; color: #666; font-size: 14px; }
    .value { font-size: 16px; color: #111; margin-top: 5px; }
    .message-box { background: #fff; padding: 15px; border-left: 4px solid #10B981; margin-top: 20px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Atlas Studio</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.8;">Nouvelle demande de contact</p>
    </div>
    <div class="content">
      <div class="field">
        <div class="label">Nom</div>
        <div class="value">${name}</div>
      </div>
      <div class="field">
        <div class="label">Email</div>
        <div class="value"><a href="mailto:${email}">${email}</a></div>
      </div>
      <div class="field">
        <div class="label">Entreprise</div>
        <div class="value">${company || "Non specifie"}</div>
      </div>
      <div class="message-box">
        <div class="label">Message</div>
        <div class="value">${message || "<em>Aucun message</em>"}</div>
      </div>
    </div>
    <div class="footer">
      <p>Ce message a ete envoye depuis le formulaire de contact du site Atlas Studio</p>
      <p>${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}</p>
    </div>
  </div>
</body>
</html>`.trim();

    await sendMail({
      to: contactEmail,
      subject: `[Atlas Studio] Nouveau contact: ${name} - ${company || "Particulier"}`,
      html: htmlContent,
    });

    return jsonResponse({ success: true, message: "Message envoye avec succes" });
  } catch (error) {
    console.error("Contact error:", error);
    return errorResponse("Erreur lors de l'envoi du message");
  }
});
