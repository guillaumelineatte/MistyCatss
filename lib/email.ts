import 'server-only'

import { mkdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Resend } from 'resend'

type EmailAttachment = { filename: string; content: Buffer }

type SendEmailInput = {
  to: string
  subject: string
  html: string
  attachments?: EmailAttachment[]
}

const resendApiKey = process.env.RESEND_API_KEY
const fromAddress = process.env.RESEND_FROM_EMAIL ?? 'Argent Brut <onboarding@resend.dev>'

const resend = resendApiKey ? new Resend(resendApiKey) : null

/**
 * Envoie un email transactionnel via Resend. Sans RESEND_API_KEY (mode
 * dégradé explicitement autorisé par le cahier des charges), écrit l'email
 * dans la console et dans .mail/*.html au lieu de l'envoyer — ne bloque
 * jamais le développement. Les pièces jointes sont aussi écrites à côté en
 * mode dégradé pour rester vérifiables.
 */
export async function sendEmail({ to, subject, html, attachments }: SendEmailInput): Promise<void> {
  if (!resend) {
    await writeDegradedEmail({ to, subject, html, attachments })
    return
  }

  const { error } = await resend.emails.send({
    from: fromAddress,
    to,
    subject,
    html,
    attachments: attachments?.map((a) => ({ filename: a.filename, content: a.content })),
  })
  if (error) {
    console.error(`[email] échec d'envoi Resend vers ${to} : ${error.message}`)
    await writeDegradedEmail({ to, subject, html, attachments })
  }
}

/**
 * `process.cwd()` n'est accessible en écriture qu'en développement local —
 * une fonction Vercel tourne sur un filesystem en lecture seule (sauf
 * `/tmp`). Le mode dégradé y reste donc "console uniquement, best-effort
 * fichier dans /tmp" plutôt que de planter le flux (signup, reset...) qui
 * l'a déclenché : l'email log dans les logs de fonction Vercel, consultable
 * par le propriétaire du projet, jamais par l'utilisateur qui l'attend — un
 * vrai RESEND_API_KEY reste nécessaire pour un déploiement utilisable par
 * d'autres personnes que le propriétaire.
 */
async function writeDegradedEmail({ to, subject, html, attachments }: SendEmailInput): Promise<void> {
  console.log(`[email] (mode dégradé, RESEND_API_KEY absente) → ${to} : ${subject}`)
  try {
    const dir = path.join(process.env.VERCEL ? os.tmpdir() : process.cwd(), '.mail')
    await mkdir(dir, { recursive: true })
    const base = `${Date.now()}-${to.replace(/[^a-z0-9]/gi, '_')}`
    await writeFile(path.join(dir, `${base}.html`), `<!-- To: ${to} -->\n<!-- Subject: ${subject} -->\n${html}`, 'utf-8')
    for (const attachment of attachments ?? []) {
      await writeFile(path.join(dir, `${base}-${attachment.filename}`), attachment.content)
    }
  } catch (error) {
    console.error(`[email] impossible d'écrire l'email dégradé sur disque : ${error instanceof Error ? error.message : error}`)
  }
}
