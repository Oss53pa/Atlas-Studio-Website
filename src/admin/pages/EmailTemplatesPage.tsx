import { useState } from "react";
import { Mail, Eye, X, Code, FileText, Send, Copy, Check } from "lucide-react";

// ── Template HTML premium (mirroring SQL inserts) ────────────────────

const HEADER = `<tr><td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);padding:36px 40px;text-align:center;"><div style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:2px;">ATLAS <span style="color:#e94560;">STUDIO</span></div><div style="font-size:12px;color:#a0aec0;margin-top:4px;letter-spacing:1px;">atlasstudio.org</div></td></tr>`;

const FOOTER = (extra: string) => `<tr><td style="background:#f7fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;"><p style="margin:0;font-size:12px;color:#a0aec0;">&copy; Atlas Studio | <a href="https://atlasstudio.org" style="color:#a0aec0;text-decoration:none;">atlasstudio.org</a> | <a href="mailto:support@atlasstudio.org" style="color:#a0aec0;text-decoration:none;">support@atlasstudio.org</a></p><p style="margin:6px 0 0;font-size:11px;color:#cbd5e0;">${extra}</p></td></tr>`;

const wrap = (body: string) => `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);max-width:600px;width:100%;">${body}</table></td></tr></table></body></html>`;

const btn = (url: string, label: string) => `<div style="text-align:center;margin:32px 0;"><a href="${url}" style="background:linear-gradient(135deg,#e94560,#c0392b);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;display:inline-block;letter-spacing:0.5px;">${label}</a></div>`;

const infoBox = (content: string) => `<div style="background:#f7fafc;border-left:4px solid #e94560;border-radius:6px;padding:16px 20px;margin:0 0 28px;">${content}</div>`;

// ── Template renderers ───────────────────────────────────────────────

function renderWithPayload(html: string, payload: Record<string, string>): string {
  return html.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => payload[k] ?? m);
}

function welcomeTenantHtml(p: Record<string, string>) {
  return wrap(`${HEADER}<tr><td style="padding:40px 40px 32px;"><p style="font-size:22px;font-weight:700;color:#1a1a2e;margin:0 0 8px;">Bienvenue, ${p.admin_first_name} !</p><p style="font-size:15px;color:#4a5568;margin:0 0 24px;line-height:1.7;">Votre espace <strong>${p.company_name}</strong> sur <strong>${p.app_name}</strong> est pr&ecirc;t. Vous pouvez d&egrave;s maintenant acc&eacute;der &agrave; votre workspace.</p>${infoBox(`<p style="margin:0;font-size:13px;color:#718096;">Application souscrite : <strong style="color:#1a1a2e;">${p.app_name}</strong></p><p style="margin:8px 0 0;font-size:13px;color:#718096;">Vos identifiants de connexion vous seront envoy&eacute;s dans un email s&eacute;par&eacute;.</p>`)}${btn(p.workspace_url, 'Acc&eacute;der &agrave; mon workspace')}<p style="font-size:13px;color:#a0aec0;text-align:center;margin:0;">Des questions ? <a href="mailto:${p.support_email}" style="color:#e94560;text-decoration:none;">${p.support_email}</a></p></td></tr>${FOOTER(`Cet email a &eacute;t&eacute; envoy&eacute; par Atlas Studio pour le compte de ${p.company_name}.`)}`);
}

