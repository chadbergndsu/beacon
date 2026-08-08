/** @vitest-environment jsdom */

import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PeopleSearchResult } from '@/lib/email/people-types'

const mocks = vi.hoisted(() => ({
  searchPeopleRecipients: vi.fn(),
  previewPeopleRecipients: vi.fn(),
  sendPeopleMessage: vi.fn(),
}))

vi.mock('@/app/actions/people-messaging', () => ({
  searchPeopleRecipients: mocks.searchPeopleRecipients,
  previewPeopleRecipients: mocks.previewPeopleRecipients,
  sendPeopleMessage: mocks.sendPeopleMessage,
}))

import { PeopleMessageForm } from './PeopleMessageForm'

const avaStudent: PeopleSearchResult = {
  key: 'student:33333333-3333-4333-8333-333333333333',
  ref: { kind: 'student', id: '33333333-3333-4333-8333-333333333333' },
  group: 'Students',
  label: 'Ava Reed',
  context: 'Grade 4 · sends to 2 linked parents',
  recipientCount: 2,
  disabledReason: null,
}

const blairFaculty: PeopleSearchResult = {
  key: 'profile:44444444-4444-4444-8444-444444444444',
  ref: { kind: 'profile', id: '44444444-4444-4444-8444-444444444444' },
  group: 'Faculty',
  label: 'Blair Faculty',
  context: 'Teacher',
  recipientCount: 1,
  disabledReason: null,
}

