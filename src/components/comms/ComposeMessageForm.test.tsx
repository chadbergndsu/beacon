/** @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  previewComposeRecipients: vi.fn(),
  composeFamilyMessage: vi.fn(),
}))

vi.mock('@/app/actions/communications', () => ({
  previewComposeRecipients: mocks.previewComposeRecipients,
  composeFamilyMessage: mocks.composeFamilyMessage,
}))

import { ComposeMessageForm } from './ComposeMessageForm'

const classes = [{ id: 'class-1', name: 'Fourth Grade' }]

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((finish) => {
    resolve = finish
  })
  return { promise, resolve }
}

async function fillValidGroupMessage(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => expect(screen.getByRole('button', { name: 'Send to 3 recipients' })).toBeTruthy())
  await user.type(screen.getByLabelText('Subject'), 'School update')
  await user.type(screen.getByLabelText('Message'), 'Details for everyone.')
}

describe('ComposeMessageForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.previewComposeRecipients.mockResolvedValue({ ok: true, count: 3, sample: [] })
    mocks.composeFamilyMessage.mockResolvedValue({ ok: true, emailed: 3, failed: 0, skipped: 0 })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('hides an obsolete count and blocks send until the exact current preview resolves', async () => {
    const oldPreview = deferred<{ ok: true; count: number; sample: string[] }>()
    const user = userEvent.setup()
    render(<ComposeMessageForm classes={classes} canSchoolWide />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send to 3 recipients' })).toBeTruthy())
    await user.type(screen.getByLabelText('Subject'), 'School update')
    await user.type(screen.getByLabelText('Message'), 'Details for everyone.')

    mocks.previewComposeRecipients.mockReturnValueOnce(oldPreview.promise)
    await user.selectOptions(screen.getByLabelText('Audience'), 'teachers')
    expect(screen.queryByText(/3 recipients/)).toBeNull()
    expect((screen.getByRole('button', { name: 'Send message' }) as HTMLButtonElement).disabled).toBe(true)

    mocks.previewComposeRecipients.mockResolvedValueOnce({ ok: true, count: 2, sample: [] })
    await user.selectOptions(screen.getByLabelText('Audience'), 'staff')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send to 2 recipients' })).toBeTruthy())
    await act(async () => oldPreview.resolve({ ok: true, count: 7, sample: [] }))
    expect(screen.getByRole('button', { name: 'Send to 2 recipients' })).toBeTruthy()
    expect(screen.queryByText(/7 recipients/)).toBeNull()
  })

  it('turns a rejected preview into a stable error and keeps send disabled', async () => {
    mocks.previewComposeRecipients.mockRejectedValueOnce(new Error('database details'))
    render(<ComposeMessageForm classes={classes} canSchoolWide />)

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Unable to preview recipients right now.'
    )
    expect((screen.getByRole('button', { name: 'Send message' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByText(/database details/i)).toBeNull()
  })

  it('keeps the draft after a resolved send error and invokes the action once', async () => {
    mocks.composeFamilyMessage.mockResolvedValueOnce({ ok: false, error: 'Not allowed to send.' })
    const user = userEvent.setup()
    render(<ComposeMessageForm classes={classes} canSchoolWide />)
    await fillValidGroupMessage(user)
    await user.click(screen.getByRole('button', { name: 'Send to 3 recipients' }))

    expect((await screen.findByRole('alert')).textContent).toContain('Not allowed to send.')
    expect((screen.getByLabelText('Subject') as HTMLInputElement).value).toBe('School update')
    expect((screen.getByRole('button', { name: 'Send to 3 recipients' }) as HTMLButtonElement).disabled).toBe(false)
    expect(mocks.composeFamilyMessage).toHaveBeenCalledTimes(1)
  })

  it('turns a rejected send into a stable error, restores pending state, and keeps the draft', async () => {
    mocks.composeFamilyMessage.mockRejectedValueOnce(new Error('internal service details'))
    const user = userEvent.setup()
    render(<ComposeMessageForm classes={classes} canSchoolWide />)
    await fillValidGroupMessage(user)
    await user.click(screen.getByRole('button', { name: 'Send to 3 recipients' }))

    expect((await screen.findByRole('alert')).textContent).toContain('Unable to send message right now.')
    expect(screen.queryByText(/internal service details/i)).toBeNull()
    expect((screen.getByLabelText('Subject') as HTMLInputElement).value).toBe('School update')
    expect((screen.getByRole('button', { name: 'Send to 3 recipients' }) as HTMLButtonElement).disabled).toBe(false)
    expect(mocks.composeFamilyMessage).toHaveBeenCalledTimes(1)
  })

  it('allows only one in-flight submission', async () => {
    const delivery = deferred<{ ok: true; emailed: number; failed: number; skipped: number }>()
    mocks.composeFamilyMessage.mockReturnValueOnce(delivery.promise)
    const user = userEvent.setup()
    render(<ComposeMessageForm classes={classes} canSchoolWide />)
    await fillValidGroupMessage(user)
    const button = screen.getByRole('button', { name: 'Send to 3 recipients' })
    const form = button.closest('form')
    if (!form) throw new Error('Expected Groups form')

    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(mocks.composeFamilyMessage).toHaveBeenCalledTimes(1)
    expect((screen.getByRole('button', { name: 'Sending…' }) as HTMLButtonElement).disabled).toBe(true)

    await act(async () => delivery.resolve({ ok: true, emailed: 3, failed: 0, skipped: 0 }))
  })

  it('ignores a preview response after unmount', async () => {
    const preview = deferred<{ ok: true; count: number; sample: string[] }>()
    mocks.previewComposeRecipients.mockReturnValueOnce(preview.promise)
    const view = render(<ComposeMessageForm classes={classes} canSchoolWide />)
    view.unmount()

    await act(async () => preview.resolve({ ok: true, count: 3, sample: [] }))
    expect(document.body.textContent).toBe('')
  })
})
