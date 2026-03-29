// ============================================================
// ATLAS STUDIO — EmailService (Core)
// Récupère les templates depuis atlas_email_templates,
// remplace les {{ variables }}, envoie via Resend.
// Fallback sur notification_generic si template introuvable.
// ============================================================

import { supabase } from '../../lib/supabase';

// --- Types ---

interface EmailSender {
  from: string;
  fromName: string;
}

interface SendEmailParams {
  tenantId: string;
  appId: string;
  templateKey: string;
  to: string;
  payload: Record<string, string>;
}

interface TemplateRow {
  sender: string;
  subject: string;
  body_html: string;
}

// --- Résolution de l'expéditeur (domaine custom si vérifié) ---

async function resolveEmailSender(tenantId: string, defaultSender: string): Promise<EmailSender> {
  const { data: config } = await supabase
    .from('atlas_email_config')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('company_name')
    .eq('id', tenantId)
    .single();

  const companyName = tenant?.company_name ?? 'Votre entreprise';

  if (
    config?.custom_domain_enabled &&
    config?.spf_verified &&
    config?.dkim_verified &&
    config?.custom_from_email
  ) {
    return {
      from: config.custom_from_email,
      fromName: config.custom_from_name ?? companyName,
    };
  }

  return {
    from: defaultSender,
    fromName: `${companyName} via Atlas Studio`,
  };
}

// --- Rendu du template avec remplacement des {{ variables }} ---

export function renderTemplate(
  html: string,
  payload: Record<string, string>
): string {
  return html.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
    return payload[key] ?? match;
  });
}

// --- Récupération du template en base ---

async function getTemplate(
  appId: string,
  templateKey: string,
  lang = 'fr'
): Promise<TemplateRow | null> {
  // 1. Template spécifique à l'app
  const { data: appTemplate } = await supabase
    .from('atlas_email_templates')
    .select('sender, subject, body_html')
    .eq('app_id', appId)
    .eq('template_key', templateKey)
    .eq('lang', lang)
    .eq('is_active', true)
    .single();

  if (appTemplate) return appTemplate;

  // 2. Fallback : template core partagé
  if (appId !== 'core') {
    const { data: coreTemplate } = await supabase
      .from('atlas_email_templates')
      .select('sender, subject, body_html')
      .eq('app_id', 'core')
      .eq('template_key', templateKey)
      .eq('lang', lang)
      .eq('is_active', true)
      .single();

    if (coreTemplate) return coreTemplate;
  }

  // 3. Fallback ultime : notification_generic
  if (templateKey !== 'notification_generic') {
    const { data: genericTemplate } = await supabase
      .from('atlas_email_templates')
      .select('sender, subject, body_html')
      .eq('app_id', 'core')
      .eq('template_key', 'notification_generic')
      .eq('lang', lang)
      .eq('is_active', true)
      .single();

    return genericTemplate ?? null;
  }

  return null;
}

// --- Envoi via Resend ---

async function dispatchEmail(
  sender: EmailSender,
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const apiKey = import.meta.env.VITE_RESEND_API_KEY;

  if (!apiKey) {
    console.warn('[EmailService] VITE_RESEND_API_KEY non configuré, email non envoyé');
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: `${sender.fromName} <${sender.from}>`,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[EmailService] Resend error:', err);
    throw new Error(`Email non envoyé : ${res.status}`);
  }
}

// --- Service principal ---

export const EmailService = {
  /**
   * Envoie un email basé sur un template stocké en base.
   * Résout automatiquement : template (app → core → generic),
   * expéditeur (custom domain → default), variables.
   */
  async send({ tenantId, appId, templateKey, to, payload }: SendEmailParams): Promise<void> {
    try {
      const template = await getTemplate(appId, templateKey);

      if (!template) {
        console.error(`[EmailService] Template introuvable : ${appId}/${templateKey}`);
        return;
      }

      const [sender] = await Promise.all([
        resolveEmailSender(tenantId, template.sender),
      ]);

      const subject = renderTemplate(template.subject, payload);
      const html = renderTemplate(template.body_html, payload);

      await dispatchEmail(sender, to, subject, html);

      console.log(`[EmailService] Email envoyé à ${to} [${templateKey}]`);
    } catch (error) {
      console.error('[EmailService] Erreur:', error);
    }
  },

  /** Rend un template avec des données (utile pour preview admin) */
  render: renderTemplate,
};
