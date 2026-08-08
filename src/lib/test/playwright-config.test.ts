import { afterEach, describe, expect, it, vi } from 'vitest'

const managedEnvironment = [
  'CI',
  'PLAYWRIGHT_BASE_URL',
  'PLAYWRIGHT_PORT',
  'RESEND_API_KEY',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_SECURE',
  'SMTP_URL',
] as const

const originalEnvironment = Object.fromEntries(
  managedEnvironment.map((name) => [name, process.env[name]])
)

async function loadPlaywrightConfig(environment: Record<string, string> = {}) {
  for (const name of managedEnvironment) delete process.env[name]
  Object.assign(process.env, environment)
  vi.resetModules()
  return (await import('../../../playwright.config')).default
}

afterEach(() => {
  for (const name of managedEnvironment) {
    const value = originalEnvironment[name]
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
  vi.resetModules()
})

describe('Playwright server ownership', () => {
  it('owns both local fixture servers and sanitizes every live email transport input', async () => {
    const config = await loadPlaywrightConfig({
      PLAYWRIGHT_PORT: '3910',
      RESEND_API_KEY: 're_foreign',
      SMTP_HOST: 'smtp.foreign.test',
      SMTP_PORT: '465',
      SMTP_USER: 'foreign-user',
      SMTP_PASS: 'foreign-pass',
      SMTP_SECURE: 'true',
      SMTP_URL: 'smtps://foreign-user:foreign-pass@smtp.foreign.test:465',
    })

    expect(config.webServer).toEqual([
      expect.objectContaining({
        command: 'node scripts/e2e-supabase-mock.mjs',
        reuseExistingServer: false,
        url: 'http://127.0.0.1:54329/health',
      }),
      expect.objectContaining({
        command: 'npx next start -p 3910',
        reuseExistingServer: false,
        url: 'http://127.0.0.1:3910',
        env: expect.objectContaining({
          EMAIL_TRANSPORTS: 'log',
          RESEND_API_KEY: '',
          SMTP_HOST: '',
          SMTP_PORT: '',
          SMTP_USER: '',
          SMTP_PASS: '',
          SMTP_SECURE: '',
          SMTP_URL: '',
        }),
      }),
    ])
  })

  it('starts no local fixture server when a hosted base URL is configured', async () => {
    const config = await loadPlaywrightConfig({
      PLAYWRIGHT_BASE_URL: 'https://beacon.example.test',
    })

    expect(config.webServer).toBeUndefined()
    expect(config.use).toEqual(
      expect.objectContaining({ baseURL: 'https://beacon.example.test' })
    )
  })
})
