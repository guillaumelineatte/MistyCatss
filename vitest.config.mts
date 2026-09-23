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
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
})
