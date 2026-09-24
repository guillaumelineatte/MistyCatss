import { expect, test } from '@playwright/test'

import { signUpVerifyAndLogin } from './helpers/auth'

test('créer un client puis une facture brouillon avec une ligne', async ({ page }) => {
  const email = `e2e-invoices-${Date.now()}@example.com`
  await signUpVerifyAndLogin(page, { email, password: 'CorrectHorseBattery9!', name: 'E2E Invoices' })

  const clientName = `Client Facture E2E ${Date.now()}`
  await page.goto('/clients')
  await page.getByRole('button', { name: 'Ajouter un client' }).click()
  await page.getByLabel('Nom', { exact: true }).fill(clientName)
  await page.getByRole('button', { name: 'Créer le client' }).click()
  await page.waitForURL(/\/clients\/.+/)

  await page.goto('/invoices/new')
  await page.locator('#clientId').selectOption({ label: clientName })

  const descriptionInput = page.getByPlaceholder('Description de la prestation')
  await descriptionInput.fill('Développement site vitrine')
  const lineRow = descriptionInput.locator('xpath=..')
  const numberInputs = lineRow.locator('input[type="number"]')
  await numberInputs.nth(0).fill('2') // quantité
  await numberInputs.nth(1).fill('500') // prix unitaire HT — €

  await page.getByRole('button', { name: 'Créer le brouillon' }).click()
  await page.waitForURL(/\/invoices\/.+/)

  await expect(page.getByText('FACTURE (BROUILLON)')).toBeVisible()
  await expect(page.getByText('1 000,00 €').first()).toBeVisible()
})