function welcomeUserHtml(p: Record<string, string>) {
  return wrap(`${HEADER}<tr><td style="padding:40px 40px 32px;"><p style="font-size:22px;font-weight:700;color:#1a1a2e;margin:0 0 8px;">Bonjour ${p.first_name} !</p><p style="font-size:15px;color:#4a5568;margin:0 0 24px;line-height:1.7;"><strong>${p.admin_first_name}</strong> vous invite &agrave; rejoindre l'espace <strong>${p.company_name}</strong> sur <strong>${p.app_name}</strong>.</p><div style="background:#f7fafc;border-radius:8px;padding:20px 24px;margin:0 0 28px;border:1px solid #e2e8f0;"><p style="margin:0 0 8px;font-size:13px;color:#718096;">R&ocirc;le attribu&eacute; : <strong style="color:#1a1a2e;">${p.role}</strong></p><p style="margin:0 0 8px;font-size:13px;color:#718096;">Email : <strong style="color:#1a1a2e;">${p.email}</strong></p><p style="margin:0;font-size:13px;color:#718096;">Mot de passe temporaire : <strong style="color:#e94560;font-family:monospace;font-size:14px;">${p.temp_password}</strong></p></div><div style="background:#fffbeb;border:1px solid #f6e05e;border-radius:6px;padding:12px 16px;margin:0 0 28px;"><p style="margin:0;font-size:13px;color:#744210;">Pour votre s&eacute;curit&eacute;, veuillez changer votre mot de passe d&egrave;s votre premi&egrave;re connexion.</p></div>${btn(p.login_url, 'Me connecter')}<p style="font-size:13px;color:#a0aec0;text-align:center;margin:0;">Des questions ? <a href="mailto:support@atlasstudio.org" style="color:#e94560;text-decoration:none;">support@atlasstudio.org</a></p></td></tr>${FOOTER(`Cet email a &eacute;t&eacute; envoy&eacute; par Atlas Studio pour le compte de ${p.company_name}.`)}`);
}

function resetPasswordHtml(p: Record<string, string>) {
  return wrap(`${HEADER}<tr><td style="padding:40px 40px 32px;"><p style="font-size:22px;font-weight:700;color:#1a1a2e;margin:0 0 8px;text-align:center;">R&eacute;initialisation du mot de passe</p><p style="font-size:15px;color:#4a5568;margin:0 0 24px;line-height:1.7;text-align:center;">Bonjour <strong>${p.first_name}</strong>, nous avons re&ccedil;u une demande de r&eacute;initialisation de votre mot de passe Atlas Studio.</p>${btn(p.reset_url, 'R&eacute;initialiser mon mot de passe')}<div style="background:#fff5f5;border:1px solid #feb2b2;border-radius:6px;padding:12px 16px;margin:0 0 20px;"><p style="margin:0;font-size:13px;color:#c53030;text-align:center;">Ce lien est valable <strong>${p.expires_in}</strong> uniquement.</p></div><div style="background:#f7fafc;border-radius:6px;padding:12px 16px;"><p style="margin:0;font-size:13px;color:#718096;text-align:center;">Si vous n'&ecirc;tes pas &agrave; l'origine de cette demande, ignorez simplement cet email.</p></div></td></tr>${FOOTER('Cet email a &eacute;t&eacute; envoy&eacute; automatiquement par Atlas Studio.')}`);
}

function confirmSubscriptionHtml(p: Record<string, string>) {
  return wrap(`${HEADER}<tr><td style="padding:40px 40px 32px;"><p style="font-size:22px;font-weight:700;color:#1a1a2e;margin:0 0 8px;">Souscription confirm&eacute;e</p><p style="font-size:15px;color:#4a5568;margin:0 0 28px;line-height:1.7;">Merci <strong>${p.company_name}</strong>, votre souscription a bien &eacute;t&eacute; enregistr&eacute;e.</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#f7fafc;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;margin-bottom:28px;"><tr><td colspan="2" style="background:#1a1a2e;padding:12px 20px;"><p style="margin:0;font-size:13px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">R&Eacute;CAPITULATIF DE SOUSCRIPTION</p></td></tr><tr><td style="padding:12px 20px;border-bottom:1px solid #e2e8f0;width:50%;"><p style="margin:0;font-size:12px;color:#718096;">Application</p><p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#1a1a2e;">${p.app_name}</p></td><td style="padding:12px 20px;border-bottom:1px solid #e2e8f0;"><p style="margin:0;font-size:12px;color:#718096;">Plan</p><p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#e94560;">${p.plan_name}</p></td></tr><tr><td style="padding:12px 20px;"><p style="margin:0;font-size:12px;color:#718096;">Montant</p><p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#1a1a2e;">${p.amount} ${p.currency} / ${p.billing_period}</p></td><td style="padding:12px 20px;"><p style="margin:0;font-size:12px;color:#718096;">Prochaine &eacute;ch&eacute;ance</p><p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#1a1a2e;">${p.next_billing_date}</p></td></tr></table>${btn(p.invoice_url, 'T&eacute;l&eacute;charger ma facture')}<p style="font-size:13px;color:#a0aec0;text-align:center;margin:0;">Questions ? <a href="mailto:billing@atlasstudio.org" style="color:#e94560;text-decoration:none;">billing@atlasstudio.org</a></p></td></tr>${FOOTER(`Cet email a &eacute;t&eacute; envoy&eacute; par Atlas Studio pour le compte de ${p.company_name}.`)}`);
}

