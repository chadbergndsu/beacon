import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  profile: null as {
    id: string
    school_id: string | null
    role: string
    full_name: string | null
  } | null,
  getUser: vi.fn(),
  searchPeopleDirectory: vi.fn(),
  resolvePeopleDirectory: vi.fn(),
  queueAndSendBatch: vi.fn(),
  familyMessageBodies: vi.fn(),
  loadSchoolBrand: vi.fn(),
  subjectTag: vi.fn(),
  appBaseUrl: vi.fn(),
  auditInsert: vi.fn(),
  reportError: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'audit_logs') return { insert: mocks.auditInsert }
      if (table !== 'profiles') throw new Error(`Unexpected table: ${table}`)
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        maybeSingle: vi.fn(async () => ({ data: mocks.profile, error: null })),
      }
      return query
    },
  }),
}))
vi.mock('@/lib/email/people-directory', () => ({
  searchPeopleDirectory: mocks.searchPeopleDirectory,
  resolvePeopleDirectory: mocks.resolvePeopleDirectory,
}))
vi.mock('@/lib/email/send', () => ({ queueAndSendBatch: mocks.queueAndSendBatch }))
vi.mock('@/lib/email/templates', () => ({
  familyMessageBodies: mocks.familyMessageBodies,
  subjectTag: mocks.subjectTag,
  appBaseUrl: mocks.appBaseUrl,
}))
vi.mock('@/lib/school-brand', () => ({ loadSchoolBrand: mocks.loadSchoolBrand }))
vi.mock('@/lib/ops/report-error', () => ({ reportError: mocks.reportError }))

import {
  previewPeopleRecipients,
  searchPeopleRecipients,
  sendPeopleMessage,
} from './people-messaging'

const teacherId = '11111111-1111-4111-8111-111111111111'
const parentId = '22222222-2222-4222-8222-222222222222'
const schoolId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const studentId = '33333333-3333-4333-8333-333333333333'
const profileId = '44444444-4444-4444-8444-444444444444'

const validInput = {
  refs: [{ kind: 'student', id: studentId }],
  subject: 'Field trip reminder',
  body: 'Please return the form Friday.',
}

const emptyPreview = {
  selectedCount: 0,
  recipientCount: 0,
  selections: [],
  unavailableCount: 0,
}

function makeDeliveries(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    email: `parent${index}@school.test`,
    name: `Parent ${index}`,
    role: 'parent',
    sourceKeys: [`student:${studentId}`],
  }))
}

