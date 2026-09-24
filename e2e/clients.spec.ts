import { expect, test } from '@playwright/test'

import { signUpVerifyAndLogin } from './helpers/auth'

test('créer un client et le retrouver dans la liste', async ({ page }) => {
  const email = `e2e-clients-${Date.now()}@example.com`
  await signUpVerifyAndLogin(page, { email, password: 'CorrectHorseBattery9!', name: 'E2E Clients' })

  const clientName = `Client E2E ${Date.now()}`
  await page.goto('/clients')
  await page.getByRole('button', { name: 'Ajouter un client' }).click()
  await page.getByLabel('Nom', { exact: true }).fill(clientName)
  await page.getByRole('button', { name: 'Créer le client' }).click()

  await page.waitForURL(/\/clients\/.+/)
  await expect(page.getByRole('heading', { name: clientName, level: 2 })).toBeVisible()

  await page.goto('/clients')
  await expect(page.getByText(clientName)).toBeVisible()
})