function notificationGenericHtml(p: Record<string, string>) {
  return wrap(`${HEADER.replace('atlasstudio.org', `${p.app_name} &middot; atlasstudio.org`)}<tr><td style="padding:40px 40px 32px;"><p style="font-size:20px;font-weight:700;color:#1a1a2e;margin:0 0 6px;">${p.notification_title}</p><p style="font-size:13px;color:#a0aec0;margin:0 0 24px;">${p.company_name} &middot; ${p.app_name}</p><div style="background:#f7fafc;border-radius:8px;padding:20px 24px;margin:0 0 28px;border:1px solid #e2e8f0;font-size:15px;color:#4a5568;line-height:1.8;">${p.notification_body}</div>${btn(p.cta_url, p.cta_label)}<p style="font-size:13px;color:#a0aec0;text-align:center;margin:0;">Des questions ? <a href="mailto:support@atlasstudio.org" style="color:#e94560;text-decoration:none;">support@atlasstudio.org</a></p></td></tr>${FOOTER(`Cet email a &eacute;t&eacute; envoy&eacute; par Atlas Studio pour le compte de ${p.company_name}.`)}`);
}

function grantTestAccessHtml(p: Record<string, string>) {
  return wrap(`${HEADER}<tr><td style="padding:40px 40px 32px;"><p style="font-size:22px;font-weight:700;color:#1a1a2e;margin:0 0 8px;">Bonjour ${p.first_name} !</p><p style="font-size:15px;color:#4a5568;margin:0 0 24px;line-height:1.7;">Bonne nouvelle ! Un acc&egrave;s test temporaire vous a &eacute;t&eacute; accord&eacute; sur <strong>${p.app_name}</strong>.</p><div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:20px 24px;margin:0 0 28px;"><p style="margin:0 0 10px;font-size:14px;color:#166534;font-weight:700;">D&eacute;tails de votre acc&egrave;s test</p><table cellpadding="0" cellspacing="0" style="width:100%;"><tr><td style="padding:4px 0;font-size:13px;color:#718096;width:140px;">Application :</td><td style="padding:4px 0;font-size:13px;font-weight:700;color:#1a1a2e;">${p.app_name}</td></tr><tr><td style="padding:4px 0;font-size:13px;color:#718096;">Dur&eacute;e :</td><td style="padding:4px 0;font-size:13px;font-weight:700;color:#e94560;">${p.duration_days} jours</td></tr><tr><td style="padding:4px 0;font-size:13px;color:#718096;">Expire le :</td><td style="padding:4px 0;font-size:13px;font-weight:700;color:#1a1a2e;">${p.expires_at}</td></tr><tr><td style="padding:4px 0;font-size:13px;color:#718096;">Acc&egrave;s :</td><td style="padding:4px 0;font-size:13px;"><a href="${p.app_url}" style="color:#e94560;text-decoration:none;font-weight:600;">${p.app_url}</a></td></tr></table></div><p style="font-size:15px;color:#4a5568;margin:0 0 24px;line-height:1.7;">Profitez de cette p&eacute;riode pour explorer toutes les fonctionnalit&eacute;s. &Agrave; l'issue de cette p&eacute;riode, votre acc&egrave;s sera automatiquement d&eacute;sactiv&eacute;.</p>${btn(p.app_url, `Acc&eacute;der &agrave; ${p.app_name}`)}<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:12px 16px;margin:0 0 20px;"><p style="margin:0;font-size:13px;color:#1e40af;"><strong>Astuce :</strong> Installez l'app sur votre appareil pour un acc&egrave;s rapide ! Chrome/Edge : ic&ocirc;ne &laquo; Installer &raquo; &middot; Mobile : Partager &rarr; &laquo; Sur l'&eacute;cran d'accueil &raquo;</p></div><p style="font-size:13px;color:#a0aec0;text-align:center;margin:0;">Des questions ? <a href="mailto:support@atlasstudio.org" style="color:#e94560;text-decoration:none;">support@atlasstudio.org</a></p></td></tr>${FOOTER(`Cet email a &eacute;t&eacute; envoy&eacute; par Atlas Studio &mdash; Acc&egrave;s test temporaire.`)}`);
}

