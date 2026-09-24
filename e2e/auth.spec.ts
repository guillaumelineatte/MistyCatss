import { expect, test } from '@playwright/test'

import { signUpVerifyAndLogin } from './helpers/auth'

test('inscription → vérification email → connexion → tableau de bord', async ({ page }) => {
  const email = `e2e-auth-${Date.now()}@example.com`

  await signUpVerifyAndLogin(page, { email, password: 'CorrectHorseBattery9!', name: 'E2E Auth' })

  await expect(page.getByRole('heading', { name: 'VUE D’ENSEMBLE' })).toBeVisible()
})

test('mot de passe trop court est rejeté avant tout envoi réseau', async ({ page }) => {
  await page.goto('/signup')
  await page.getByLabel('Nom').fill('Test Court')
  await page.getByLabel('Email').fill(`e2e-short-${Date.now()}@example.com`)
  const password = page.getByLabel('Mot de passe')
  await password.fill('court')
  await expect(password).toHaveJSProperty('validity.valid', false)
})

test('déconnexion renvoie vers la page de connexion', async ({ page }) => {
  const email = `e2e-logout-${Date.now()}@example.com`
  await signUpVerifyAndLogin(page, { email, password: 'CorrectHorseBattery9!', name: 'E2E Logout' })

  await page.getByRole('button', { name: 'Déconnexion' }).click()
  await page.waitForURL('/login')
  await expect(page.getByRole('heading', { name: 'CONNEXION' })).toBeVisible()
})