describe('People messaging actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.profile = {
      id: teacherId,
      school_id: schoolId,
      role: 'teacher',
      full_name: 'Taylor Teacher',
    }
    mocks.getUser.mockResolvedValue({
      data: { user: { id: teacherId } },
      error: null,
    })
    mocks.searchPeopleDirectory.mockResolvedValue([])
    mocks.resolvePeopleDirectory.mockResolvedValue({
      preview: {
        selectedCount: 1,
        recipientCount: 1,
        selections: [],
        unavailableCount: 0,
      },
      deliveries: [
        {
          email: 'parent@school.test',
          name: 'Parent',
          role: 'parent',
          sourceKeys: [`student:${studentId}`],
        },
      ],
      rejectedKeys: [],
    })
    mocks.queueAndSendBatch.mockResolvedValue({
      sent: 1,
      failed: 0,
      skipped: 0,
      total: 1,
    })
    mocks.familyMessageBodies.mockReturnValue({
      text: 'Rendered text',
      html: '<p>Rendered HTML</p>',
    })
    mocks.loadSchoolBrand.mockResolvedValue({
      schoolId,
      name: 'Beacon School',
      shortName: 'Beacon',
      tagline: 'Learn together',
      websiteUrl: null,
      email: null,
      phone: null,
      city: null,
      state: null,
      mission: null,
      gradesServed: null,
      curriculumNote: null,
      logoLetter: 'B',
    })
    mocks.subjectTag.mockReturnValue('Beacon')
    mocks.appBaseUrl.mockReturnValue('https://beacon.test')
    mocks.auditInsert.mockResolvedValue({ data: null, error: null })
    mocks.revalidatePath.mockImplementation(() => undefined)
  })

  it('rejects an absent user before directory access', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })

    await expect(
      searchPeopleRecipients({ query: 'Ava', recent_refs: [] })
    ).resolves.toEqual({ ok: false, error: 'Not signed in.' })
    expect(mocks.searchPeopleDirectory).not.toHaveBeenCalled()
  })

  it('rejects parents before directory access', async () => {
    mocks.profile = { id: parentId, school_id: schoolId, role: 'parent', full_name: 'Pat Parent' }

    await expect(
      searchPeopleRecipients({ query: 'Ava', recent_refs: [] })
    ).resolves.toEqual({
      ok: false,
      error: 'Only faculty can use People messaging.',
    })
    expect(mocks.searchPeopleDirectory).not.toHaveBeenCalled()
  })

  it('fails closed when the verified faculty profile has no school', async () => {
    mocks.profile = { id: teacherId, school_id: null, role: 'teacher', full_name: 'Taylor' }

    await expect(
      searchPeopleRecipients({ query: 'Ava', recent_refs: [] })
    ).resolves.toEqual({
      ok: false,
      error: 'Profile or school not set up.',
    })
    expect(mocks.searchPeopleDirectory).not.toHaveBeenCalled()
  })

  it('passes only the verified sender identity and normalized query into search', async () => {
    await searchPeopleRecipients({ query: '  Ava   Reed ', recent_refs: [] })

    expect(mocks.searchPeopleDirectory).toHaveBeenCalledWith(
      { id: teacherId, schoolId, role: 'teacher' },
      'Ava Reed',
      []
    )
  })

  it('does not access the directory for a one-character search', async () => {
    await expect(
      searchPeopleRecipients({ query: ' A ', recent_refs: [] })
    ).resolves.toEqual({ ok: true, results: [] })
    expect(mocks.searchPeopleDirectory).not.toHaveBeenCalled()
  })

  it('limits recent references to eight before directory access', async () => {
    const recentRefs = Array.from({ length: 9 }, (_, index) => ({
      kind: 'profile' as const,
      id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    }))

    await searchPeopleRecipients({ query: '', recent_refs: recentRefs })

    expect(mocks.searchPeopleDirectory).toHaveBeenCalledWith(
      { id: teacherId, schoolId, role: 'teacher' },
      '',
      recentRefs.slice(0, 8)
    )
  })

  it('returns a stable search error and reports no search terms or names', async () => {
    mocks.searchPeopleDirectory.mockRejectedValue(new Error('Ava secret database failure'))

    await expect(
      searchPeopleRecipients({ query: 'Ava', recent_refs: [] })
    ).resolves.toEqual({ ok: false, error: 'Unable to search People right now.' })
    expect(mocks.reportError).toHaveBeenCalledWith(expect.any(Error), {
      surface: 'people_messaging',
      operation: 'search',
    })
    expect(JSON.stringify(mocks.reportError.mock.calls)).not.toContain('Ava')
  })

  it('rejects malformed references before preview directory access', async () => {
    await expect(
      previewPeopleRecipients({ refs: [{ kind: 'profile', id: 'not-a-uuid' }] })
    ).resolves.toEqual({ ok: false, error: 'One or more recipients is invalid.' })
    expect(mocks.resolvePeopleDirectory).not.toHaveBeenCalled()
  })

  it('rejects more than 50 references before preview directory access', async () => {
    const refs = Array.from({ length: 51 }, (_, index) => ({
      kind: 'student' as const,
      id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    }))

    await expect(previewPeopleRecipients({ refs })).resolves.toEqual({
      ok: false,
      error: 'Choose no more than 50 recipients.',
    })
    expect(mocks.resolvePeopleDirectory).not.toHaveBeenCalled()
  })

  it('returns the empty public preview without directory access', async () => {
    await expect(previewPeopleRecipients({ refs: [] })).resolves.toEqual({
      ok: true,
      preview: emptyPreview,
    })
    expect(mocks.resolvePeopleDirectory).not.toHaveBeenCalled()
  })

  it('returns only the public preview from the verified directory resolution', async () => {
    const preview = {
      selectedCount: 1,
      recipientCount: 1,
      selections: [],
      unavailableCount: 0,
    }

    await expect(previewPeopleRecipients({ refs: validInput.refs })).resolves.toEqual({
      ok: true,
      preview,
    })
    expect(mocks.resolvePeopleDirectory).toHaveBeenCalledWith(
      { id: teacherId, schoolId, role: 'teacher' },
      validInput.refs
    )
  })

  it('returns a stable preview error and reports no recipient details', async () => {
    mocks.resolvePeopleDirectory.mockRejectedValue(new Error('Parent secret database failure'))

    await expect(previewPeopleRecipients({ refs: validInput.refs })).resolves.toEqual({
      ok: false,
      error: 'Unable to preview recipients right now.',
    })
    expect(mocks.reportError).toHaveBeenCalledWith(expect.any(Error), {
      surface: 'people_messaging',
      operation: 'preview',
    })
    expect(JSON.stringify(mocks.reportError.mock.calls)).not.toContain('Parent')
  })

  it('fails the whole send when any reference is rejected at send time', async () => {
    mocks.resolvePeopleDirectory.mockResolvedValue({
      preview: { selectedCount: 2, recipientCount: 1, selections: [], unavailableCount: 0 },
      deliveries: [
        { email: 'parent@school.test', name: 'Parent', role: 'parent', sourceKeys: [] },
      ],
      rejectedKeys: [`profile:${parentId}`],
    })

    const result = await sendPeopleMessage(validInput)

    expect(result).toEqual({
      ok: false,
      error: 'One or more recipients is no longer available.',
    })
    expect(mocks.queueAndSendBatch).not.toHaveBeenCalled()
  })

  it.each([
    { subject: '', body: validInput.body },
    { subject: validInput.subject, body: '   ' },
  ])('rejects a send missing its subject or body', async ({ subject, body }) => {
    await expect(sendPeopleMessage({ ...validInput, subject, body })).resolves.toEqual({
      ok: false,
      error: 'Subject and message are required.',
    })
    expect(mocks.resolvePeopleDirectory).not.toHaveBeenCalled()
  })

  it('rejects a subject over 200 characters', async () => {
    await expect(
      sendPeopleMessage({ ...validInput, subject: 'S'.repeat(201) })
    ).resolves.toEqual({ ok: false, error: 'Subject is too long.' })
    expect(mocks.resolvePeopleDirectory).not.toHaveBeenCalled()
  })

  it('rejects a body over 20,000 characters', async () => {
    await expect(
      sendPeopleMessage({ ...validInput, body: 'B'.repeat(20_001) })
    ).resolves.toEqual({ ok: false, error: 'Message is too long.' })
    expect(mocks.resolvePeopleDirectory).not.toHaveBeenCalled()
  })

  it('rejects a send with no selected recipient', async () => {
    await expect(sendPeopleMessage({ ...validInput, refs: [] })).resolves.toEqual({
      ok: false,
      error: 'Choose at least one recipient.',
    })
    expect(mocks.resolvePeopleDirectory).not.toHaveBeenCalled()
  })

  it('rejects more than 100 resolved deliveries before email creation', async () => {
    const deliveries = makeDeliveries(101)
    mocks.resolvePeopleDirectory.mockResolvedValue({
      preview: {
        selectedCount: 1,
        recipientCount: deliveries.length,
        selections: [],
        unavailableCount: 0,
      },
      deliveries,
      rejectedKeys: [],
    })

    await expect(sendPeopleMessage(validInput)).resolves.toEqual({
      ok: false,
      error: 'Use Groups or Announcements for more than 100 recipients.',
    })
    expect(mocks.queueAndSendBatch).not.toHaveBeenCalled()
  })

  it('rejects a selection with no usable resolved email address', async () => {
    mocks.resolvePeopleDirectory.mockResolvedValue({
      preview: {
        selectedCount: 1,
        recipientCount: 0,
        selections: [],
        unavailableCount: 1,
      },
      deliveries: [],
      rejectedKeys: [],
    })

    await expect(sendPeopleMessage(validInput)).resolves.toEqual({
      ok: false,
      error: 'No selected recipient has a usable email address.',
    })
    expect(mocks.queueAndSendBatch).not.toHaveBeenCalled()
  })

  it('queues one branded email per unique recipient and audits counts only', async () => {
    const result = await sendPeopleMessage(validInput)

    expect(mocks.queueAndSendBatch).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'message', to_email: 'parent@school.test' }),
      ]),
      expect.objectContaining({ brand: expect.any(Object) })
    )
    expect(mocks.auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'comms.people',
        details: expect.objectContaining({ mode: 'people', selected: 1, recipients: 1 }),
      })
    )
    expect(JSON.stringify(mocks.auditInsert.mock.calls)).not.toContain('parent@school.test')
    expect(JSON.stringify(mocks.auditInsert.mock.calls)).not.toContain(validInput.body)
    expect(JSON.stringify(mocks.auditInsert.mock.calls)).not.toContain(studentId)
    expect(result).toEqual({ ok: true, sent: 1, failed: 0, skipped: 0 })
  })

  it('creates a separate outbound email for every resolved recipient', async () => {
    const deliveries = makeDeliveries(2)
    mocks.resolvePeopleDirectory.mockResolvedValue({
      preview: {
        selectedCount: 1,
        recipientCount: 2,
        selections: [],
        unavailableCount: 0,
      },
      deliveries,
      rejectedKeys: [],
    })
    mocks.queueAndSendBatch.mockResolvedValue({
      sent: 2,
      failed: 0,
      skipped: 0,
      total: 2,
    })

    await sendPeopleMessage(validInput)

    const emails = mocks.queueAndSendBatch.mock.calls[0]?.[0]
    expect(emails).toHaveLength(2)
    expect(emails.map((email: { to_email: string }) => email.to_email)).toEqual([
      'parent0@school.test',
      'parent1@school.test',
    ])
  })

  it('returns and audits partial and log-only delivery counts', async () => {
    const deliveries = makeDeliveries(3)
    mocks.resolvePeopleDirectory.mockResolvedValue({
      preview: {
        selectedCount: 1,
        recipientCount: 3,
        selections: [],
        unavailableCount: 0,
      },
      deliveries,
      rejectedKeys: [],
    })
    mocks.queueAndSendBatch.mockResolvedValue({
      sent: 1,
      failed: 1,
      skipped: 1,
      total: 3,
      note: 'Emails logged only.',
    })

    await expect(sendPeopleMessage(validInput)).resolves.toEqual({
      ok: true,
      sent: 1,
      failed: 1,
      skipped: 1,
      note: 'Emails logged only.',
    })
    expect(mocks.auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        details: {
          mode: 'people',
          selected: 1,
          recipients: 3,
          sent: 1,
          failed: 1,
          skipped: 1,
        },
      })
    )
  })

  it('preserves delivery counts and reports safely when audit insert resolves with an error', async () => {
    mocks.auditInsert.mockResolvedValue({
      data: null,
      error: { message: 'private audit database error' },
    })

    await expect(sendPeopleMessage(validInput)).resolves.toEqual({
      ok: true,
      sent: 1,
      failed: 0,
      skipped: 0,
      note: 'Delivery completed. Activity history may be incomplete.',
    })
    expect(mocks.queueAndSendBatch).toHaveBeenCalledTimes(1)
    expect(mocks.reportError).toHaveBeenCalledWith(expect.any(Error), {
      surface: 'people_messaging',
      operation: 'audit',
      schoolId,
      userId: teacherId,
      selected: 1,
      recipients: 1,
      sent: 1,
      failed: 0,
      skipped: 0,
    })
    const reported = JSON.stringify(mocks.reportError.mock.calls)
    expect(reported).not.toContain(validInput.subject)
    expect(reported).not.toContain(validInput.body)
    expect(reported).not.toContain('parent@school.test')
    expect(reported).not.toContain('Parent')
    expect(reported).not.toContain(studentId)
  })

  it('preserves delivery counts when audit insert rejects', async () => {
    mocks.auditInsert.mockRejectedValue(new Error('private audit rejection'))

    await expect(sendPeopleMessage(validInput)).resolves.toEqual({
      ok: true,
      sent: 1,
      failed: 0,
      skipped: 0,
      note: 'Delivery completed. Activity history may be incomplete.',
    })
    expect(mocks.queueAndSendBatch).toHaveBeenCalledTimes(1)
    expect(mocks.reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ operation: 'audit' })
    )
  })

  it('preserves delivery counts when path revalidation throws', async () => {
    mocks.revalidatePath.mockImplementation(() => {
      throw new Error('private revalidation failure')
    })

    await expect(sendPeopleMessage(validInput)).resolves.toEqual({
      ok: true,
      sent: 1,
      failed: 0,
      skipped: 0,
    })
    expect(mocks.queueAndSendBatch).toHaveBeenCalledTimes(1)
    expect(mocks.reportError).toHaveBeenCalledWith(expect.any(Error), {
      surface: 'people_messaging',
      operation: 'revalidate',
      schoolId,
      userId: teacherId,
      selected: 1,
      recipients: 1,
      sent: 1,
      failed: 0,
      skipped: 0,
    })
  })

  it('combines the transport and audit notes without changing partial delivery counts', async () => {
    const deliveries = makeDeliveries(3)
    mocks.resolvePeopleDirectory.mockResolvedValue({
      preview: {
        selectedCount: 1,
        recipientCount: 3,
        selections: [],
        unavailableCount: 0,
      },
      deliveries,
      rejectedKeys: [],
    })
    mocks.queueAndSendBatch.mockResolvedValue({
      sent: 1,
      failed: 1,
      skipped: 1,
      total: 3,
      note: 'Emails logged only.',
    })
    mocks.auditInsert.mockResolvedValue({
      data: null,
      error: { message: 'private audit database error' },
    })

    await expect(sendPeopleMessage(validInput)).resolves.toEqual({
      ok: true,
      sent: 1,
      failed: 1,
      skipped: 1,
      note: 'Emails logged only. Delivery completed. Activity history may be incomplete.',
    })
    expect(mocks.queueAndSendBatch).toHaveBeenCalledTimes(1)
  })

  it('returns a stable send error without reporting message or recipient details', async () => {
    mocks.queueAndSendBatch.mockRejectedValue(new Error('Parent body secret failure'))

    await expect(sendPeopleMessage(validInput)).resolves.toEqual({
      ok: false,
      error: 'Unable to send message right now.',
    })
    expect(mocks.reportError).toHaveBeenCalledWith(expect.any(Error), {
      surface: 'people_messaging',
      operation: 'send',
    })
    expect(JSON.stringify(mocks.reportError.mock.calls)).not.toContain(validInput.body)
    expect(JSON.stringify(mocks.reportError.mock.calls)).not.toContain('parent@school.test')
  })

  it('rejects malformed send references before delivery resolution', async () => {
    await expect(
      sendPeopleMessage({ ...validInput, refs: [{ kind: 'student', id: profileId.slice(1) }] })
    ).resolves.toEqual({ ok: false, error: 'One or more recipients is invalid.' })
    expect(mocks.resolvePeopleDirectory).not.toHaveBeenCalled()
  })
})