function accountSuspendedHtml(p: Record<string, string>) {
  return wrap(`<tr><td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#742a2a 100%);padding:36px 40px;text-align:center;"><div style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:2px;">ATLAS <span style="color:#e94560;">STUDIO</span></div><div style="font-size:12px;color:#a0aec0;margin-top:4px;letter-spacing:1px;">atlasstudio.org</div></td></tr><tr><td style="padding:40px 40px 32px;"><p style="font-size:22px;font-weight:700;color:#c53030;margin:0 0 8px;text-align:center;">Acc&egrave;s suspendu</p><p style="font-size:15px;color:#4a5568;margin:0 0 24px;line-height:1.7;text-align:center;">L'acc&egrave;s de <strong>${p.company_name}</strong> &agrave; <strong>${p.app_name}</strong> a &eacute;t&eacute; temporairement suspendu.</p><div style="background:#fff5f5;border:1px solid #feb2b2;border-radius:8px;padding:16px 20px;margin:0 0 28px;"><p style="margin:0;font-size:13px;color:#c53030;font-weight:600;">Motif :</p><p style="margin:8px 0 0;font-size:14px;color:#742a2a;">${p.reason}</p></div><p style="font-size:15px;color:#4a5568;margin:0 0 28px;line-height:1.7;text-align:center;">Pour r&eacute;activer votre acc&egrave;s, veuillez r&eacute;gulariser votre situation.</p>${btn(p.reactivation_url, 'R&eacute;gulariser mon compte')}<p style="font-size:13px;color:#a0aec0;text-align:center;margin:0;">Besoin d'aide ? <a href="mailto:${p.support_email}" style="color:#e94560;text-decoration:none;">${p.support_email}</a></p></td></tr>${FOOTER(`Cet email a &eacute;t&eacute; envoy&eacute; par Atlas Studio pour le compte de ${p.company_name}.`)}`);
}

// ── Template definitions ─────────────────────────────────────────────

interface TemplateDefinition {
  id: string;
  name: string;
  templateKey: string;
  sender: string;
  type: string;
  typeColor: string;
  description: string;
  variables: { name: string; description: string }[];
  samplePayload: Record<string, string>;
  render: (payload: Record<string, string>) => { subject: string; html: string };
}

const SAMPLE_BASE = {
  company_name: "Groupe Sanogo & Fils",
  admin_first_name: "Amadou",
  app_name: "Atlas F&A",
  support_email: "support@atlasstudio.org",
};

