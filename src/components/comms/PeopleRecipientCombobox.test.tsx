/** @vitest-environment jsdom */

import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PeopleSearchResult } from '@/lib/email/people-types'

const mocks = vi.hoisted(() => ({
  searchPeopleRecipients: vi.fn(),
}))

vi.mock('@/app/actions/people-messaging', () => ({
  searchPeopleRecipients: mocks.searchPeopleRecipients,
}))

import { PeopleRecipientCombobox } from './PeopleRecipientCombobox'

const RECENTS_STORAGE_KEY = 'beacon:people-message-recents:v1'

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

function StatefulHarness({ initialSelected = [] }: { initialSelected?: PeopleSearchResult[] }) {
  const [selected, setSelected] = useState(initialSelected)
  return <PeopleRecipientCombobox selected={selected} onChange={setSelected} />
}

function ReconciliationHarness({ onChange }: { onChange: (next: PeopleSearchResult[]) => void }) {
  const [selected, setSelected] = useState<PeopleSearchResult[]>([])
  return (
    <>
      <button type="button" onClick={() => setSelected([blairFaculty])}>
        Select Blair externally
      </button>
      <PeopleRecipientCombobox
        selected={selected}
        onChange={(next) => {
          onChange(next)
          setSelected(next)
        }}
      />
    </>
  )
}

function profileRef(index: number) {
  return {
    kind: 'profile' as const,
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
  }
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
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
    mocks.searchPeopleRecipients.mockResolvedValue({ ok: true, results: [] })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView
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
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync })
    render(<StatefulHarness />)

    await user.type(screen.getByRole('combobox', { name: 'To' }), 'Av')
    await advanceDebounce()
    await user.keyboard('{ArrowDown}{Enter}')

    expect(screen.getByRole('status').textContent).toContain('1 selected')
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

  it('uses rendered group order for keyboard navigation and scrolls active options into view', async () => {
    mocks.searchPeopleRecipients.mockResolvedValue({
      ok: true,
      results: [avaStudent, patParent, blairFaculty],
    })
    const onChange = vi.fn()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync })
    render(<PeopleRecipientCombobox selected={[]} onChange={onChange} />)
    const input = screen.getByRole('combobox', { name: 'To' })

    await user.type(input, 'Pa')
    await advanceDebounce()
    await user.keyboard('{ArrowDown}')
    expect(input.getAttribute('aria-activedescendant')).toContain(blairFaculty.key)
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
    await user.keyboard('{ArrowDown}')
    expect(input.getAttribute('aria-activedescendant')).toContain(avaStudent.key)
    await user.keyboard('{ArrowUp}{Enter}')
    expect(onChange).toHaveBeenCalledWith([blairFaculty])
  })

  it('returns focus to To after a controlled parent removes a recipient chip', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync })
    render(<StatefulHarness initialSelected={[avaStudent]} />)
    const input = screen.getByRole('combobox', { name: 'To' })
    const remove = screen.getByRole('button', { name: 'Remove Ava Reed' })

    remove.focus()
    await user.keyboard('{Enter}')

    expect(screen.queryByRole('button', { name: 'Remove Ava Reed' })).toBeNull()
    expect(document.activeElement).toBe(input)
    expect(screen.getByRole('status').textContent).toContain('0 selected')
  })

  it('clears an active item removed by a controlled parent before Enter can select another', async () => {
    mocks.searchPeopleRecipients.mockResolvedValue({ ok: true, results: [blairFaculty, avaStudent] })
    const onChange = vi.fn()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync })
    render(<ReconciliationHarness onChange={onChange} />)
    const input = screen.getByRole('combobox', { name: 'To' })

    await user.type(input, 'Bl')
    await advanceDebounce()
    await user.keyboard('{ArrowDown}')
    expect(input.getAttribute('aria-activedescendant')).toContain(blairFaculty.key)
    await user.click(screen.getByRole('button', { name: 'Select Blair externally' }))
    input.focus()
    await user.keyboard('{Enter}')

    expect(input.getAttribute('aria-activedescendant')).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('filters, deduplicates, caps, and cleans stored recent references before reauthorization', () => {
    const refs = Array.from({ length: 9 }, (_, index) => profileRef(index))
    const expected = refs.slice(0, 8)
    window.localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify([refs[0], refs[0], ...refs.slice(1)]))
    render(<PeopleRecipientCombobox selected={[]} onChange={vi.fn()} />)

    expect(mocks.searchPeopleRecipients).toHaveBeenCalledWith({ query: '', recent_refs: expected })
    expect(JSON.parse(window.localStorage.getItem(RECENTS_STORAGE_KEY) ?? '[]')).toEqual(expected)
  })

  it('ignores and clears malformed recent storage without searching or exposing details', () => {
    window.localStorage.setItem(RECENTS_STORAGE_KEY, '{not json')
    render(<PeopleRecipientCombobox selected={[]} onChange={vi.fn()} />)

    expect(mocks.searchPeopleRecipients).not.toHaveBeenCalled()
    expect(window.localStorage.getItem(RECENTS_STORAGE_KEY)).toBeNull()
  })

  it('ignores invalid recent identifiers before contacting the server', () => {
    window.localStorage.setItem(
      RECENTS_STORAGE_KEY,
      JSON.stringify([{ kind: 'profile', id: 'not-a-uuid' }])
    )
    render(<PeopleRecipientCombobox selected={[]} onChange={vi.fn()} />)

    expect(mocks.searchPeopleRecipients).not.toHaveBeenCalled()
    expect(window.localStorage.getItem(RECENTS_STORAGE_KEY)).toBeNull()
  })

  it('continues selection when recent storage rejects a write', async () => {
    mocks.searchPeopleRecipients.mockResolvedValue({ ok: true, results: [avaStudent] })
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    const onChange = vi.fn()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync })
    render(<PeopleRecipientCombobox selected={[]} onChange={onChange} />)

    await user.type(screen.getByRole('combobox', { name: 'To' }), 'Av')
    await advanceDebounce()
    await user.keyboard('{ArrowDown}{Enter}')

    expect(onChange).toHaveBeenCalledWith([avaStudent])
    expect(setItem).toHaveBeenCalled()
  })

  it('does not apply an in-flight search response after unmount', async () => {
    const response = deferred<{ ok: true; results: PeopleSearchResult[] }>()
    mocks.searchPeopleRecipients.mockReturnValueOnce(response.promise)
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync })
    const view = render(<PeopleRecipientCombobox selected={[]} onChange={vi.fn()} />)

    await user.type(screen.getByRole('combobox', { name: 'To' }), 'Av')
    await advanceDebounce()
    view.unmount()
    await act(async () => {
      response.resolve({ ok: true, results: [avaStudent] })
    })

    expect(screen.queryByRole('option', { name: /ava reed/i })).toBeNull()
  })
})