const avaPreview = {
  selectedCount: 1,
  recipientCount: 2,
  unavailableCount: 0,
  selections: [{ ...avaStudent, recipientNames: ['Pat Parent', 'Chris Parent'] }],
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((finish) => {
    resolve = finish
  })
  return { promise, resolve }
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

async function chooseResult(user: ReturnType<typeof userEvent.setup>, result: PeopleSearchResult) {
  mocks.searchPeopleRecipients.mockResolvedValueOnce({ ok: true, results: [result] })
  await user.type(screen.getByRole('combobox', { name: 'To' }), result.label.slice(0, 2))
  await advance(250)
  await user.keyboard('{ArrowDown}{Enter}')
}

async function selectAvaAndPreview(user: ReturnType<typeof userEvent.setup>) {
  mocks.previewPeopleRecipients.mockResolvedValueOnce({ ok: true, preview: avaPreview })
  await chooseResult(user, avaStudent)
  await advance(150)
  expect(await screen.findByText('2 unique email recipients')).toBeTruthy()
}

async function fillValidPeopleMessage(user: ReturnType<typeof userEvent.setup>) {
  await selectAvaAndPreview(user)
  await user.type(screen.getByLabelText('Subject'), 'Field trip reminder')
  await user.type(screen.getByLabelText('Message'), 'Please return the form Friday.')
}

describe('PeopleMessageForm', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.clearAllMocks()
    window.localStorage.clear()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
    mocks.searchPeopleRecipients.mockResolvedValue({ ok: true, results: [] })
    mocks.previewPeopleRecipients.mockResolvedValue({
      ok: true,
      preview: { selectedCount: 0, recipientCount: 0, unavailableCount: 0, selections: [] },
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView
    vi.useRealTimers()
  })

  it('previews selected references and blocks send until server resolution is ready', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync })
    render(<PeopleMessageForm />)

    mocks.previewPeopleRecipients.mockResolvedValueOnce({ ok: true, preview: avaPreview })
    await chooseResult(user, avaStudent)
    expect((screen.getByRole('button', { name: 'Send message' }) as HTMLButtonElement).disabled).toBe(true)
    await advance(150)

    expect(await screen.findByText('2 unique email recipients')).toBeTruthy()
    expect(screen.getByText('Pat Parent and Chris Parent')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Send to 2 recipients' }) as HTMLButtonElement).disabled).toBe(true)
    await user.type(screen.getByLabelText('Subject'), 'Field trip reminder')
    await user.type(screen.getByLabelText('Message'), 'Please return the form Friday.')
    expect((screen.getByRole('button', { name: 'Send to 2 recipients' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('ignores a stale preview when selected references change', async () => {
    const older = deferred<{ ok: true; preview: typeof avaPreview }>()
    const newerPreview = {
      selectedCount: 2,
      recipientCount: 3,
      unavailableCount: 0,
      selections: [
        { ...avaStudent, recipientNames: ['Pat Parent', 'Chris Parent'] },
        { ...blairFaculty, recipientNames: ['Blair Faculty'] },
      ],
    }
    mocks.previewPeopleRecipients
      .mockReturnValueOnce(older.promise)
      .mockResolvedValueOnce({ ok: true, preview: newerPreview })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync })
    render(<PeopleMessageForm />)

    await chooseResult(user, avaStudent)
    await advance(150)
    await chooseResult(user, blairFaculty)
    await advance(150)
    expect(await screen.findByText('3 unique email recipients')).toBeTruthy()

    await act(async () => {
      older.resolve({ ok: true, preview: avaPreview })
    })
    expect(screen.getByText('3 unique email recipients')).toBeTruthy()
    expect(screen.queryByText(/^2 unique email recipients$/)).toBeNull()
  })

  it('explains unavailable selections and enforces reference and resolved-recipient limits', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync })
    render(<PeopleMessageForm />)
    expect(screen.getByText('Choose up to 50 people.')).toBeTruthy()

    mocks.previewPeopleRecipients.mockResolvedValueOnce({
      ok: true,
      preview: {
        selectedCount: 1,
        recipientCount: 0,
        unavailableCount: 1,
        selections: [
          {
            ...avaStudent,
            recipientCount: 0,
            disabledReason: 'No linked parent has a usable email address',
            recipientNames: [],
          },
        ],
      },
    })
    await chooseResult(user, avaStudent)
    await advance(150)
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Ava Reed: No linked parent has a usable email address'
    )
    expect((screen.getByRole('button', { name: 'Send message' }) as HTMLButtonElement).disabled).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Remove Ava Reed' }))
    mocks.previewPeopleRecipients.mockResolvedValueOnce({
      ok: true,
      preview: {
        selectedCount: 1,
        recipientCount: 101,
        unavailableCount: 0,
        selections: [{ ...blairFaculty, recipientCount: 101, recipientNames: ['101 people'] }],
      },
    })
    await chooseResult(user, blairFaculty)
    await advance(150)
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Use Groups or Announcements for more than 100 recipients.'
    )
    expect((screen.getByRole('button', { name: 'Send to 101 recipients' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('reports pending and partial delivery counts while preserving the draft', async () => {
    const delivery = deferred<{ ok: true; sent: number; failed: number; skipped: number }>()
    mocks.sendPeopleMessage.mockReturnValueOnce(delivery.promise)
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync })
    render(<PeopleMessageForm />)
    await fillValidPeopleMessage(user)

    await user.click(screen.getByRole('button', { name: 'Send to 2 recipients' }))
    expect(screen.getByText('Sending message…').getAttribute('role')).toBe('status')
    await act(async () => delivery.resolve({ ok: true, sent: 1, failed: 1, skipped: 0 }))

    expect((await screen.findByText('Sent 1 · 1 failed')).getAttribute('role')).toBe('status')
    expect((screen.getByLabelText('Subject') as HTMLInputElement).value).toBe('Field trip reminder')
    expect((screen.getByLabelText('Message') as HTMLTextAreaElement).value).toBe('Please return the form Friday.')
  })

  it('keeps delivered drafts for log-only and bookkeeping-note outcomes', async () => {
    mocks.sendPeopleMessage.mockResolvedValueOnce({
      ok: true,
      sent: 1,
      failed: 0,
      skipped: 1,
      note: 'Delivery completed. Activity history may be incomplete.',
    })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync })
    render(<PeopleMessageForm />)
    await fillValidPeopleMessage(user)
    await user.click(screen.getByRole('button', { name: 'Send to 2 recipients' }))

    expect(
      (
        await screen.findByText(
          'Sent 1 · 1 log-only · Delivery completed. Activity history may be incomplete.'
        )
      ).getAttribute('role')
    ).toBe('status')
    expect((screen.getByLabelText('Subject') as HTMLInputElement).value).toBe('Field trip reminder')
    expect((screen.getByRole('button', { name: 'Send to 2 recipients' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('uses a synchronous latch and one stable attempt key for an unchanged draft', async () => {
    const delivery = deferred<{ ok: true; sent: number; failed: number; skipped: number }>()
    mocks.sendPeopleMessage.mockReturnValue(delivery.promise)
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync })
    render(<PeopleMessageForm />)
    await fillValidPeopleMessage(user)
    const button = screen.getByRole('button', { name: 'Send to 2 recipients' })

    button.click()
    button.click()

    expect(mocks.sendPeopleMessage).toHaveBeenCalledTimes(1)
    const firstAttempt = mocks.sendPeopleMessage.mock.calls[0][0].attempt_key
    expect(firstAttempt).toMatch(/^[0-9a-f-]{36}$/i)
    await act(async () => delivery.resolve({ ok: true, sent: 1, failed: 1, skipped: 0 }))
    expect((button as HTMLButtonElement).disabled).toBe(true)

    await user.type(screen.getByLabelText('Message'), ' Changed')
    expect((button as HTMLButtonElement).disabled).toBe(false)
    await user.click(button)
    expect(mocks.sendPeopleMessage.mock.calls[1][0].attempt_key).not.toBe(firstAttempt)
  })

  it('shows a stable send-time reauthorization error and preserves the draft', async () => {
    mocks.sendPeopleMessage.mockResolvedValueOnce({
      ok: false,
      error: 'One or more recipients is no longer available.',
    })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync })
    render(<PeopleMessageForm />)
    await fillValidPeopleMessage(user)
    await user.click(screen.getByRole('button', { name: 'Send to 2 recipients' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'One or more recipients is no longer available.'
    )
    expect((screen.getByLabelText('Subject') as HTMLInputElement).value).toBe('Field trip reminder')
  })

  it('clears the form only after a complete success without a delivery note', async () => {
    mocks.sendPeopleMessage.mockResolvedValueOnce({ ok: true, sent: 2, failed: 0, skipped: 0 })
    const onDirtyChange = vi.fn()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync })
    render(<PeopleMessageForm onDirtyChange={onDirtyChange} />)
    await fillValidPeopleMessage(user)
    await user.click(screen.getByRole('button', { name: 'Send to 2 recipients' }))

    expect((await screen.findByText('Sent 2')).getAttribute('role')).toBe('status')
    await waitFor(() => expect((screen.getByLabelText('Subject') as HTMLInputElement).value).toBe(''))
    expect((screen.getByLabelText('Message') as HTMLTextAreaElement).value).toBe('')
    expect(screen.queryByRole('button', { name: 'Remove Ava Reed' })).toBeNull()
    expect(onDirtyChange).toHaveBeenLastCalledWith(false)
  })

  it('uses alerts for preview failures and keeps send unavailable', async () => {
    mocks.previewPeopleRecipients.mockResolvedValueOnce({
      ok: false,
      error: 'Unable to preview recipients right now.',
    })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync })
    render(<PeopleMessageForm />)
    await chooseResult(user, avaStudent)
    await advance(150)

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Unable to preview recipients right now.'
    )
    expect((screen.getByRole('button', { name: 'Send message' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('resolves previews after the Strict Mode effect lifecycle replay', async () => {
    mocks.previewPeopleRecipients.mockResolvedValueOnce({ ok: true, preview: avaPreview })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync })
    render(
      <StrictMode>
        <PeopleMessageForm />
      </StrictMode>
    )

    await chooseResult(user, avaStudent)
    await advance(150)

    expect(await screen.findByText('2 unique email recipients')).toBeTruthy()
  })
})
