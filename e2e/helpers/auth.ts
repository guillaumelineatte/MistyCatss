import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

const MAIL_DIR = path.resolve(process.cwd(), '.mail')

/** Retrouve le dernier email dégradé (.mail/*.html, RESEND_API_KEY absente) envoyé à cette adresse. */
function findLatestMailFor(email: string): string {
  const slug = email.replace(/[^a-zA-Z0-9]/g, '_')
  const files = readdirSync(MAIL_DIR)
    .filter((f) => f.includes(slug))
    .sort()
  if (files.length === 0) throw new Error(`Aucun email trouvé pour ${email} dans ${MAIL_DIR}`)
  return readFileSync(path.join(MAIL_DIR, files[files.length - 1]), 'utf-8')
}

function extractFirstLink(html: string): string {
  const match = html.match(/https?:\/\/[^"]+/)
  if (!match) throw new Error("Aucun lien trouvé dans l'email")
  return match[0]
}

export async function signUpVerifyAndLogin(page: Page, { email, password, name }: { email: string; password: string; name: string }) {
  await page.goto('/signup')
  await page.getByLabel('Nom').fill(name)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mot de passe').fill(password)
  await page.getByRole('button', { name: 'Créer mon compte' }).click()

  await expect(page.getByText(/vérifi/i)).toBeVisible({ timeout: 10_000 })

  const mailHtml = findLatestMailFor(email)
  const verifyLink = extractFirstLink(mailHtml)
  await page.goto(verifyLink)

  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mot de passe').fill(password)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await page.waitForURL('/')
}
