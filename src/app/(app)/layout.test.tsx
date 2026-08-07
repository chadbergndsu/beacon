import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getProfile: vi.fn(),
  loadSchoolBrand: vi.fn(),
  loadUserPreferences: vi.fn(),
  cookies: vi.fn(),
}))

vi.mock('next/headers', () => ({ cookies: mocks.cookies }))
vi.mock('@/lib/auth', () => ({ getProfile: mocks.getProfile }))
vi.mock('@/lib/school-brand', () => ({ loadSchoolBrand: mocks.loadSchoolBrand }))
vi.mock('@/lib/view-prefs/store', () => ({ loadUserPreferences: mocks.loadUserPreferences }))
vi.mock('@/lib/email/transport', () => ({ isEmailHonestLive: () => false }))
vi.mock('@/lib/billing/quickbooks', () => ({ isQuickBooksConfigured: () => false }))
vi.mock('@/components/layout/AppHeader', () => ({ AppHeader: () => null }))
vi.mock('@/components/ops/TrustModeBanner', () => ({ TrustModeBanner: () => null }))
vi.mock('@/components/pilot/PilotSuggestionButton', () => ({ PilotSuggestionButton: () => null }))
vi.mock('@/components/skins/SkinProvider', () => ({
  SkinProvider: ({ children }: { children: ReactNode }) => children,
}))

import AppLayout from './layout'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('authenticated app shell loading', () => {
  it('starts cookies, brand, and preferences without a sequential waterfall', async () => {
    const brand = deferred<{
      shortName: string
      name: string
      websiteUrl: null
    }>()
    const preferences = deferred<{ skin: 'classic' }>()
    mocks.getProfile.mockResolvedValue({
      user: { id: 'user-1', email: 'leader@example.com' },
      profile: {
        id: 'user-1',
        school_id: 'school-1',
        role: 'principal',
        full_name: 'School Leader',
        email: 'leader@example.com',
        phone: null,
      },
    })
    mocks.loadSchoolBrand.mockReturnValue(brand.promise)
    mocks.loadUserPreferences.mockReturnValue(preferences.promise)
    mocks.cookies.mockResolvedValue({ get: () => undefined })

    const layoutPromise = AppLayout({ children: <div>Dashboard</div> })

    try {
      await vi.waitFor(() => {
        expect(mocks.loadSchoolBrand).toHaveBeenCalledWith('school-1')
        expect(mocks.loadUserPreferences).toHaveBeenCalledWith('user-1')
        expect(mocks.cookies).toHaveBeenCalledTimes(1)
      })
    } finally {
      brand.resolve({ shortName: 'Beacon', name: 'Beacon School', websiteUrl: null })
      preferences.resolve({ skin: 'classic' })
    }

    await expect(layoutPromise).resolves.toBeTruthy()
  })
})
