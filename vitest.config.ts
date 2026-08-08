import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup/local-storage.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html'],
      // Gate CI on security/ACL pure surface (raise when more action tests land)
      include: [
        'src/lib/roles.ts',
        'src/lib/safe-redirect.ts',
        'src/lib/security/**/*.ts',
        'src/lib/badge/codes.ts',
        'src/lib/badge/scan-guards.ts',
        'src/lib/email/freeform-policy.ts',
        'src/lib/class-access.ts',
      ],
      exclude: ['**/*.test.ts', '**/test/**'],
      thresholds: {
        lines: 80,
        functions: 70,
        statements: 80,
        branches: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