const templates: TemplateDefinition[] = [
  {
    id: "welcome_tenant",
    name: "Bienvenue nouveau client",
    templateKey: "welcome_tenant",
    sender: "notifications@atlasstudio.org",
    type: "Bienvenue",
    typeColor: "#16a34a",
    description: "Envoyé après la souscription d'un nouveau client. Contient le lien vers le workspace et le rappel des identifiants.",
    variables: [
      { name: "company_name", description: "Nom de l'entreprise" },
      { name: "admin_first_name", description: "Prénom admin" },
      { name: "app_name", description: "Application souscrite" },
      { name: "workspace_url", description: "URL du workspace" },
      { name: "support_email", description: "Email support" },
    ],
    samplePayload: { ...SAMPLE_BASE, workspace_url: "https://atlas-fna.atlasstudio.org" },
    render: (p) => ({ subject: renderWithPayload("Bienvenue sur Atlas Studio — Votre espace {{ company_name }} est prêt", p), html: welcomeTenantHtml(p) }),
  },
  {
    id: "welcome_user",
    name: "Invitation collaborateur",
    templateKey: "welcome_user",
    sender: "notifications@atlasstudio.org",
    type: "Invitation",
    typeColor: "#7c3aed",
    description: "Envoyé quand un admin invite un utilisateur. Contient le rôle, les identifiants temporaires et le lien de connexion.",
    variables: [
      { name: "first_name", description: "Prénom de l'invité" },
      { name: "company_name", description: "Entreprise" },
      { name: "role", description: "Rôle attribué" },
      { name: "app_name", description: "Application" },
      { name: "login_url", description: "URL de connexion" },
      { name: "temp_password", description: "Mot de passe temporaire" },
      { name: "admin_first_name", description: "Prénom de l'admin" },
      { name: "email", description: "Email de l'invité" },
    ],
    samplePayload: { ...SAMPLE_BASE, first_name: "Fatou", role: "Comptable", login_url: "https://atlas-fna.atlasstudio.org/login", temp_password: "Tmp-8xK2m!", email: "fatou.konate@sanogo.ci" },
    render: (p) => ({ subject: renderWithPayload("{{ admin_first_name }} vous invite à rejoindre {{ company_name }} sur Atlas Studio", p), html: welcomeUserHtml(p) }),
  },
  {
    id: "reset_password",
    name: "Réinitialisation mot de passe",
    templateKey: "reset_password",
    sender: "noreply@atlasstudio.org",
    type: "Sécurité",
    typeColor: "#dc2626",
    description: "Envoyé quand un utilisateur demande une réinitialisation. Lien sécurisé avec expiration.",
    variables: [
      { name: "first_name", description: "Prénom" },
      { name: "reset_url", description: "URL de réinitialisation" },
      { name: "expires_in", description: "Durée de validité" },
    ],
    samplePayload: { first_name: "Amadou", reset_url: "https://atlasstudio.org/reset?token=abc123", expires_in: "30 minutes" },
    render: (p) => ({ subject: "Réinitialisation de votre mot de passe Atlas Studio", html: resetPasswordHtml(p) }),
  },
  {
    id: "confirm_subscription",
    name: "Confirmation de souscription",
    templateKey: "confirm_subscription",
    sender: "billing@atlasstudio.org",
    type: "Facturation",
    typeColor: "#C8A960",
    description: "Envoyé après validation du paiement. Récapitulatif complet avec lien de téléchargement facture.",
    variables: [
      { name: "company_name", description: "Entreprise" },
      { name: "app_name", description: "Application" },
      { name: "plan_name", description: "Plan" },
      { name: "amount", description: "Montant" },
      { name: "currency", description: "Devise" },
      { name: "billing_period", description: "Période" },
      { name: "next_billing_date", description: "Prochaine échéance" },
      { name: "invoice_url", description: "URL facture" },
    ],
    samplePayload: { ...SAMPLE_BASE, plan_name: "PME / TPE", amount: "49 000", currency: "FCFA", billing_period: "mois", next_billing_date: "29 avril 2026", invoice_url: "https://atlasstudio.org/invoices/INV-2026-0042" },
    render: (p) => ({ subject: renderWithPayload("Confirmation de votre souscription — {{ app_name }} | {{ plan_name }}", p), html: confirmSubscriptionHtml(p) }),
  },
  {
    id: "notification_generic",
    name: "Notification générique",
    templateKey: "notification_generic",
    sender: "notifications@atlasstudio.org",
    type: "Notification",
    typeColor: "#2563eb",
    description: "Template passe-partout utilisé par toutes les apps pour les alertes métier (fiche de paie, rapport, échéance fiscale, etc.).",
    variables: [
      { name: "first_name", description: "Prénom" },
      { name: "company_name", description: "Entreprise" },
      { name: "app_name", description: "Application" },
      { name: "notification_title", description: "Titre" },
      { name: "notification_body", description: "Corps du message" },
      { name: "cta_label", description: "Libellé du bouton" },
      { name: "cta_url", description: "URL du bouton" },
    ],
    samplePayload: { ...SAMPLE_BASE, first_name: "Amadou", notification_title: "Échéance fiscale IS — J-15", notification_body: "La déclaration d'Impôt sur les Sociétés (IS) pour l'exercice 2025 doit être déposée avant le <strong>15 avril 2026</strong>. Votre liasse fiscale est prête dans Liass'Pilot.", cta_label: "Voir ma liasse", cta_url: "https://liasspilot.atlasstudio.org/liasse/2025" },
    render: (p) => ({ subject: renderWithPayload("{{ notification_title }} — {{ company_name }}", p), html: notificationGenericHtml(p) }),
  },
  {
    id: "grant_test_access",
    name: "Accès test temporaire",
    templateKey: "grant_test_access",
    sender: "notifications@atlasstudio.org",
    type: "Accès test",
    typeColor: "#059669",
    description: "Envoyé quand un admin accorde un accès test temporaire à un client. Contient l'application, la durée, la date d'expiration et le lien d'accès.",
    variables: [
      { name: "first_name", description: "Prénom du client" },
      { name: "company_name", description: "Entreprise" },
      { name: "app_name", description: "Application" },
      { name: "duration_days", description: "Durée en jours" },
      { name: "expires_at", description: "Date d'expiration" },
      { name: "app_url", description: "URL de l'application" },
    ],
    samplePayload: { ...SAMPLE_BASE, first_name: "Amadou", app_name: "Atlas F&A", duration_days: "7", expires_at: "6 avril 2026", app_url: "https://atlas-fna.atlasstudio.org" },
    render: (p) => ({ subject: renderWithPayload("Accès test accordé — {{ app_name }} ({{ duration_days }} jours)", p), html: grantTestAccessHtml(p) }),
  },
  {
    id: "account_suspended",
    name: "Compte suspendu",
    templateKey: "account_suspended",
    sender: "billing@atlasstudio.org",
    type: "Suspension",
    typeColor: "#991b1b",
    description: "Envoyé quand un compte est suspendu (non-paiement ou décision admin). Contient le motif et le lien de régularisation.",
    variables: [
      { name: "company_name", description: "Entreprise" },
      { name: "app_name", description: "Application" },
      { name: "reason", description: "Motif de suspension" },
      { name: "reactivation_url", description: "URL de régularisation" },
      { name: "support_email", description: "Email support" },
    ],
    samplePayload: { ...SAMPLE_BASE, reason: "Facture INV-2026-0038 impayée depuis 30 jours (49 000 FCFA).", reactivation_url: "https://atlasstudio.org/portal/billing", support_email: "support@atlasstudio.org" },
    render: (p) => ({ subject: renderWithPayload("Votre accès {{ app_name }} a été suspendu — {{ company_name }}", p), html: accountSuspendedHtml(p) }),
  },
];

