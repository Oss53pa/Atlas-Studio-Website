function baseTemplate(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #111; color: #fff; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
    .header h1 { margin: 0; font-size: 22px; }
    .header .subtitle { margin: 8px 0 0; opacity: 0.7; font-size: 14px; }
    .body { background: #fff; padding: 30px; }
    .btn { display: inline-block; background: #C8A04A; color: #fff; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; }
    .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; border-radius: 0 0 12px 12px; background: #fafafa; }
    .highlight { color: #C8A04A; font-weight: bold; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Atlas Studio</h1>
      <div class="subtitle">${title}</div>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>Atlas Studio - Solutions digitales professionnelles</p>
      <p>Abidjan, Cote d'Ivoire</p>
    </div>
  </div>
</body>
</html>`.trim();
}

export function welcomeEmail(fullName: string) {
  const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://atlas-studio.com";
  return {
    subject: "Bienvenue sur Atlas Studio !",
    html: baseTemplate("Bienvenue !", `
      <h2 style="margin-top:0;">Bonjour ${fullName},</h2>
      <p>Votre compte Atlas Studio a ete cree avec succes. Vous pouvez maintenant acceder a notre catalogue d'applications professionnelles.</p>
      <p>Explorez nos outils digitaux concus pour les entreprises africaines et demarrez votre essai gratuit de 14 jours.</p>
      <p style="text-align:center; margin: 30px 0;">
        <a href="${frontendUrl}/portal" class="btn">Acceder a mon espace</a>
      </p>
      <p style="color:#999; font-size:13px;">Si vous avez des questions, n'hesitez pas a nous contacter.</p>
    `),
  };
}

export function subscriptionConfirmationEmail(fullName: string, appName: string, plan: string) {
  const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://atlas-studio.com";
  return {
    subject: `Abonnement confirme - ${appName}`,
    html: baseTemplate("Abonnement confirme", `
      <h2 style="margin-top:0;">Bonjour ${fullName},</h2>
      <p>Votre abonnement a ete confirme avec succes !</p>
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Application :</strong> <span class="highlight">${appName}</span></p>
        <p style="margin: 5px 0;"><strong>Plan :</strong> ${plan}</p>
      </div>
      <p>Vous pouvez des maintenant acceder a votre application depuis votre espace client.</p>
      <p style="text-align:center; margin: 30px 0;">
        <a href="${frontendUrl}/portal" class="btn">Ouvrir mon espace</a>
      </p>
    `),
  };
}

export function paymentReceiptEmail(fullName: string, amount: number, currency: string, invoiceNumber: string, appName: string) {
  return {
    subject: `Recu de paiement - ${invoiceNumber}`,
    html: baseTemplate("Recu de paiement", `
      <h2 style="margin-top:0;">Bonjour ${fullName},</h2>
      <p>Nous avons bien recu votre paiement.</p>
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Facture :</strong> ${invoiceNumber}</p>
        <p style="margin: 5px 0;"><strong>Application :</strong> ${appName}</p>
        <p style="margin: 5px 0;"><strong>Montant :</strong> <span class="highlight">${amount} ${currency}</span></p>
      </div>
      <p>Votre facture est disponible en telechargement depuis votre espace client.</p>
    `),
  };
}

export function paymentFailedEmail(fullName: string, appName: string) {
  const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://atlas-studio.com";
  return {
    subject: `Echec de paiement - ${appName}`,
    html: baseTemplate("Echec de paiement", `
      <h2 style="margin-top:0;">Bonjour ${fullName},</h2>
      <p>Nous n'avons pas pu traiter votre paiement pour <strong>${appName}</strong>.</p>
      <p>Votre abonnement a ete suspendu temporairement. Veuillez mettre a jour votre moyen de paiement pour reactiver votre acces.</p>
      <p style="text-align:center; margin: 30px 0;">
        <a href="${frontendUrl}/portal" class="btn">Regulariser mon paiement</a>
      </p>
      <p style="color:#999; font-size:13px;">Si vous pensez qu'il s'agit d'une erreur, contactez notre support.</p>
    `),
  };
}

export function trialExpiringEmail(fullName: string, appName: string, daysLeft: number) {
  const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://atlas-studio.com";
  return {
    subject: `Votre essai gratuit expire dans ${daysLeft} jours`,
    html: baseTemplate("Essai gratuit bientot termine", `
      <h2 style="margin-top:0;">Bonjour ${fullName},</h2>
      <p>Votre essai gratuit de <strong>${appName}</strong> expire dans <span class="highlight">${daysLeft} jours</span>.</p>
      <p>Pour continuer a utiliser l'application sans interruption, choisissez un plan de paiement.</p>
      <p style="text-align:center; margin: 30px 0;">
        <a href="${frontendUrl}/portal" class="btn">Choisir un plan</a>
      </p>
    `),
  };
}

export function invoiceEmail(fullName: string, invoiceNumber: string, amount: number, currency: string) {
  return {
    subject: `Nouvelle facture - ${invoiceNumber}`,
    html: baseTemplate("Nouvelle facture", `
      <h2 style="margin-top:0;">Bonjour ${fullName},</h2>
      <p>Une nouvelle facture a ete generee pour votre compte.</p>
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Facture :</strong> ${invoiceNumber}</p>
        <p style="margin: 5px 0;"><strong>Montant :</strong> <span class="highlight">${amount} ${currency}</span></p>
      </div>
      <p>Vous pouvez telecharger votre facture depuis votre espace client.</p>
    `),
  };
}
