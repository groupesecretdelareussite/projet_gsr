import nodemailer from "nodemailer";

function getSmtpTransporter() {
  const host = process.env.SMTP_HOST || "mail.groupe-secretdelareussite.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn("[EMAIL] Variables SMTP_USER ou SMTP_PASS non définies.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
    tls: {
      rejectUnauthorized: false, // Compatibilité étendue serveurs mutualisés LWS
    },
  });
}

export interface SendResetPasswordEmailParams {
  email: string;
  prenom?: string;
  token: string;
  origin: string;
}

export async function envoyerEmailReinitialisationProf({
  email,
  prenom,
  token,
  origin,
}: SendResetPasswordEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = getSmtpTransporter();
    const fromAddress = process.env.SMTP_FROM || `"Groupe Scolaire GSR" <${process.env.SMTP_USER || "contact@groupe-secretdelareussite.com"}>`;
    const resetUrl = `${origin.replace(/\/$/, "")}/td/reinitialiser-mot-de-passe?token=${encodeURIComponent(token)}`;
    const destinataireNom = prenom ? `M. ${prenom}` : "Enseignant";

    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Réinitialisation de mot de passe — Portail TD</title>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
    <!-- Header avec Logo -->
    <tr>
      <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #f3f4f6; background-color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #12AA00; letter-spacing: 1px;">
          GROUPE SECRET DE LA RÉUSSITE
        </h1>
        <p style="margin: 6px 0 0; font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
          Portail Travaux Dirigés (TD)
        </p>
      </td>
    </tr>

    <!-- Corps du message -->
    <tr>
      <td style="padding: 32px;">
        <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 700; color: #111827;">
          Réinitialisation de votre mot de passe
        </h2>
        <p style="margin: 0 0 16px; font-size: 14px; line-height: 22px; color: #4b5563;">
          Bonjour <strong>${destinataireNom}</strong>,
        </p>
        <p style="margin: 0 0 20px; font-size: 14px; line-height: 22px; color: #4b5563;">
          Une demande de réinitialisation de mot de passe a été initiée pour votre compte professeur sur le portail TD de GSR.
        </p>
        <p style="margin: 0 0 24px; font-size: 14px; line-height: 22px; color: #4b5563;">
          Pour choisir un nouveau mot de passe, cliquez sur le bouton ci-dessous :
        </p>

        <!-- Bouton CTA -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
          <tr>
            <td align="center">
              <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; background-color: #12AA00; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 10px; box-shadow: 0 2px 4px rgba(18, 170, 0, 0.2);">
                Réinitialiser mon mot de passe
              </a>
            </td>
          </tr>
        </table>

        <!-- Alerte sécurité & expiration -->
        <div style="background-color: #f9fafb; border-left: 4px solid #12AA00; border-radius: 4px; padding: 12px 16px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 12px; line-height: 18px; color: #6b7280;">
            ⏳ <strong>Attention :</strong> Ce lien est à usage unique et expirera dans <strong>15 minutes</strong>.
          </p>
        </div>

        <p style="margin: 0 0 8px; font-size: 13px; line-height: 20px; color: #6b7280;">
          Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité. Votre mot de passe actuel restera inchangé.
        </p>

        <p style="margin: 20px 0 0; font-size: 12px; line-height: 18px; color: #9ca3af; word-break: break-all;">
          Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br>
          <a href="${resetUrl}" style="color: #12AA00; text-decoration: underline;">${resetUrl}</a>
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 20px 32px; background-color: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
          Groupe Secret de la Réussite · République du Bénin<br>
          Ce message a été généré automatiquement, merci de ne pas y répondre.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    const textContent = `
GROUPE SECRET DE LA RÉUSSITE — Portail TD
Réinitialisation de votre mot de passe

Bonjour ${destinataireNom},

Une demande de réinitialisation de mot de passe a été initiée pour votre compte professeur sur le portail TD de GSR.

Pour choisir un nouveau mot de passe (lien valide pendant 15 minutes) :
${resetUrl}

Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer ce message.

--
Groupe Secret de la Réussite · République du Bénin
`;

    await transporter.sendMail({
      from: fromAddress,
      to: email,
      subject: "GSR TD — Réinitialisation de votre mot de passe",
      text: textContent,
      html: htmlContent,
    });

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue lors de l'envoi de l'email";
    console.error("[EMAIL ERROR] Échec de l'envoi du mail de réinitialisation :", message);
    return { success: false, error: message };
  }
}
