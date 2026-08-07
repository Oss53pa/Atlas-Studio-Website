/**
 * authEmail.ts — E-mails d'authentification harmonisés Atlas Studio.
 *
 * Rend la même coquille que les templates versionnés dans la Console Admin
 * (`emails/*.harmonise.html`) mais **à contexte par requête** : la palette est
 * résolue depuis `public.apps` au moment de l'envoi. Cela règle la limite
 * structurelle « la dernière app gagne » des templates Auth natifs (les
 * métadonnées `raw_user_meta_data` sont par utilisateur, pas par envoi).
 *
 * Source unique du branding : la table `public.apps` (éditée depuis la Console
 * Admin). Repli neutre « Atlas Studio » (sauge) si l'app est inconnue ou si les
 * colonnes de palette ne sont pas encore renseignées.
 */
import { supabaseAdmin } from "./supabase.ts";

const WORDMARK_CDN =
  "https://cdn.jsdelivr.net/gh/Oss53pa/Atlas-studio-Console-Admin@main/public/wordmarks";

export interface AuthBrand {
  app: string;
  tagline: string;
  accent: string;
  accentDeep: string;
  accentSoft: string;
  wordmark: string;
}

/** Repli neutre — famille Atlas Studio (sauge). */
export const NEUTRAL_BRAND: AuthBrand = {
  app: "Atlas Studio",
  tagline: "L'écosystème Atlas Studio",
  accent: "#6E8B58",
  accentDeep: "#52693F",
  accentSoft: "#EEF4E9",
  wordmark: `${WORDMARK_CDN}/wm-atlas-studio.png`,
};

/**
 * Résout la palette d'une app depuis `public.apps`.
 * Tolérant : `select("*")` pour ne pas casser si la migration branding
 * (accent_deep / accent_soft / wordmark_url) n'est pas encore appliquée.
 */
export async function resolveAuthBrand(appId?: string | null): Promise<AuthBrand> {
  if (!appId) return NEUTRAL_BRAND;
  try {
    const { data } = await supabaseAdmin
      .from("apps")
      .select("*")
      .eq("id", appId)
      .single();
    if (!data) return NEUTRAL_BRAND;
    const row = data as Record<string, unknown>;
    const str = (v: unknown, fallback: string) =>
      typeof v === "string" && v.trim() ? v : fallback;
    return {
      app: str(row.name, NEUTRAL_BRAND.app),
      tagline: str(row.tagline, NEUTRAL_BRAND.tagline),
      accent: str(row.color, NEUTRAL_BRAND.accent),
      accentDeep: str(row.accent_deep, NEUTRAL_BRAND.accentDeep),
      accentSoft: str(row.accent_soft, NEUTRAL_BRAND.accentSoft),
      wordmark: str(row.wordmark_url, NEUTRAL_BRAND.wordmark),
    };
  } catch (_e) {
    return NEUTRAL_BRAND;
  }
}

export function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface AuthEmailContent {
  /** Titre de section (texte simple, échappé). */
  heading: string;
  /** Corps — HTML **déjà sûr** (le caller échappe les entrées utilisateur). */
  bodyHtml: string;
  /** Libellé du bouton (texte simple, échappé). */
  ctaLabel: string;
  /** URL du bouton (action_link généré par Supabase). */
  ctaUrl: string;
  /** Encart de sécurité (texte simple, échappé). */
  securityNote: string;
}

/**
 * Rend l'e-mail harmonisé : papier crème, wordmark Grand Hotel (image), accent
 * de l'app, corps en Dosis, encart de sécurité en teinte claire, pied neutre.
 */
