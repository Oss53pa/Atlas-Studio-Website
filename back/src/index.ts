import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  })
);
app.use(express.json());

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Contact form interface
interface ContactFormData {
  name: string;
  email: string;
  investorType: string;
  message: string;
}

// Investor type labels
const investorTypeLabels: Record<string, string> = {
  business_angel: "Business Angel",
  vc: "VC / Fonds d'investissement",
  family_office: "Family Office",
  corporate: "Corporate / Strategique",
};

// Health check endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Contact form endpoint
app.post("/api/contact", async (req: Request, res: Response) => {
  try {
    const { name, email, investorType, message }: ContactFormData = req.body;

    // Validation
    if (!name || !email) {
      res.status(400).json({ error: "Nom et email sont requis" });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: "Format d'email invalide" });
      return;
    }

    // Get investor type label
    const investorLabel = investorTypeLabels[investorType] || investorType || "Non specifie";

    // Email content
    const emailContent = `
Nouvelle demande de contact - Atlas Studio

-------------------------------------------
Informations du contact:
-------------------------------------------
Nom: ${name}
Email: ${email}
Type d'investisseur: ${investorLabel}

-------------------------------------------
Message:
-------------------------------------------
${message || "Aucun message"}

-------------------------------------------
Date: ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}
-------------------------------------------
    `.trim();

    // HTML version of the email
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
        <div class="label">Type d'investisseur</div>
        <div class="value">${investorLabel}</div>
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
</html>
    `.trim();

    // Send email
    await transporter.sendMail({
      from: `"Atlas Studio Website" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_EMAIL || process.env.SMTP_USER,
      replyTo: email,
      subject: `[Atlas Studio] Nouveau contact: ${name} - ${investorLabel}`,
      text: emailContent,
      html: htmlContent,
    });

    console.log(`Contact form submitted: ${name} <${email}>`);
    res.json({ success: true, message: "Message envoye avec succes" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Erreur lors de l'envoi du message" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:3000"}`);
});