// ── Component ────────────────────────────────────────────────────────

export default function EmailTemplatesPage() {
  const [previewTpl, setPreviewTpl] = useState<TemplateDefinition | null>(null);
  const [copied, setCopied] = useState(false);

  const preview = previewTpl ? previewTpl.render(previewTpl.samplePayload) : null;

  const handleCopyHtml = async () => {
    if (!preview) return;
    await navigator.clipboard.writeText(preview.html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-neutral-text dark:text-admin-text text-2xl font-bold mb-1">Templates Email</h1>
          <p className="text-neutral-muted dark:text-admin-muted text-sm">
            {templates.length} templates &middot; Envoi via Resend &middot; Domaine atlasstudio.org
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="bg-white dark:bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-5 flex flex-col hover:border-gold/40 dark:hover:border-admin-accent/40 transition-colors"
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${tpl.typeColor}15` }}
              >
                <Mail size={18} style={{ color: tpl.typeColor }} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-neutral-text dark:text-admin-text font-semibold text-[15px] leading-tight">{tpl.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold"
                    style={{ backgroundColor: `${tpl.typeColor}15`, color: tpl.typeColor }}
                  >
                    {tpl.type}
                  </span>
                  <span className="text-[11px] text-neutral-400 font-mono">{tpl.sender}</span>
                </div>
              </div>
            </div>

            <p className="text-neutral-muted dark:text-admin-muted text-[13px] leading-relaxed mb-4 flex-1">
              {tpl.description}
            </p>

            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Code size={12} className="text-neutral-muted dark:text-admin-muted" />
                <span className="text-[11px] font-semibold text-neutral-muted dark:text-admin-muted uppercase tracking-wide">Variables</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tpl.variables.map((v) => (
                  <span
                    key={v.name}
                    title={v.description}
                    className="inline-flex items-center px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 text-[11px] font-mono cursor-default"
                  >
                    {`{{ ${v.name} }}`}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => { setPreviewTpl(tpl); setCopied(false); }}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-warm-border dark:border-admin-surface-alt rounded-lg bg-white dark:bg-white dark:bg-admin-surface text-neutral-text dark:text-neutral-body dark:text-admin-text/80 text-[13px] font-medium hover:border-gold/40 dark:hover:border-admin-accent/40 hover:text-gold dark:text-admin-accent transition-colors"
            >
              <Eye size={14} />
              Aper&ccedil;u
            </button>
          </div>
        ))}
      </div>

      {/* ── Preview Modal ── */}
      {previewTpl && preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setPreviewTpl(null); }}
        >
          <div className="bg-white dark:bg-white dark:bg-admin-surface rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-warm-border dark:border-admin-surface-alt">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${previewTpl.typeColor}15` }}
                >
                  <FileText size={16} style={{ color: previewTpl.typeColor }} />
                </div>
                <div>
                  <h2 className="text-neutral-text dark:text-admin-text font-semibold text-[15px]">{previewTpl.name}</h2>
                  <p className="text-neutral-muted dark:text-admin-muted text-[12px] flex items-center gap-1">
                    <Send size={10} />
                    <span className="font-mono">{previewTpl.sender}</span>
                    &middot; Sujet : <span className="font-medium text-neutral-text dark:text-neutral-body dark:text-admin-text/80">{preview.subject}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyHtml}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border border-warm-border dark:border-admin-surface-alt text-neutral-muted dark:text-admin-muted hover:border-gold/40 dark:hover:border-admin-accent/40 hover:text-gold dark:text-admin-accent transition-colors"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "Copié" : "Copier HTML"}
                </button>
                <button
                  onClick={() => setPreviewTpl(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-muted dark:text-admin-muted hover:bg-neutral-100 hover:text-neutral-text dark:text-admin-text transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Variables bar */}
            <div className="px-6 py-3 bg-neutral-50 border-b border-warm-border dark:border-admin-surface-alt overflow-x-auto">
              <div className="flex items-center gap-2 flex-wrap text-[12px]">
                <span className="text-[11px] font-semibold text-neutral-muted dark:text-admin-muted uppercase tracking-wide mr-1">Test :</span>
                {previewTpl.variables.map((v) => (
                  <span key={v.name} className="inline-flex items-center mr-2 whitespace-nowrap">
                    <span className="font-mono text-gold dark:text-admin-accent/80">{v.name}</span>
                    <span className="mx-1 text-neutral-400">=</span>
                    <span className="font-medium text-neutral-600">&quot;{previewTpl.samplePayload[v.name]}&quot;</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Email preview */}
            <div className="flex-1 overflow-auto p-6 bg-neutral-100">
              <div className="mx-auto max-w-[640px] rounded-xl overflow-hidden shadow-lg border border-neutral-200">
                <iframe
                  srcDoc={preview.html}
                  title={`Aperçu - ${previewTpl.name}`}
                  className="w-full border-0 bg-white dark:bg-white dark:bg-admin-surface"
                  style={{ minHeight: "650px" }}
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
