import { defineConfig, devices } from '@playwright/test'

const port = process.env.PLAYWRIGHT_PORT || '3010'
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Local default: spin up next start if not pointing at prod/staging
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : [
      {
        command: 'node scripts/e2e-supabase-mock.mjs',
        url: 'http://127.0.0.1:54329/health',
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
      },
      {
        command: `npx next start -p ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          ...process.env,
          PORT: port,
          NEXT_TELEMETRY_DISABLED: '1',
          // Browser tests intentionally use the loopback readiness fixture,
          // even when CI injects a placeholder Supabase URL globally.
          NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54329',
          NEXT_PUBLIC_SUPABASE_ANON_KEY:
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'ci-anon-key',
          SUPABASE_SERVICE_ROLE_KEY:
            process.env.SUPABASE_SERVICE_ROLE_KEY || 'ci-service-role-key',
          BEACON_FEEDBACK_TO:
            process.env.BEACON_FEEDBACK_TO || 'owner@beacon.local',
          EMAIL_TRANSPORTS: 'log',
          RESEND_API_KEY: '',
          EMAIL_FROM: process.env.EMAIL_FROM || 'Beacon <hello@beacon.test>',
        },
      },
    ],
})
