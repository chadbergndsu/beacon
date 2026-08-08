import { expect, test, type BrowserContext, type Page } from '@playwright/test'

type PilotRole = 'parent' | 'teacher'

const actors: Record<PilotRole, { email: string; id: string }> = {
  parent: {
    email: 'pilot-parent@beacon.test',
    id: '00000000-0000-4000-8000-000000000101',
  },
  teacher: {
    email: 'pilot-teacher@beacon.test',
    id: '00000000-0000-4000-8000-000000000102',
  },
}

const moreLabels = ['Lessons', 'Calendar', 'Printables', 'Scan', 'Craft', 'Comms', 'School site']

function base64Url(input: string): string {
  return Buffer.from(input).toString('base64url')
}

function sessionFor(role: PilotRole) {
  const actor = actors[role]
  const now = Math.floor(Date.now() / 1000)
  const accessToken = [
    base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
    base64Url(
      JSON.stringify({
        aud: 'authenticated',
        email: actor.email,
        exp: now + 3600,
        iat: now,
        iss: 'http://127.0.0.1:54329/auth/v1',
        role: 'authenticated',
        sub: actor.id,
      })
    ),
    base64Url('e2e-signature'),
  ].join('.')
  const timestamp = new Date(now * 1000).toISOString()

  return {
    access_token: accessToken,
    expires_at: now + 3600,
    expires_in: 3600,
    refresh_token: `e2e-refresh-${role}`,
    token_type: 'bearer',
    user: {
      id: actor.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: actor.email,
      email_confirmed_at: timestamp,
      phone: '',
      confirmed_at: timestamp,
      last_sign_in_at: timestamp,
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {},
      identities: [],
      created_at: timestamp,
      updated_at: timestamp,
      is_anonymous: false,
    },
  }
}

async function authenticate(
  context: BrowserContext,
  role: PilotRole,
  baseURL: string
): Promise<void> {
  await context.clearCookies()
  await context.addCookies([
    {
      name: 'sb-127-auth-token',
      value: `base64-${base64Url(JSON.stringify(sessionFor(role)))}`,
      url: new URL(baseURL).origin,
      httpOnly: false,
      sameSite: 'Lax',
      secure: false,
    },
  ])
}

async function openAs(page: Page, role: PilotRole, path: string, baseURL: string) {
  await authenticate(page.context(), role, baseURL)
  await page.goto(path)
}

function configuredBaseURL(value: string | undefined): string {
  if (!value) throw new Error('Playwright baseURL is required for the People messaging journey')
  return value
}

function captureConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

test.describe('faculty People messaging journey', () => {
  test.skip(
    Boolean(process.env.PLAYWRIGHT_BASE_URL),
    'The People messaging journey requires the deterministic local Supabase fixture.'
  )
  test.describe.configure({ mode: 'serial' })

  test('teacher opens visible More navigation and sends one deduplicated People message', async ({
    page,
  }, testInfo) => {
    const baseURL = configuredBaseURL(testInfo.project.use.baseURL)
    const consoleErrors = captureConsoleErrors(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await openAs(page, 'teacher', '/dashboard', baseURL)

    const more = page.getByRole('button', { name: 'More' })
    await expect(more).toBeVisible()
    await more.click()

    const menu = page.getByRole('menu')
    await expect(menu).toBeVisible()
    for (const label of moreLabels) {
      await expect(page.getByRole('menuitem', { name: label })).toBeVisible()
    }

    const triggerBox = await more.boundingBox()
    const menuBox = await menu.boundingBox()
    expect(triggerBox).not.toBeNull()
    expect(menuBox).not.toBeNull()
    expect(menuBox!.y).toBeGreaterThanOrEqual(triggerBox!.y + triggerBox!.height)
    expect(menuBox!.x).toBeGreaterThanOrEqual(0)
    expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(1280)
    expect(menuBox!.y + menuBox!.height).toBeLessThanOrEqual(800)

    await page.getByRole('menuitem', { name: 'Comms' }).click()
    await page.waitForURL(/\/admin\/emails$/)
    await expect(page.getByRole('tab', { name: 'People' })).toHaveAttribute(
      'aria-selected',
      'true'
    )

    const to = page.getByRole('combobox', { name: 'To' })
    await to.fill('Pri')
    await page.getByRole('option', { name: /Priya Principal/ }).click()
    await to.fill('Sam')
    await page.getByRole('option', { name: /Sam Student.*sends to 1 linked parent/ }).click()

    await expect(page.getByText('2 unique email recipients')).toBeVisible()
    await expect(
      page.getByText('Sam Student sends to 1 linked recipient', { exact: true })
    ).toBeVisible()
    await expect(page.getByText('Pat Parent', { exact: true })).toBeVisible()

    const subject = page.getByLabel('Subject')
    const message = page.getByLabel('Message', { exact: true })
    await subject.fill('Friday reminder')
    await message.fill('Please check the Friday schedule.')
    await page.getByRole('button', { name: 'Send to 2 recipients' }).click()

    const status = page.getByRole('status').filter({ hasText: 'log-only' })
    await expect(status).toContainText('Sent 0')
    await expect(status).toContainText('2 log-only')
    await expect(status).toContainText('configure RESEND_API_KEY and/or SMTP_*')
    await expect(subject).toHaveValue('Friday reminder')
    await expect(message).toHaveValue('Please check the Friday schedule.')

    await to.fill('Outside')
    await expect(page.getByText('No permitted people found')).toBeVisible()
    await to.fill('Unassigned')
    await expect(page.getByText('No permitted people found')).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      )
    ).toBe(false)

    await page.reload()
    const messageRows = page.getByRole('row').filter({ hasText: 'Friday reminder' })
    await expect(messageRows).toHaveCount(2)
    await expect(messageRows.filter({ hasText: 'pilot-principal@beacon.test' })).toHaveCount(1)
    await expect(messageRows.filter({ hasText: 'pilot-family@beacon.test' })).toHaveCount(1)
    await expect(messageRows.filter({ hasText: 'skipped' })).toHaveCount(2)
    expect(consoleErrors).toEqual([])
  })

  test('teacher More remains visible without horizontal overflow on mobile', async ({
    page,
  }, testInfo) => {
    const baseURL = configuredBaseURL(testInfo.project.use.baseURL)
    const consoleErrors = captureConsoleErrors(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await openAs(page, 'teacher', '/dashboard', baseURL)

    await page.getByRole('button', { name: 'More' }).click()
    const menu = page.getByRole('menu')
    await expect(menu).toBeVisible()
    for (const label of moreLabels) {
      await expect(page.getByRole('menuitem', { name: label })).toBeVisible()
    }
    const menuBox = await menu.boundingBox()
    expect(menuBox).not.toBeNull()
    expect(menuBox!.x).toBeGreaterThanOrEqual(0)
    expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(390)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      )
    ).toBe(false)
    expect(consoleErrors).toEqual([])
  })

  test('parent is redirected away from faculty People messaging', async ({ page }, testInfo) => {
    const baseURL = configuredBaseURL(testInfo.project.use.baseURL)
    await openAs(page, 'parent', '/admin/emails', baseURL)

    await page.waitForURL(/\/dashboard$/)
    await expect(page.getByRole('tab', { name: 'People' })).toHaveCount(0)
  })
})
