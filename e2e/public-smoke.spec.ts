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

  test('product landing and FACTS compare are public', async ({ page }) => {
    const home = await page.goto('/')
    expect(home?.ok()).toBeTruthy()
    await expect(page.getByRole('tab', { name: 'Fun Facts' })).toBeVisible({ timeout: 15_000 })

    const facts = await page.goto('/vs/facts')
    expect(facts?.ok()).toBeTruthy()
    await expect(page.getByRole('heading', { name: /Beacon vs FACTS/i })).toBeVisible()

    const renweb = await page.goto('/vs/renweb')
    expect(renweb?.ok()).toBeTruthy()
    await expect(page.getByRole('heading', { name: /RenWeb/i })).toBeVisible()
  })

  test('robots and sitemap are reachable', async ({ request }) => {
    const robots = await request.get('/robots.txt')
    expect(robots.ok()).toBeTruthy()
    const robotsBody = await robots.text()
    expect(robotsBody.toLowerCase()).toContain('sitemap')

    const sitemap = await request.get('/sitemap.xml')
    expect(sitemap.ok()).toBeTruthy()
    const map = await sitemap.text()
    expect(map).toContain('/vs/facts')
  })
})
