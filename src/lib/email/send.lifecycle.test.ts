import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  deliverWithCascade: vi.fn(),
  reportError: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.createAdminClient }))
vi.mock('@/lib/email/transport', () => ({
  deliverWithCascade: mocks.deliverWithCascade,
  describeEmailStack: vi.fn(),
  isEmailLive: vi.fn(() => false),
}))
vi.mock('@/lib/ops/report-error', () => ({ reportError: mocks.reportError }))

import { listEmailOutbox, queueAndSendEmail } from './send'

const email = {
  school_id: '11111111-1111-4111-8111-111111111111',
  sender_id: '22222222-2222-4222-8222-222222222222',
  attempt_key: '33333333-3333-4333-8333-333333333333',
  kind: 'message' as const,
  to_email: 'Parent@School.test',
  to_name: 'Pat Parent',
  subject: 'Hello',
  body_text: 'Private message',
}

function thenable(value: unknown) {
  const chain: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'ilike', 'order', 'limit', 'update']) {
    chain[method] = vi.fn(() => chain)
  }
  chain.insert = vi.fn(() => chain)
  chain.maybeSingle = vi.fn(async () => value)
  chain.then = (resolve: (result: unknown) => unknown) => Promise.resolve(value).then(resolve)
  return chain
}

describe('durable email delivery lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.deliverWithCascade.mockResolvedValue({
      status: 'sent',
      provider: 'test',
      providerId: 'provider-1',
      attempts: [{ provider: 'test', status: 'sent' }],
    })
  })

  it('persists a queued sender-owned claim before transport and finalizes that row afterward', async () => {
    const events: string[] = []
    const insert = thenable({ data: { id: 'row-1', status: 'queued' }, error: null })
    ;(insert.insert as ReturnType<typeof vi.fn>).mockImplementation((row) => {
      events.push(`insert:${row.status}`)
      return insert
    })
    const update = thenable({ data: { id: 'row-1', status: 'sent' }, error: null })
    ;(update.update as ReturnType<typeof vi.fn>).mockImplementation((row) => {
      events.push(`update:${row.status}`)
      return update
    })
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn(() => (events.includes('insert:queued') ? update : insert)),
    })
    mocks.deliverWithCascade.mockImplementation(async () => {
      events.push('transport')
      return { status: 'sent', provider: 'test', providerId: 'provider-1', attempts: [] }
    })

    const result = await queueAndSendEmail(email)

    expect(events).toEqual(['insert:queued', 'transport', 'update:sent'])
    expect(insert.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'queued',
        sender_id: email.sender_id,
        attempt_key: email.attempt_key,
        to_email: 'parent@school.test',
      })
    )
    expect(result).toMatchObject({ id: 'row-1', status: 'sent' })
  })

  it('fails closed without transport when the queued row cannot be persisted', async () => {
    const insert = thenable({ data: null, error: { code: '42501', message: 'private db error' } })
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => insert) })

    await expect(queueAndSendEmail(email)).resolves.toMatchObject({
      status: 'failed',
      error: 'Unable to queue email delivery.',
    })
    expect(mocks.deliverWithCascade).not.toHaveBeenCalled()
    expect(JSON.stringify(mocks.reportError.mock.calls)).not.toContain(email.to_email)
    expect(JSON.stringify(mocks.reportError.mock.calls)).not.toContain(email.body_text)
  })

  it('replays a duplicate recipient claim without invoking transport again', async () => {
    const insert = thenable({ data: null, error: { code: '23505', message: 'duplicate' } })
    const prior = thenable({
      data: { id: 'row-prior', status: 'sent', provider: 'test', error: null, sent_at: '2026-08-07T00:00:00Z' },
      error: null,
    })
    let calls = 0
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => (++calls === 1 ? insert : prior)) })

    await expect(queueAndSendEmail(email)).resolves.toMatchObject({
      id: 'row-prior',
      status: 'sent',
      replayed: true,
    })
    expect(mocks.deliverWithCascade).not.toHaveBeenCalled()
  })

  it('keeps a queued replay in progress across repeated claims without transport', async () => {
    const insert = thenable({ data: null, error: { code: '23505', message: 'duplicate' } })
    const prior = thenable({
      data: { id: 'row-prior', status: 'queued', provider: null, error: null, sent_at: null },
      error: null,
    })
    let calls = 0
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn(() => (++calls % 2 === 1 ? insert : prior)),
    })

    const first = await queueAndSendEmail(email)
    const second = await queueAndSendEmail(email)

    expect(first).toMatchObject({ id: 'row-prior', status: 'queued', replayed: true })
    expect(second).toMatchObject({ id: 'row-prior', status: 'queued', replayed: true })
    expect(first.attemptCompleted).toBeUndefined()
    expect(second.attemptCompleted).toBeUndefined()
    expect(mocks.deliverWithCascade).not.toHaveBeenCalled()
  })

  it('keeps truthful delivery status and adds a calm note when final bookkeeping fails', async () => {
    const insert = thenable({ data: { id: 'row-1', status: 'queued' }, error: null })
    const update = thenable({ data: null, error: { message: 'private update failure' } })
    let calls = 0
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => (++calls === 1 ? insert : update)) })

    await expect(queueAndSendEmail(email)).resolves.toMatchObject({
      id: 'row-1',
      status: 'sent',
      note: 'Delivery completed. Outbox status may be delayed.',
    })
    expect(mocks.deliverWithCascade).toHaveBeenCalledTimes(1)
  })

  it('distinguishes a completed failed transport from a pre-transport queue failure', async () => {
    const insert = thenable({ data: { id: 'row-1', status: 'queued' }, error: null })
    const update = thenable({ data: { id: 'row-1', status: 'failed' }, error: null })
    let calls = 0
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => (++calls === 1 ? insert : update)) })
    mocks.deliverWithCascade.mockResolvedValueOnce({
      status: 'failed', provider: 'test', error: 'private provider failure', attempts: [],
    })

    await expect(queueAndSendEmail(email)).resolves.toMatchObject({
      status: 'failed', attemptCompleted: true, error: 'Email delivery failed.',
    })

    const queueFailure = thenable({ data: null, error: { code: '42501', message: 'private db error' } })
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => queueFailure) })
    const result = await queueAndSendEmail({ ...email, attempt_key: '44444444-4444-4444-8444-444444444444' })
    expect(result.status).toBe('failed')
    expect(result.attemptCompleted).toBeUndefined()
  })

  it('applies sender ownership to service-role outbox reads', async () => {
    const query = thenable({ data: [], error: null })
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => query) })

    await listEmailOutbox(email.school_id, 100, { senderId: email.sender_id })

    expect(query.eq).toHaveBeenCalledWith('school_id', email.school_id)
    expect(query.eq).toHaveBeenCalledWith('sender_id', email.sender_id)
  })

  it('fails closed instead of using unowned legacy audit fallback for a teacher read', async () => {
    const query = thenable({ data: null, error: { message: 'outbox unavailable' } })
    const from = vi.fn(() => query)
    mocks.createAdminClient.mockReturnValue({ from })

    await expect(
      listEmailOutbox(email.school_id, 100, { senderId: email.sender_id })
    ).resolves.toEqual([])
    expect(from).toHaveBeenCalledTimes(1)
  })
})
