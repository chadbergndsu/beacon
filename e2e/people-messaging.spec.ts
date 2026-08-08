import {
  expect,
  test,
  type APIRequestContext,
  type BrowserContext,
  type Page,
  type TestInfo,
} from '@playwright/test'

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
const mockBaseURL = 'http://127.0.0.1:54329'
const schoolId = '00000000-0000-4000-8000-000000000001'
const parentId = '00000000-0000-4000-8000-000000000101'
const secondLinkedParentId = '00000000-0000-4000-8000-000000000105'
const reservedStudentId = '00000000-0000-4000-8000-000000000204'
const reservedStudentDecoyId = '00000000-0000-4000-8000-000000000205'

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

async function resetMock(request: APIRequestContext) {
  const response = await request.post(`${mockBaseURL}/__e2e/reset`)
  expect(response.ok()).toBe(true)
}

async function expectMoreMenuWithinViewport(page: Page, width: number, height: number) {
  const more = page.getByRole('button', { name: 'More' })
  await expect(more).toBeVisible()
  await more.click()

  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('menuitem')).toHaveCount(7)
  for (const label of moreLabels) {
    await expect(menu.getByRole('menuitem', { name: label })).toBeVisible()
  }

  const triggerBox = await more.boundingBox()
  const menuBox = await menu.boundingBox()
  expect(triggerBox).not.toBeNull()
  expect(menuBox).not.toBeNull()
  expect(menuBox!.y).toBeGreaterThanOrEqual(triggerBox!.y + triggerBox!.height)
  expect(menuBox!.x).toBeGreaterThanOrEqual(0)
  expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(width)
  expect(menuBox!.y + menuBox!.height).toBeLessThanOrEqual(height)

  return menu
}

async function runTeacherPeopleJourney(
  page: Page,
  testInfo: TestInfo,
  viewport: { width: number; height: number },
  subjectText: string,
  messageText: string
) {
  const baseURL = configuredBaseURL(testInfo.project.use.baseURL)
  const consoleErrors = captureConsoleErrors(page)
  await page.setViewportSize(viewport)
  await openAs(page, 'teacher', '/dashboard', baseURL)

  const menu = await expectMoreMenuWithinViewport(page, viewport.width, viewport.height)
  await menu.getByRole('menuitem', { name: 'Comms' }).click()
  await page.waitForURL(/\/admin\/emails$/)
  await expect(
    page.getByText('Log-only mode — not yet reaching inboxes', { exact: true })
  ).toBeVisible()
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
  await subject.fill(subjectText)
  await message.fill(messageText)
  await page.getByRole('button', { name: 'Send to 2 recipients' }).click()

  const status = page.getByRole('status').filter({ hasText: 'log-only' })
  await expect(status).toContainText('Sent 0')
  await expect(status).toContainText('2 log-only')
  await expect(status).toContainText('configure RESEND_API_KEY and/or SMTP_*')
  await expect(subject).toHaveValue(subjectText)
  await expect(message).toHaveValue(messageText)

  await to.fill('Outside')
  await expect(page.getByText('No permitted people found')).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
  ).toBe(false)

  await page.reload()
  const messageRows = page.getByRole('row').filter({ hasText: subjectText })
  await expect(messageRows).toHaveCount(2)
  await expect(messageRows.filter({ hasText: 'pilot-principal@beacon.test' })).toHaveCount(1)
  await expect(messageRows.filter({ hasText: 'pilot-family@beacon.test' })).toHaveCount(1)
  await expect(messageRows.filter({ hasText: 'skipped' })).toHaveCount(2)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
  ).toBe(false)
  expect(consoleErrors).toEqual([])
}

test.describe('faculty People messaging journey', () => {
  test.skip(
    Boolean(process.env.PLAYWRIGHT_BASE_URL),
    'The People messaging journey requires the deterministic local Supabase fixture.'
  )
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ request }) => {
    await resetMock(request)
  })

  test('local Supabase fixture honors People filter and outbox contracts', async ({ request }) => {
    const reservedOr =
      'first_name.ilike."%Re\\\\%,\\\\_()\\"\\\\\\\\ed%",last_name.ilike."%Re\\\\%,\\\\_()\\"\\\\\\\\ed%"'
    const studentParams = new URLSearchParams({
      select: 'id,first_name',
      school_id: `eq.${schoolId}`,
      active: 'eq.true',
      id: `in.(${reservedStudentId},${reservedStudentDecoyId})`,
      or: reservedOr,
      limit: '20',
    })
    const studentResponse = await request.get(
      `${mockBaseURL}/rest/v1/students?${studentParams.toString()}`
    )
    expect(studentResponse.ok()).toBe(true)
    expect(await studentResponse.json()).toEqual([
      { id: reservedStudentId, first_name: 'Re%,_()"\\ed' },
    ])

    const profileParams = new URLSearchParams({
      select: 'id,email',
      id: `in.(${parentId},${secondLinkedParentId})`,
      order: 'id.asc',
    })
    const profileResponse = await request.get(
      `${mockBaseURL}/rest/v1/profiles?${profileParams.toString()}`
    )
    expect(await profileResponse.json()).toEqual([
      { id: parentId, email: 'pilot-family@beacon.test' },
      { id: secondLinkedParentId, email: 'PILOT-FAMILY@BEACON.TEST' },
    ])

    for (const subject of ['Older fixture row', 'Newer fixture row']) {
      const insertResponse = await request.post(`${mockBaseURL}/rest/v1/email_outbox`, {
        data: {
          school_id: schoolId,
          kind: 'people',
          to_email: 'fixture@beacon.test',
          subject,
          status: 'skipped',
        },
      })
      expect(insertResponse.ok()).toBe(true)
      expect((await insertResponse.json())[0].id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      )
    }

    const outboxParams = new URLSearchParams({
      select: 'id,status,subject',
      school_id: `eq.${schoolId}`,
      order: 'created_at.desc',
      limit: '1',
    })
    const outboxResponse = await request.get(
      `${mockBaseURL}/rest/v1/email_outbox?${outboxParams.toString()}`
    )
    const outboxRows = await outboxResponse.json()
    expect(outboxRows).toHaveLength(1)
    expect(outboxRows[0]).toEqual({
      id: '00000000-0000-4000-8000-000000000002',
      status: 'skipped',
      subject: 'Newer fixture row',
    })

    await resetMock(request)
    const emptyOutbox = await request.get(`${mockBaseURL}/rest/v1/email_outbox`)
    expect(await emptyOutbox.json()).toEqual([])
  })

  test('teacher sends one deduplicated People message after desktop More navigation', async ({
    page,
  }, testInfo) => {
    await runTeacherPeopleJourney(
      page,
      testInfo,
      { width: 1280, height: 800 },
      'Friday desktop reminder',
      'Please check the Friday desktop schedule.'
    )

    const to = page.getByRole('combobox', { name: 'To' })
    await to.fill('Unassigned')
    await expect(page.getByText('No permitted people found')).toBeVisible()
  })

  test('teacher completes the People journey through visible mobile More navigation', async ({
    page,
  }, testInfo) => {
    await runTeacherPeopleJourney(
      page,
      testInfo,
      { width: 390, height: 844 },
      'Friday mobile reminder',
      'Please check the Friday mobile schedule.'
    )
  })

  test('parent is redirected away from faculty People messaging', async ({ page }, testInfo) => {
    const baseURL = configuredBaseURL(testInfo.project.use.baseURL)
    await openAs(page, 'parent', '/admin/emails', baseURL)

    await page.waitForURL(/\/dashboard$/)
    await expect(page.getByRole('tab', { name: 'People' })).toHaveCount(0)
  })
})
