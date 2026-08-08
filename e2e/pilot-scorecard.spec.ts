import { expect, test, type BrowserContext, type Page } from '@playwright/test'

type PilotRole = 'admin' | 'parent' | 'principal' | 'teacher'

const actors: Record<PilotRole, { email: string; id: string }> = {
  admin: {
    email: 'pilot-admin@beacon.test',
    id: '00000000-0000-0000-0000-000000000104',
  },
  parent: {
    email: 'pilot-parent@beacon.test',
    id: '00000000-0000-0000-0000-000000000101',
  },
  principal: {
    email: 'pilot-principal@beacon.test',
    id: '00000000-0000-0000-0000-000000000103',
  },
  teacher: {
    email: 'pilot-teacher@beacon.test',
    id: '00000000-0000-0000-0000-000000000102',
  },
}

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
  const user = {
    id: actor.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: actor.email,
    email_confirmed_at: new Date(now * 1000).toISOString(),
    phone: '',
    confirmed_at: new Date(now * 1000).toISOString(),
    last_sign_in_at: new Date(now * 1000).toISOString(),
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
    created_at: new Date(now * 1000).toISOString(),
    updated_at: new Date(now * 1000).toISOString(),
    is_anonymous: false,
  }

  return {
    access_token: accessToken,
    expires_at: now + 3600,
    expires_in: 3600,
    refresh_token: `e2e-refresh-${role}`,
    token_type: 'bearer',
    user,
  }
}

