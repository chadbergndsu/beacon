import { Children, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultBillingState } from '@/lib/billing/types'
import type { PilotEvidenceScorecard } from '@/lib/pilot-analytics/types'
import { createMockAdmin } from '@/lib/test/mock-supabase'

const mocks = vi.hoisted(() => ({
  requirePrincipal: vi.fn(),
  loadBillingState: vi.fn(),
  loadSchoolBeaconSignal: vi.fn(),
  loadPilotScorecard: vi.fn(),
  loadScreenLayout: vi.fn(),
  admin: null as ReturnType<typeof createMockAdmin> | null,
}))

vi.mock('@/lib/principal', () => ({ requirePrincipal: mocks.requirePrincipal }))
vi.mock('@/lib/billing/store', () => ({
  loadBillingState: mocks.loadBillingState,
  formatMoney: (cents: number) => `$${(cents / 100).toFixed(2)}`,
}))
vi.mock('@/lib/insights/load-beacon-signal', () => ({
  loadSchoolBeaconSignal: mocks.loadSchoolBeaconSignal,
}))
vi.mock('@/lib/pilot-analytics/scorecard', () => ({
  loadPilotScorecard: mocks.loadPilotScorecard,
}))
vi.mock('@/lib/view-prefs/store', () => ({ loadScreenLayout: mocks.loadScreenLayout }))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => {
    if (!mocks.admin) throw new Error('admin mock not set')
    return mocks.admin
  },
}))

import PrincipalOverviewPage from './page'

const scorecard: PilotEvidenceScorecard = {
  windowStart: '2026-08-01',
  windowEnd: '2026-08-07',
  feedbackWindowStart: '2026-07-09',
  baseline: { state: 'complete' },
  activeTeachers: { state: 'ready', active: 6, eligible: 8, percent: 75 },
  activeLinkedParents: { state: 'ready', active: 15, eligible: 20, percent: 75 },
  attendanceActivity: { state: 'ready', primary: 4, secondary: 86 },
  gradeActivity: { state: 'ready', primary: 7, secondary: 112 },
  emailDelivery: { state: 'ready', delivered: 32, failed: 2, unsent: 3 },
  parentHelpfulness: { state: 'ready', helpful: 6, total: 8, percent: 75 },
  feedbackReceived: { state: 'ready', count: 5 },
}

const unavailableScorecard: PilotEvidenceScorecard = {
  ...scorecard,
  baseline: { state: 'unavailable', reason: 'Baseline source offline.' },
  activeTeachers: { state: 'unavailable', reason: 'Teacher source offline.' },
  activeLinkedParents: { state: 'unavailable', reason: 'Parent source offline.' },
  attendanceActivity: { state: 'unavailable', reason: 'Attendance source offline.' },
  gradeActivity: { state: 'unavailable', reason: 'Grade source offline.' },
  emailDelivery: { state: 'unavailable', reason: 'Email source offline.' },
  parentHelpfulness: { state: 'unavailable', reason: 'Helpfulness source offline.' },
  feedbackReceived: { state: 'unavailable', reason: 'Feedback source offline.' },
}

const signal = {
  level: 'steady' as const,
  score: 75,
  headline: 'School signal',
  summary: 'A summary',
  metrics: {
    pulseCareCount: 0,
    pulseStrongCount: 0,
    recentAbsences: 0,
    recentTardies: 0,
    studentsWithMissingWork: 0,
    studentsObserved: 0,
  },
  watchList: [],
  wins: [],
  generatedAt: '2026-08-07T12:00:00.000Z',
}

