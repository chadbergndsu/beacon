/** @vitest-environment jsdom */

import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PeopleSearchResult } from '@/lib/email/people-types'

const mocks = vi.hoisted(() => ({
  searchPeopleRecipients: vi.fn(),
}))

vi.mock('@/app/actions/people-messaging', () => ({
  searchPeopleRecipients: mocks.searchPeopleRecipients,
}))

import { PeopleRecipientCombobox } from './PeopleRecipientCombobox'

const avaStudent: PeopleSearchResult = {
  key: 'student:33333333-3333-4333-8333-333333333333',
  ref: { kind: 'student', id: '33333333-3333-4333-8333-333333333333' },
  group: 'Students',
  label: 'Ava Reed',
  context: 'Grade 4 · sends to 1 linked parent',
  recipientCount: 1,
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

const patParent: PeopleSearchResult = {
  key: 'profile:55555555-5555-4555-8555-555555555555',
  ref: { kind: 'profile', id: '55555555-5555-4555-8555-555555555555' },
  group: 'Parents',
  label: 'Pat Parent',
  context: 'Parent of Ava Reed',
  recipientCount: 0,
  disabledReason: 'No usable email address',
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((finish) => {
    resolve = finish
  })
  return { promise, resolve }
}

async function advanceDebounce() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(250)
  })
}

describe('PeopleRecipientCombobox', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.clearAllMocks()
    window.localStorage.clear()
    mocks.searchPeopleRecipients.mockResolvedValue({ ok: true, results: [] })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('searches after two characters and supports keyboard selection', async () => {
    mocks.searchPeopleRecipients.mockResolvedValue({ ok: true, results: [avaStudent] })
    const onChange = vi.fn()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync })
    render(<PeopleRecipientCombobox selected={[]} onChange={onChange} />)
    const input = screen.getByRole('combobox', { name: 'To' })

    await user.type(input, 'Av')
    await advanceDebounce()

    expect(mocks.searchPeopleRecipients).toHaveBeenCalledWith({ query: 'Av', recent_refs: [] })
    expect(screen.getByRole('option', { name: /ava reed/i })).toBeTruthy()
    await user.keyboard('{ArrowDown}')
    expect(input.getAttribute('aria-activedescendant')).toContain(avaStudent.key)
    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalledWith([avaStudent])
  })

  it('announces results, renders contextual chips, and removes by keyboard', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync })
    render(<PeopleRecipientCombobox selected={[avaStudent]} onChange={onChange} />)

    expect(screen.getByRole('status').textContent).toContain('1 selected')
    expect(screen.getByText(avaStudent.context)).toBeTruthy()
    const remove = screen.getByRole('button', { name: 'Remove Ava Reed' })
    expect(remove.className).toContain('min-h-11')
    remove.focus()
    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('ignores a slow response for an older query', async () => {
    const first = deferred<{ ok: true; results: PeopleSearchResult[] }>()
    const newerResult = { ...avaStudent, label: 'Newer result' }
    const olderResult = { ...avaStudent, key: 'student:old', label: 'Older result' }
    mocks.searchPeopleRecipients
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce({ ok: true, results: [newerResult] })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync })
    render(<PeopleRecipientCombobox selected={[]} onChange={vi.fn()} />)
    const input = screen.getByRole('combobox', { name: 'To' })

    await user.type(input, 'Av')
    await advanceDebounce()
    await user.type(input, 'a')
    await advanceDebounce()
    expect(screen.getByRole('option', { name: /newer result/i })).toBeTruthy()
    await act(async () => {
      first.resolve({ ok: true, results: [olderResult] })
      await vi.runAllTimersAsync()
    })

    expect(screen.queryByRole('option', { name: /older result/i })).toBeNull()
  })

  it('does not search for a one-character query', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync })
    render(<PeopleRecipientCombobox selected={[]} onChange={vi.fn()} />)

    await user.type(screen.getByRole('combobox', { name: 'To' }), 'A')
    await advanceDebounce()

    expect(mocks.searchPeopleRecipients).not.toHaveBeenCalled()
  })

  it('groups results and prevents selection of unavailable people', async () => {
    mocks.searchPeopleRecipients.mockResolvedValue({
      ok: true,
      results: [avaStudent, patParent, blairFaculty],
    })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync })
    const onChange = vi.fn()
    render(<PeopleRecipientCombobox selected={[]} onChange={onChange} />)

    await user.type(screen.getByRole('combobox', { name: 'To' }), 'Pa')
    await advanceDebounce()

    expect(screen.getByText('Faculty')).toBeTruthy()
    expect(screen.getByText('Parents')).toBeTruthy()
    expect(screen.getByText('Students')).toBeTruthy()
    const unavailable = screen.getByRole('option', { name: /pat parent.*no usable email address/i })
    expect(unavailable.getAttribute('aria-disabled')).toBe('true')
    await user.click(unavailable)
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('option', { name: /pat parent.*no usable email address/i })).toBeTruthy()
  })

  it('closes its listbox with Escape', async () => {
    mocks.searchPeopleRecipients.mockResolvedValue({ ok: true, results: [avaStudent] })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync })
    render(<PeopleRecipientCombobox selected={[]} onChange={vi.fn()} />)
    const input = screen.getByRole('combobox', { name: 'To' })

    await user.type(input, 'Av')
    await advanceDebounce()
    expect(screen.getByRole('option')).toBeTruthy()
    await user.keyboard('{Escape}')

    expect(input.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('does not offer an already selected recipient again', async () => {
    mocks.searchPeopleRecipients.mockResolvedValue({ ok: true, results: [avaStudent] })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync })
    render(<PeopleRecipientCombobox selected={[avaStudent]} onChange={vi.fn()} />)

    await user.type(screen.getByRole('combobox', { name: 'To' }), 'Av')
    await advanceDebounce()

    expect(screen.queryByRole('option', { name: /ava reed/i })).toBeNull()
  })

  it('persists only opaque recent references after selection', async () => {
    mocks.searchPeopleRecipients.mockResolvedValue({ ok: true, results: [avaStudent] })
    const onChange = vi.fn()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync })
    render(<PeopleRecipientCombobox selected={[]} onChange={onChange} />)

    await user.type(screen.getByRole('combobox', { name: 'To' }), 'Av')
    await advanceDebounce()
    await user.keyboard('{ArrowDown}{Enter}')

    expect(JSON.parse(window.localStorage.getItem('beacon:people-message-recents:v1') ?? '[]')).toEqual([
      avaStudent.ref,
    ])
  })

  it('reauthorizes saved recent references when it mounts', async () => {
    window.localStorage.setItem(
      'beacon:people-message-recents:v1',
      JSON.stringify([avaStudent.ref])
    )
    mocks.searchPeopleRecipients.mockResolvedValue({ ok: true, results: [avaStudent] })
    render(<PeopleRecipientCombobox selected={[]} onChange={vi.fn()} />)

    expect(mocks.searchPeopleRecipients).toHaveBeenCalledWith({
      query: '',
      recent_refs: [avaStudent.ref],
    })
    await act(async () => {})
    expect(screen.getByRole('option', { name: /ava reed/i })).toBeTruthy()
  })
})
