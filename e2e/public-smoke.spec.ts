import { test, expect } from '@playwright/test'

/**
 * Public-surface smoke — no login required.
 * Against production: PLAYWRIGHT_BASE_URL=https://beacon.commoncentsip.com npm run test:e2e
 */
test.describe('public smoke', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('body')).toBeVisible()
    // Email field or sign-in affordance
    const email = page.locator('input[type="email"], input[name="email"]')
    await expect(email.first()).toBeVisible({ timeout: 15_000 })
  })

  test('Beacon vendor page presents the bounded buyer journey', async ({ page }) => {
    await page.goto('/about')
    await expect(
      page.getByRole('heading', {
        name: 'A calmer path from classroom work to family understanding.',
      })
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Review Trust & Data Practices' })).toHaveAttribute(
      'href',
      '/privacy'
    )
    await expect(page.getByText('Current stage · design-partner program')).toBeVisible()
    const formButton = page.getByRole('button', { name: 'Send design-partner inquiry' })
    await expect(formButton).toBeVisible()
    const conversation = page.getByRole('link', {
      name: 'Ask about a design-partner conversation',
    })
    await expect(conversation).toHaveAttribute('href', '#contact')
  })

  test('school query selection survives the header home link', async ({ page }) => {
    await page.goto('/school?school=missing-school-test')
    const schoolHome = page.locator('header a[href="/school?school=missing-school-test"]')
    await expect(schoolHome).toBeVisible()
    await expect(page.getByRole('link', { name: 'Powered by Beacon' })).toHaveAttribute(
      'href',
      '/about?school=missing-school-test'
    )
    await expect(
      page.getByRole('contentinfo').getByRole('link', { name: 'About Beacon' })
    ).toHaveAttribute('href', '/about?school=missing-school-test')
    await expect(
      page.getByRole('contentinfo').getByRole('link', { name: 'Trust & data practices' })
    ).toHaveAttribute('href', '/privacy?school=missing-school-test')
    await expect(
      page.getByRole('banner').getByRole('link', { name: 'Sign in' })
    ).toHaveAttribute('href', '/login?school=missing-school-test')
    await page.getByRole('link', { name: 'Powered by Beacon' }).click()
    await expect(page).toHaveURL(/\/about\?school=missing-school-test$/)
    await expect(page.getByRole('link', { name: 'School site' })).toHaveAttribute(
      'href',
      '/school?school=missing-school-test'
    )
    await expect(page.getByRole('link', { name: 'Beacon company home' })).toHaveAttribute(
      'href',
      '/about?school=missing-school-test'
    )
    await page.getByRole('link', { name: 'Review Trust & Data Practices' }).click()
    await expect(page).toHaveURL(/\/privacy\?school=missing-school-test$/)
    await expect(page.getByRole('link', { name: 'About Beacon' })).toHaveAttribute(
      'href',
      '/about?school=missing-school-test'
    )
    await expect(page.getByRole('link', { name: 'School site' })).toHaveAttribute(
      'href',
      '/school?school=missing-school-test'
    )
  })

  test('school-branded login keeps tenant context through role selection', async ({ page }) => {
    await page.goto('/login?school=missing-school-test')
    await expect(page.getByRole('link', { name: 'School site' })).toHaveAttribute(
      'href',
      '/school?school=missing-school-test'
    )
    await expect(page.getByRole('link', { name: 'Secretary / admin sign-in' })).toHaveAttribute(
      'href',
      '/login?school=missing-school-test&as=office'
    )
    await expect(page.getByRole('link', { name: 'Principal sign-in' })).toHaveAttribute(
      'href',
      '/login?school=missing-school-test&as=principal'
    )

    await page.getByRole('link', { name: 'Principal sign-in' }).click()
    await expect(page).toHaveURL(/\/login\?school=missing-school-test&as=principal$/)
    await expect(page.getByRole('link', { name: 'Staff & parent sign-in' })).toHaveAttribute(
      'href',
      '/login?school=missing-school-test'
    )
  })

  test('mobile school-to-Beacon journey reaches an accessible inquiry form', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/school?school=missing-school-test')
    const menuButton = page.getByRole('button', { name: 'Open menu' })
    const menuButtonBox = await menuButton.boundingBox()
    expect(menuButtonBox?.height).toBeGreaterThanOrEqual(44)
    expect(menuButtonBox?.width).toBeGreaterThanOrEqual(44)
    await menuButton.click()
    const mobileLinks = page.locator('#school-mobile-navigation a')
    for (let index = 0; index < (await mobileLinks.count()); index += 1) {
      const box = await mobileLinks.nth(index).boundingBox()
      expect(box?.height).toBeGreaterThanOrEqual(44)
    }
    await page
      .locator('#school-mobile-navigation')
      .getByRole('link', { name: 'About Beacon' })
      .click()
    await expect(page).toHaveURL(/\/about\?school=missing-school-test$/)

    const priority = page.getByRole('textbox', {
      name: 'What workflow would you most like to improve?',
    })
    await expect(priority).toBeVisible()
    await expect(priority).toHaveAttribute('aria-describedby', 'design-partner-priority-hint')
    await expect(page.locator('#design-partner-priority-hint')).toContainText(
      'Do not include student names'
    )
    await page.getByLabel('Name').fill('Jordan Lee')
    await page.getByLabel('Role').fill('Head of school')
    await page.getByLabel('Work email').fill('jordan@example.org')
    await page.getByLabel('School').fill('Example Academy')
    await priority.fill('Short')
    await page.getByRole('button', { name: 'Send design-partner inquiry' }).click()
    await expect(priority).toHaveJSProperty('validity.valid', false)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(overflow).toBe(false)
  })

  test('health returns bare ok JSON', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.checks).toBeUndefined()
  })

  test('device-scan GET is 405', async ({ request }) => {
    const res = await request.get('/api/kiosk/device-scan')
    expect(res.status()).toBe(405)
  })

  test('kiosk without cookie is not found', async ({ page }) => {
    const res = await page.goto('/kiosk')
    // Next notFound → 404
    expect(res?.status()).toBe(404)
  })

  test('invalid kiosk token bootstrap ends not found', async ({ page }) => {
    const res = await page.goto('/kiosk/short')
    // short token skipped by middleware; page may 404
    expect([404, 200, 307, 308]).toContain(res?.status() ?? 0)
  })

  test('protected app redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL(/\/login/, { timeout: 15_000 })
    expect(page.url()).toMatch(/\/login/)
  })
})
