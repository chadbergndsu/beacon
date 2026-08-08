import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  user: { id: '22222222-2222-4222-8222-222222222222' } as { id: string } | null,
  profile: {
    id: '22222222-2222-4222-8222-222222222222',
    school_id: '11111111-1111-4111-8111-111111111111',
    role: 'teacher',
    full_name: 'Terry Teacher',
    email: 'teacher@school.test',
  },
  row: null as Record<string, unknown> | null,
  filters: [] as Array<[string, unknown]>,
  resendOutboxRow: vi.fn(),
  queueAndSendBatch: vi.fn(),
  resolveAnnouncementRecipients: vi.fn(),
  revalidatePath: vi.fn(),
}))

function query(result: () => Record<string, unknown> | null = () => mocks.row) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.insert = vi.fn(() => chain)
  chain.eq = vi.fn((column: string, value: unknown) => {
    mocks.filters.push([column, value])
    return chain
  })
  chain.maybeSingle = vi.fn(async () => ({ data: result(), error: null }))
  return chain
}

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: vi.fn(async () => ({ data: { user: mocks.user } })) } })),
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => table === 'profiles' ? query(() => mocks.profile) : query()),
  })),
}))
vi.mock('@/lib/email/send', () => ({
  queueAndSendBatch: mocks.queueAndSendBatch,
  queueAndSendEmail: vi.fn(),
  resendOutboxRow: mocks.resendOutboxRow,
}))
vi.mock('@/lib/email/recipients', () => ({ previewRecipients: vi.fn(), resolveAnnouncementRecipients: mocks.resolveAnnouncementRecipients }))
vi.mock('@/lib/email/templates', () => ({
  appBaseUrl: vi.fn(() => 'http://beacon.test'),
  familyMessageBodies: vi.fn(() => ({ text: 'body', html: '<p>body</p>' })),
  brandedEmailShell: vi.fn(), escapeHtml: vi.fn(), plainFooter: vi.fn(), subjectTag: vi.fn(() => 'School'),
}))
vi.mock('@/lib/email/digest-email', () => ({ emailDinnerDigestForStudent: vi.fn() }))
vi.mock('@/lib/gradebook-data', () => ({ canAccessClass: vi.fn(), teacherCanViewStudent: vi.fn() }))
vi.mock('@/lib/email/digest-access', () => ({ mayEmailStudentDinnerDigest: vi.fn() }))
vi.mock('@/lib/school-brand', () => ({ loadSchoolBrand: vi.fn(async () => ({ name: 'School' })) }))
vi.mock('@/lib/roles', () => ({
  isSchoolStaff: vi.fn(() => true),
  canSendSystemEmail: vi.fn((role: string) => role !== 'teacher'),
}))

import { composeFamilyMessage, resendFailedEmail } from './communications'

const attemptKey = '55555555-5555-4555-8555-555555555555'

describe('sender-owned outbox retry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.filters.length = 0
    mocks.profile.role = 'teacher'
    mocks.row = {
      id: 'row-1', school_id: mocks.profile.school_id, sender_id: mocks.profile.id,
      status: 'failed', meta: {}, kind: 'message', to_email: 'private@school.test',
      subject: 'Private', body_text: 'Private body',
    }
    mocks.resendOutboxRow.mockResolvedValue({ id: 'retry-1', status: 'sent' })
    mocks.queueAndSendBatch.mockResolvedValue({ sent: 1, failed: 0, skipped: 0, total: 1 })
    mocks.resolveAnnouncementRecipients.mockResolvedValue([
      { email: 'parent@school.test', name: 'Parent', role: 'parent' },
    ])
  })

  it('binds a teacher retry lookup to school and originating sender', async () => {
    await expect(resendFailedEmail('row-1', attemptKey)).resolves.toMatchObject({ ok: true })
    expect(mocks.filters).toEqual(expect.arrayContaining([
      ['id', 'row-1'], ['school_id', mocks.profile.school_id], ['sender_id', mocks.profile.id],
    ]))
    expect(mocks.resendOutboxRow).toHaveBeenCalledWith(
      expect.objectContaining({ sender_id: mocks.profile.id }),
      expect.anything(),
      attemptKey
    )
  })

  it('fails closed for a forged or non-owned row', async () => {
    mocks.row = null
    await expect(resendFailedEmail('forged', attemptKey)).resolves.toEqual({
      ok: false, error: 'Outbox row not found.',
    })
    expect(mocks.resendOutboxRow).not.toHaveBeenCalled()
  })

  it('tags every Groups manual compose row with the verified sender', async () => {
    await expect(composeFamilyMessage({
      subject: 'Faculty update', body: 'Private update', audience: 'teachers', class_id: null,
    })).resolves.toMatchObject({ ok: true })
    expect(mocks.queueAndSendBatch).toHaveBeenCalledWith([
      expect.objectContaining({ sender_id: mocks.profile.id, to_email: 'parent@school.test' }),
    ], expect.anything())
  })
})
