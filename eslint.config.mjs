import nextConfig from 'eslint-config-next'

/** @type {import('eslint').Linter.Config[]} */
const config = [
  ...nextConfig,
  {
    ignores: ['.next/**', 'drizzle/**', 'node_modules/**', '.mail/**', 'public/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
]

export default config