function authorized(role: 'principal' | 'admin' = 'principal') {
  return {
    schoolId: 'school-authorized',
    user: { id: 'user-authorized', email: 'leader@example.com' },
    profile: {
      id: 'user-authorized',
      school_id: 'school-authorized',
      role,
      full_name: 'School Leader',
      email: 'leader@example.com',
      phone: null,
    },
    supabase: {},
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('PrincipalOverviewPage pilot evidence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.admin = createMockAdmin({
      classes: () => ({ data: null, count: 2, error: null }),
      students: () => ({ data: null, count: 18, error: null }),
      announcements: () => ({ data: [], error: null }),
    })
    mocks.requirePrincipal.mockResolvedValue(authorized())
    mocks.loadBillingState.mockResolvedValue(defaultBillingState())
    mocks.loadSchoolBeaconSignal.mockResolvedValue(signal)
    mocks.loadPilotScorecard.mockResolvedValue(scorecard)
    mocks.loadScreenLayout.mockImplementation(
      async (_userId: string, _screenId: string, order: string[]) => ({ order, hidden: [] })
    )
  })

  it('starts school-scoped evidence and other independent work only after authorization', async () => {
    const authorization = deferred<ReturnType<typeof authorized>>()
    const billing = deferred<ReturnType<typeof defaultBillingState>>()
    const beaconSignal = deferred<typeof signal>()
    mocks.requirePrincipal.mockReturnValue(authorization.promise)
    mocks.loadBillingState.mockReturnValue(billing.promise)
    mocks.loadSchoolBeaconSignal.mockReturnValue(beaconSignal.promise)

    const pagePromise = PrincipalOverviewPage()

    expect(mocks.loadBillingState).not.toHaveBeenCalled()
    expect(mocks.loadSchoolBeaconSignal).not.toHaveBeenCalled()
    expect(mocks.loadPilotScorecard).not.toHaveBeenCalled()

    authorization.resolve(authorized())

    try {
      await vi.waitFor(() => {
        expect(mocks.loadBillingState).toHaveBeenCalledWith('school-authorized')
        expect(mocks.loadSchoolBeaconSignal).toHaveBeenCalledWith('school-authorized')
        expect(mocks.loadPilotScorecard).toHaveBeenCalledWith('school-authorized')
        expect(mocks.loadScreenLayout).toHaveBeenCalledTimes(1)
      })
    } finally {
      billing.resolve(defaultBillingState())
      beaconSignal.resolve(signal)
    }

    await expect(pagePromise).resolves.toBeTruthy()
  })

  it('places pilot evidence after Beacon Signal in the principal default layout', async () => {
    await PrincipalOverviewPage()

    expect(mocks.loadScreenLayout).toHaveBeenCalledWith('user-authorized', 'principal_overview', [
      'beacon_signal',
      'pilot_evidence',
      'stats',
      'quickbooks',
      'announcements',
      'shortcuts',
    ])
  })

  it('places pilot evidence after Beacon Signal in the office-admin default layout', async () => {
    mocks.requirePrincipal.mockResolvedValue(authorized('admin'))

    await PrincipalOverviewPage()

    expect(mocks.loadScreenLayout).toHaveBeenCalledWith('user-authorized', 'principal_overview', [
      'daily_tasks',
      'beacon_signal',
      'pilot_evidence',
      'stats',
      'quickbooks',
      'announcements',
      'shortcuts',
    ])
  })

  it('keeps the principal overview rendered when every evidence source is unavailable', async () => {
    mocks.loadPilotScorecard.mockResolvedValue(unavailableScorecard)

    const page = (await PrincipalOverviewPage()) as ReactElement<{ children: ReactNode }>
    const sections = Children.toArray(page.props.children) as ReactElement<{
      id?: string
      children?: ReactElement
    }>[]
    const pilotSection = sections.find((section) => section.props.id === 'pilot_evidence')
    const html = renderToStaticMarkup(pilotSection?.props.children ?? <></>)

    expect(pilotSection).toBeTruthy()
    expect(html).toContain('Pilot evidence')
    expect(html).toContain('Baseline temporarily unavailable')
    expect(html.match(/Temporarily unavailable/g)).toHaveLength(7)
    expect(html).not.toContain('0%')
  })
})
