const wrap = (title: string, bodyHtml: string) => `
<!doctype html>
<html lang="fr">
  <body style="font-family: Arial, sans-serif; background:#F4EBDD; color:#171713; padding:32px;">
    <div style="max-width:480px;margin:0 auto;background:#fff;border:2px solid #171713;padding:24px;">
      <h1 style="font-size:20px;margin:0 0 16px;">${title}</h1>
      ${bodyHtml}
      <p style="margin-top:32px;font-size:12px;color:#666;">Argent Brut</p>
    </div>
  </body>
</html>
`

const button = (url: string, label: string) => `
  <p style="margin:24px 0;">
    <a href="${url}" style="display:inline-block;background:#3D5B45;color:#fff;padding:12px 20px;text-decoration:none;font-weight:bold;">${label}</a>
  </p>
  <p style="font-size:12px;color:#666;word-break:break-all;">${url}</p>
`

export function verificationEmail(url: string) {
  return {
    subject: 'Confirme ton adresse email',
    html: wrap(
      'Confirme ton adresse email',
      `<p>Clique sur le bouton ci-dessous pour confirmer ton adresse email et activer ton compte.</p>${button(url, 'Confirmer mon email')}<p>Ce lien expire prochainement. Si tu n'es pas à l'origine de cette inscription, ignore cet email.</p>`,
    ),
  }
}

export function resetPasswordEmail(url: string) {
  return {
    subject: 'Réinitialise ton mot de passe',
    html: wrap(
      'Réinitialise ton mot de passe',
      `<p>Une demande de réinitialisation de mot de passe a été faite pour ton compte.</p>${button(url, 'Choisir un nouveau mot de passe')}<p>Ce lien est à usage unique et expire dans 1 heure. Si tu n'es pas à l'origine de cette demande, ignore cet email — ton mot de passe actuel reste inchangé.</p>`,
    ),
  }
}

export function passwordChangedEmail() {
  return {
    subject: 'Ton mot de passe a été modifié',
    html: wrap(
      'Mot de passe modifié',
      `<p>Le mot de passe de ton compte vient d'être changé. Si tu n'es pas à l'origine de cette action, contacte-nous immédiatement et réinitialise ton mot de passe.</p>`,
    ),
  }
}

export function changeEmailVerificationEmail(url: string, newEmail: string) {
  return {
    subject: 'Confirme ta nouvelle adresse email',
    html: wrap(
      'Confirme ta nouvelle adresse email',
      `<p>Une demande de changement d'adresse email vers <strong>${newEmail}</strong> a été faite pour ton compte.</p>${button(url, 'Confirmer le changement')}<p>Si tu n'es pas à l'origine de cette demande, ignore cet email.</p>`,
    ),
  }
}

export function quoteSentEmail(quoteNumber: string, publicUrl: string) {
  return {
    subject: `Devis ${quoteNumber}`,
    html: wrap(
      `Devis ${quoteNumber}`,
      `<p>Voici ton devis. Tu peux le consulter et l'accepter directement en ligne.</p>${button(publicUrl, 'Consulter le devis')}`,
    ),
  }
}

export function deleteAccountEmail(url: string) {
  return {
    subject: 'Confirme la suppression de ton compte',
    html: wrap(
      'Confirme la suppression de ton compte',
      `<p>Une demande de suppression définitive de ton compte Argent Brut a été faite. Cette action est irréversible.</p>${button(url, 'Confirmer la suppression')}<p>Si tu n'es pas à l'origine de cette demande, ignore cet email — ton compte reste actif.</p>`,
    ),
  }
}

export function changeEmailNoticeToOldAddress(url: string, newEmail: string) {
  return {
    subject: 'Demande de changement d’adresse email',
    html: wrap(
      'Demande de changement d’adresse email',
      `<p>Une demande de changement d'adresse email vers <strong>${newEmail}</strong> a été faite depuis ton compte. Cette adresse (${newEmail}) va recevoir un lien de confirmation.</p><p>Si tu n'es pas à l'origine de cette demande, connecte-toi et vérifie la sécurité de ton compte (mot de passe, sessions actives).</p>${button(url, 'Voir le lien de confirmation')}`,
    ),
  }
}
