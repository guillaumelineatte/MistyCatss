import { defineConfig, devices } from '@playwright/test'

const PORT = 3100
const BASE_URL = `http://localhost:${PORT}`

/**
 * Tourne contre un vrai serveur `next dev` branché sur la branche Neon
 * `test` (jamais `production`/dev réels) — voir e2e/test-server.mjs, qui
 * remappe TEST_DATABASE_* vers DATABASE_* avant de démarrer Next.js. Les
 * parcours critiques (PROMPT.md) créent et lisent de vraies données via de
 * vrais comptes de test jetables, jamais de mock.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 30_000,
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node e2e/test-server.mjs',
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