export function renderAuthEmail(brand: AuthBrand, c: AuthEmailContent): string {
  const F = "'Dosis','Segoe UI',Arial,sans-serif";
  return `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light only" />
  <title>${escapeHtml(brand.app)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Dosis:wght@300;400;500;600;700&display=swap');
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
    img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none;}
    body{margin:0!important;padding:0!important;width:100%!important;}
    a{text-decoration:none;}
    @media only screen and (max-width:560px){.card{width:100%!important;border-radius:0!important;}.pad{padding-left:24px!important;padding-right:24px!important;}}
  </style>
</head>
<body style="margin:0;padding:0;background-color:#FBF6EC;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FBF6EC;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" class="card" width="520" cellpadding="0" cellspacing="0" border="0" style="width:520px;max-width:520px;background-color:#FFFDF8;border:1px solid ${brand.accentSoft};border-radius:18px;overflow:hidden;">
        <tr><td style="height:4px;background-color:${brand.accent};line-height:4px;font-size:4px;">&nbsp;</td></tr>
        <tr><td class="pad" align="center" style="padding:40px 48px 8px 48px;">
          <img src="${brand.wordmark}" alt="${escapeHtml(brand.app)}" height="40" style="height:40px;width:auto;max-width:280px;display:block;" />
        </td></tr>
        <tr><td class="pad" align="center" style="padding:0 48px 4px 48px;">
          <div style="font-family:${F};font-size:13px;font-weight:500;letter-spacing:0.4px;color:#8A867A;text-transform:uppercase;">${escapeHtml(brand.tagline)}</div>
        </td></tr>
        <tr><td class="pad" style="padding:24px 48px 0 48px;"><div style="height:1px;background-color:${brand.accentSoft};line-height:1px;font-size:1px;">&nbsp;</div></td></tr>
        <tr><td class="pad" style="padding:28px 48px 0 48px;">
          <h1 style="margin:0;font-family:${F};font-size:24px;font-weight:700;color:#2A2A26;line-height:1.25;">${escapeHtml(c.heading)}</h1>
        </td></tr>
        <tr><td class="pad" style="padding:14px 48px 0 48px;">
          <p style="margin:0;font-family:${F};font-size:16px;font-weight:400;color:#4A473F;line-height:1.6;">${c.bodyHtml}</p>
        </td></tr>
        <tr><td class="pad" align="center" style="padding:28px 48px 8px 48px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td align="center" style="border-radius:12px;background-color:${brand.accent};">
              <a href="${c.ctaUrl}" target="_blank" style="display:inline-block;padding:14px 34px;font-family:${F};font-size:16px;font-weight:600;letter-spacing:0.3px;color:#FFFFFF;background-color:${brand.accent};border-radius:12px;">${escapeHtml(c.ctaLabel)}</a>
            </td>
          </tr></table>
        </td></tr>
        <tr><td class="pad" style="padding:8px 48px 0 48px;">
          <p style="margin:0;font-family:${F};font-size:13px;font-weight:400;color:#8A867A;line-height:1.6;">
            Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur :<br />
            <a href="${c.ctaUrl}" target="_blank" style="color:${brand.accentDeep};word-break:break-all;">${escapeHtml(c.ctaUrl)}</a>
          </p>
        </td></tr>
        <tr><td class="pad" style="padding:24px 48px 0 48px;">
          <div style="background-color:${brand.accentSoft};border-radius:12px;padding:14px 18px;">
            <p style="margin:0;font-family:${F};font-size:13px;font-weight:400;color:#5A574E;line-height:1.55;">${escapeHtml(c.securityNote)}</p>
          </div>
        </td></tr>
        <tr><td class="pad" align="center" style="padding:32px 48px 40px 48px;">
          <div style="height:1px;background-color:${brand.accentSoft};line-height:1px;font-size:1px;margin-bottom:20px;">&nbsp;</div>
          <p style="margin:0;font-family:${F};font-size:12px;font-weight:500;color:#A6A296;letter-spacing:0.3px;">Atlas Studio — une identité, tout l'écosystème.</p>
          <p style="margin:6px 0 0 0;font-family:${F};font-size:11px;font-weight:400;color:#B8B4A8;">Cet e-mail vous a été envoyé par Atlas Studio · atlas-studio.org</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
