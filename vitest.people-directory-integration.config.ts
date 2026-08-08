import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/*.postgrest.test.ts'],
    // This suite creates and tears down disposable database roles through the
    // local Supabase CLI. Cold CLI starts can push the ACL restoration test
    // past Vitest's default timeout even though each database operation is bounded.
    hookTimeout: 60_000,
    testTimeout: 60_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
