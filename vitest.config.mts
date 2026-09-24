import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    // Aucun test unitaire tant qu'il n'y a pas de logique métier (Phase 4+
    // pour lib/fiscal, Phase 3 pour les tests d'isolation multi-comptes).
    passWithNoTests: true,
    // e2e/*.spec.ts sont des tests Playwright (pnpm test:e2e), pas Vitest —
    // leur import de `test` depuis @playwright/test entre en conflit avec
    // le global `test` de Vitest si ce dossier n'est pas exclu ici.
    exclude: ['**/node_modules/**', '**/e2e/**'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
      // Voir test/stubs/server-only.ts : neutralise le garde-fou de bundler
      // Next.js, non pertinent sous Vitest.
      'server-only': fileURLToPath(new URL('./test/stubs/server-only.ts', import.meta.url)),
    },
  },
})