async function authenticate(
  context: BrowserContext,
  role: PilotRole,
  baseURL: string
): Promise<void> {
  const origin = new URL(baseURL).origin
  await context.clearCookies()
  await context.addCookies([
    {
      name: 'sb-127-auth-token',
      value: `base64-${base64Url(JSON.stringify(sessionFor(role)))}`,
      url: origin,
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
  if (!value) throw new Error('Playwright baseURL is required for the pilot scorecard journey')
  return value
}

test.describe('pilot scorecard journey', () => {
  test.skip(
    Boolean(process.env.PLAYWRIGHT_BASE_URL),
    'The pilot scorecard journey requires the deterministic local Supabase fixture.'
  )
  test.describe.configure({ mode: 'serial' })

  test('a linked parent can submit the weekly prompt directly after Family Feed on mobile', async ({
    page,
  }, testInfo) => {
    // Flow: parent dashboard -> Family Feed -> weekly prompt -> rating and optional note -> saved current-week state.
    const baseURL = configuredBaseURL(testInfo.project.use.baseURL)
    await page.setViewportSize({ width: 390, height: 844 })
    await openAs(page, 'parent', '/dashboard', baseURL)

    const familyFeed = page.getByText('Family feed is quiet', { exact: true })
    const feedbackSection = page.getByRole('region', {
      name: 'Was Beacon helpful for understanding school this week?',
    })
    const familyFeedViewSection = page.locator('[data-view-section="parent_feed"]')
    const feedbackViewSection = page.locator('[data-view-section="parent_feedback"]')
    await expect(familyFeed).toBeVisible()
    await expect(feedbackSection).toBeVisible()
    await expect(familyFeedViewSection).toBeVisible()
    await expect(feedbackViewSection).toBeVisible()
    expect(
      await familyFeedViewSection.evaluate(
        (feed, feedback) => feed.nextElementSibling === feedback,
        await feedbackViewSection.elementHandle()
      )
    ).toBe(true)

    const yes = page.getByRole('button', { name: 'Yes', exact: true })
    const notYet = page.getByRole('button', { name: 'Not yet', exact: true })
    for (const rating of [yes, notYet]) {
      const box = await rating.boundingBox()
      expect(box?.height).toBeGreaterThanOrEqual(44)
      expect(box?.width).toBeGreaterThanOrEqual(44)
    }

    await yes.click()
    const comment = page.getByRole('textbox', { name: 'Anything you want us to know?' })
    await expect(comment).toBeVisible()
    await expect(comment).toHaveAttribute('maxlength', '500')
    await expect(
      page.getByText(
        'Please do not include student names, medical details, or other sensitive information.'
      )
    ).toBeVisible()

    await expect(yes).toBeEnabled()
    await yes.focus()
    await expect(yes).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(notYet).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(comment).toBeFocused()

    await comment.fill('x'.repeat(500))
    await notYet.click()
    await expect(
      page.getByText('Thank you - your school and the Beacon team can use this to improve the pilot.')
    ).toBeVisible()
    await expect(notYet).toHaveAttribute('aria-pressed', 'true')

    await page.reload()
    await expect(notYet).toHaveAttribute('aria-pressed', 'true')
    await expect(comment).toHaveValue('x'.repeat(500))

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(hasHorizontalOverflow).toBe(false)
    await expect(page.locator('[aria-labelledby="pilot-evidence-heading"]')).toHaveCount(0)
  })

  test('leadership sees tenant evidence while teachers and parents do not', async ({
    page,
  }, testInfo) => {
    // Flow: role-authenticated entry -> principal overview -> scorecard visible only to principal/admin.
    const baseURL = configuredBaseURL(testInfo.project.use.baseURL)

    for (const role of ['principal', 'admin'] as const) {
      await openAs(page, role, '/principal', baseURL)
      await expect(page.locator('[aria-labelledby="pilot-evidence-heading"]')).toBeVisible()
    }

    for (const role of ['teacher', 'parent'] as const) {
      await openAs(page, role, '/principal', baseURL)
      await page.waitForURL(/\/dashboard$/)
      await expect(page.locator('[aria-labelledby="pilot-evidence-heading"]')).toHaveCount(0)
    }
  })

  test('small samples and unavailable sources stay honest', async ({ page }, testInfo) => {
    // Flow: principal overview -> pilot evidence -> guarded small-sample and unavailable states.
    const baseURL = configuredBaseURL(testInfo.project.use.baseURL)
    await openAs(page, 'principal', '/principal', baseURL)

    const helpfulness = page.locator('dt', { hasText: 'Parent helpfulness' }).locator('..')
    await expect(helpfulness).toContainText('4 responses · not enough for a percentage')
    await expect(helpfulness).not.toContainText('%')

    const attendance = page.locator('dt', { hasText: 'Attendance activity' }).locator('..')
    await expect(attendance).toContainText('Temporarily unavailable')
    await expect(attendance).not.toContainText(/\b(?:zero|\d+)\b/i)
    await expect(attendance.locator('.tabular-nums')).toHaveCount(0)
  })

  test('the local fixture rejects incomplete or stale parent feedback identity keys', async ({
    request,
  }) => {
    const incompleteUpsert = await request.post(
      'http://127.0.0.1:54329/rest/v1/parent_experience_feedback',
      {
        data: { rating: 'helpful', comment: null },
        headers: { Prefer: 'resolution=merge-duplicates' },
      }
    )
    expect.soft(incompleteUpsert.status()).toBe(400)

    const staleWeekUpsert = await request.post(
      'http://127.0.0.1:54329/rest/v1/parent_experience_feedback?on_conflict=school_id%2Cparent_id%2Csurface%2Cweek_start',
      {
        data: {
          school_id: '00000000-0000-0000-0000-000000000001',
          parent_id: '00000000-0000-0000-0000-000000000101',
          rating: 'helpful',
          comment: null,
          surface: 'parent_dashboard',
          week_start: '1999-01-04',
        },
        headers: { Prefer: 'resolution=merge-duplicates' },
      }
    )
    expect.soft(staleWeekUpsert.status()).toBe(400)

    const incompleteCurrentWeekRead = await request.get(
      'http://127.0.0.1:54329/rest/v1/parent_experience_feedback?select=rating%2Ccomment&parent_id=eq.00000000-0000-0000-0000-000000000101'
    )
    expect.soft(incompleteCurrentWeekRead.status()).toBe(400)

    const staleWeekRead = await request.get(
      'http://127.0.0.1:54329/rest/v1/parent_experience_feedback?select=rating%2Ccomment&school_id=eq.00000000-0000-0000-0000-000000000001&parent_id=eq.00000000-0000-0000-0000-000000000101&surface=eq.parent_dashboard&week_start=eq.1999-01-04'
    )
    expect(staleWeekRead.status()).toBe(400)
  })
})
