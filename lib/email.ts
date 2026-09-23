import 'server-only'

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { Resend } from 'resend'

type SendEmailInput = {
  to: string
  subject: string
  html: string
}

const resendApiKey = process.env.RESEND_API_KEY
const fromAddress = process.env.RESEND_FROM_EMAIL ?? 'Argent Brut <onboarding@resend.dev>'

const resend = resendApiKey ? new Resend(resendApiKey) : null

/**
 * Envoie un email transactionnel via Resend. Sans RESEND_API_KEY (mode
 * dégradé explicitement autorisé par le cahier des charges), écrit l'email
 * dans la console et dans .mail/*.html au lieu de l'envoyer — ne bloque
 * jamais le développement.
 */
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  if (!resend) {
    await writeDegradedEmail({ to, subject, html })
    return
  }

  const { error } = await resend.emails.send({ from: fromAddress, to, subject, html })
  if (error) {
    console.error(`[email] échec d'envoi Resend vers ${to} : ${error.message}`)
    await writeDegradedEmail({ to, subject, html })
  }
}

async function writeDegradedEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  console.log(`[email] (mode dégradé, RESEND_API_KEY absente) → ${to} : ${subject}`)
  const dir = path.join(process.cwd(), '.mail')
  await mkdir(dir, { recursive: true })
  const filename = `${Date.now()}-${to.replace(/[^a-z0-9]/gi, '_')}.html`
  await writeFile(
    path.join(dir, filename),
    `<!-- To: ${to} -->\n<!-- Subject: ${subject} -->\n${html}`,
    'utf-8',
  )
}
