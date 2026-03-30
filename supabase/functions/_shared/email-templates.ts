// ── Subdomain mapping ────────────────────────────────────────────────
const APP_SUBDOMAINS: Record<string, string> = {
  "atlas-compta": "atlas-fna",
  "taxpilot": "liasspilot",
  "advist": "advist",
};

function getAppUrl(appId: string): string {
  const baseDomain = Deno.env.get("APP_DOMAIN") || "atlasstudio.com";
  const sub = APP_SUBDOMAINS[appId];
  return sub ? `https://${sub}.${baseDomain}` : `https://${baseDomain}/portal`;
}

// ── Base template ────────────────────────────────────────────────────
function baseTemplate(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0A0A0A; color: #fff; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 1px; }
    .header .gold { color: #C8A960; }
    .header .subtitle { margin: 8px 0 0; opacity: 0.7; font-size: 14px; }
    .body { background: #fff; padding: 30px; }
    .btn { display: inline-block; background: #C8A960; color: #0A0A0A; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px; }
    .btn-outline { display: inline-block; border: 2px solid #C8A960; color: #C8A960; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 13px; }
    .info-box { background: #FAFAF8; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #C8A960; }
    .info-box p { margin: 5px 0; font-size: 14px; }
    .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; border-radius: 0 0 12px 12px; background: #FAFAF8; }
    .highlight { color: #C8A960; font-weight: bold; }
    .install-tip { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px; color: #0369a1; }
    .install-tip strong { color: #0c4a6e; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Atlas <span class="gold">Studio</span></h1>
      <div class="subtitle">${title}</div>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p style="margin:0 0 4px;">Atlas Studio &mdash; Solutions digitales professionnelles</p>
      <p style="margin:0;">Abidjan, C&ocirc;te d'Ivoire</p>
    </div>
  </div>
</body>
</html>`.trim();
}

// ── Templates ────────────────────────────────────────────────────────

export function welcomeEmail(fullName: string) {
  const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://atlasstudio.com";
  return {
    subject: "Bienvenue sur Atlas Studio !",
    html: baseTemplate("Bienvenue !", `
      <h2 style="margin-top:0;">Bonjour ${fullName},</h2>
      <p>Votre compte Atlas Studio a &eacute;t&eacute; cr&eacute;&eacute; avec succ&egrave;s. Vous pouvez d&egrave;s maintenant acc&eacute;der &agrave; notre catalogue d'applications professionnelles.</p>
      <p>Explorez nos outils digitaux con&ccedil;us pour les entreprises africaines et d&eacute;marrez votre essai gratuit de <strong>14 jours</strong>.</p>
      <p style="text-align:center; margin: 30px 0;">
        <a href="${frontendUrl}/portal" class="btn">Acc&eacute;der &agrave; mon espace</a>
      </p>
      <p style="color:#999; font-size:13px;">Si vous avez des questions, n'h&eacute;sitez pas &agrave; nous contacter.</p>
    `),
  };
}

export function subscriptionConfirmationEmail(fullName: string, appName: string, appId: string, plan: string, price: number, currency: string) {
  const appUrl = getAppUrl(appId);
  return {
    subject: `Abonnement confirm\u00e9 \u2014 ${appName}`,
    html: baseTemplate("Abonnement confirm\u00e9", `
      <h2 style="margin-top:0;">Bonjour ${fullName},</h2>
      <p>Votre abonnement a &eacute;t&eacute; confirm&eacute; avec succ&egrave;s !</p>

      <div class="info-box">
        <p><strong>Application :</strong> <span class="highlight">${appName}</span></p>
        <p><strong>Plan :</strong> ${plan}</p>
        <p><strong>Montant :</strong> <span class="highlight">${price.toLocaleString("fr-FR")} ${currency}</span></p>
        <p><strong>Acc&egrave;s :</strong> <a href="${appUrl}" style="color:#C8A960;">${appUrl}</a></p>
      </div>

      <p>En tant qu'administrateur, vous pouvez inviter vos collaborateurs depuis les param&egrave;tres de l'application.</p>

      <p style="text-align:center; margin: 30px 0;">
        <a href="${appUrl}" class="btn">Ouvrir ${appName}</a>
      </p>

      <div class="install-tip">
        <strong>Astuce :</strong> Vous pouvez installer ${appName} sur votre bureau ou &eacute;cran d'accueil pour un acc&egrave;s rapide.<br>
        &bull; <strong>Chrome / Edge :</strong> cliquez sur l'ic&ocirc;ne &laquo; Installer &raquo; dans la barre d'adresse<br>
        &bull; <strong>Safari (iPhone) :</strong> appuyez sur Partager &rarr; &laquo; Sur l'&eacute;cran d'accueil &raquo;<br>
        &bull; <strong>Android :</strong> le navigateur vous proposera automatiquement l'installation
      </div>

      <p style="color:#999; font-size:13px;">Conservez bien cet email, il contient votre lien d'acc&egrave;s.</p>
    `),
  };
}

export function userInvitationEmail(fullName: string, inviterName: string, appName: string, appId: string, tempPassword: string) {
  const appUrl = getAppUrl(appId);
  return {
    subject: `${inviterName} vous invite sur ${appName}`,
    html: baseTemplate("Invitation", `
      <h2 style="margin-top:0;">Bonjour ${fullName},</h2>
      <p><strong>${inviterName}</strong> vous a ajout&eacute;(e) comme collaborateur sur <span class="highlight">${appName}</span>.</p>

      <div class="info-box">
        <p><strong>Application :</strong> <span class="highlight">${appName}</span></p>
        <p><strong>Votre acc&egrave;s :</strong> <a href="${appUrl}" style="color:#C8A960;">${appUrl}</a></p>
        <p><strong>Mot de passe temporaire :</strong> <code style="background:#f3f4f6; padding:2px 8px; border-radius:4px; font-size:15px;">${tempPassword}</code></p>
      </div>

      <p>Connectez-vous et changez votre mot de passe d&egrave;s votre premi&egrave;re connexion.</p>

      <p style="text-align:center; margin: 30px 0;">
        <a href="${appUrl}" class="btn">Se connecter</a>
      </p>

      <div class="install-tip">
        <strong>Astuce :</strong> Installez l'app sur votre appareil pour un acc&egrave;s rapide !<br>
        &bull; <strong>Chrome / Edge :</strong> ic&ocirc;ne &laquo; Installer &raquo; dans la barre d'adresse<br>
        &bull; <strong>Mobile :</strong> Partager &rarr; &laquo; Sur l'&eacute;cran d'accueil &raquo;
      </div>
    `),
  };
}

export function paymentReceiptEmail(fullName: string, amount: number, currency: string, invoiceNumber: string, appName: string) {
  return {
    subject: `Re\u00e7u de paiement \u2014 ${invoiceNumber}`,
    html: baseTemplate("Re\u00e7u de paiement", `
      <h2 style="margin-top:0;">Bonjour ${fullName},</h2>
      <p>Nous avons bien re&ccedil;u votre paiement.</p>
      <div class="info-box">
        <p><strong>Facture :</strong> ${invoiceNumber}</p>
        <p><strong>Application :</strong> ${appName}</p>
        <p><strong>Montant :</strong> <span class="highlight">${amount.toLocaleString("fr-FR")} ${currency}</span></p>
      </div>
      <p>Votre facture est disponible en t&eacute;l&eacute;chargement depuis votre espace client.</p>
    `),
  };
}

export function paymentFailedEmail(fullName: string, appName: string, appId: string) {
  const appUrl = getAppUrl(appId);
  return {
    subject: `\u00c9chec de paiement \u2014 ${appName}`,
    html: baseTemplate("\u00c9chec de paiement", `
      <h2 style="margin-top:0;">Bonjour ${fullName},</h2>
      <p>Nous n'avons pas pu traiter votre paiement pour <strong>${appName}</strong>.</p>
      <p>Votre abonnement a &eacute;t&eacute; suspendu temporairement. Veuillez mettre &agrave; jour votre moyen de paiement pour r&eacute;activer votre acc&egrave;s.</p>
      <p style="text-align:center; margin: 30px 0;">
        <a href="${appUrl}" class="btn">R&eacute;gulariser mon paiement</a>
      </p>
      <p style="color:#999; font-size:13px;">Si vous pensez qu'il s'agit d'une erreur, contactez notre support.</p>
    `),
  };
}

export function trialExpiringEmail(fullName: string, appName: string, appId: string, daysLeft: number) {
  const appUrl = getAppUrl(appId);
  return {
    subject: `Votre essai gratuit expire dans ${daysLeft} jours`,
    html: baseTemplate("Essai gratuit bient\u00f4t termin\u00e9", `
      <h2 style="margin-top:0;">Bonjour ${fullName},</h2>
      <p>Votre essai gratuit de <strong>${appName}</strong> expire dans <span class="highlight">${daysLeft} jours</span>.</p>
      <p>Pour continuer &agrave; utiliser l'application sans interruption, choisissez un plan de paiement.</p>
      <p style="text-align:center; margin: 30px 0;">
        <a href="${appUrl}" class="btn">Choisir un plan</a>
      </p>
    `),
  };
}

export function grantTestAccessEmail(fullName: string, appName: string, appId: string, durationDays: number, expiresAt: string, tempPassword?: string) {
  const appUrl = getAppUrl(appId);
  return {
    subject: `Acc\u00e8s test accord\u00e9 \u2014 ${appName} (${durationDays} jours)`,
    html: baseTemplate("Acc\u00e8s test temporaire", `
      <h2 style="margin-top:0;">Bonjour ${fullName},</h2>
      <p>Bonne nouvelle ! Un acc&egrave;s test temporaire vous a &eacute;t&eacute; accord&eacute; sur <strong>${appName}</strong>.</p>

      <div class="info-box">
        <p><strong>Application :</strong> <span class="highlight">${appName}</span></p>
        <p><strong>Dur&eacute;e :</strong> <span class="highlight">${durationDays} jours</span></p>
        <p><strong>Expire le :</strong> ${expiresAt}</p>
        <p><strong>Acc&egrave;s :</strong> <a href="${appUrl}" style="color:#C8A960;">${appUrl}</a></p>
        ${tempPassword ? `<p><strong>Mot de passe temporaire :</strong> <code style="background:#f3f4f6; padding:2px 8px; border-radius:4px; font-size:15px;">${tempPassword}</code></p>` : ""}
      </div>

      <p>Profitez de cette p&eacute;riode pour explorer toutes les fonctionnalit&eacute;s de l'application. &Agrave; l'issue de cette p&eacute;riode, votre acc&egrave;s sera automatiquement d&eacute;sactiv&eacute;.</p>

      <p style="text-align:center; margin: 30px 0;">
        <a href="${appUrl}" class="btn">Acc&eacute;der &agrave; ${appName}</a>
      </p>

      <div class="install-tip">
        <strong>Astuce :</strong> Installez l'app sur votre appareil pour un acc&egrave;s rapide !<br>
        &bull; <strong>Chrome / Edge :</strong> ic&ocirc;ne &laquo; Installer &raquo; dans la barre d'adresse<br>
        &bull; <strong>Mobile :</strong> Partager &rarr; &laquo; Sur l'&eacute;cran d'accueil &raquo;
      </div>

      <p style="color:#999; font-size:13px;">Si vous avez des questions, n'h&eacute;sitez pas &agrave; nous contacter.</p>
    `),
  };
}

export function invoiceEmail(fullName: string, invoiceNumber: string, amount: number, currency: string) {
  return {
    subject: `Nouvelle facture \u2014 ${invoiceNumber}`,
    html: baseTemplate("Nouvelle facture", `
      <h2 style="margin-top:0;">Bonjour ${fullName},</h2>
      <p>Une nouvelle facture a &eacute;t&eacute; g&eacute;n&eacute;r&eacute;e pour votre compte.</p>
      <div class="info-box">
        <p><strong>Facture :</strong> ${invoiceNumber}</p>
        <p><strong>Montant :</strong> <span class="highlight">${amount.toLocaleString("fr-FR")} ${currency}</span></p>
      </div>
      <p>Vous pouvez t&eacute;l&eacute;charger votre facture depuis votre espace client.</p>
    `),
  };
}
