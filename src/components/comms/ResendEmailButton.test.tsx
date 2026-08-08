/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  resendFailedEmail: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }))
vi.mock('@/app/actions/communications', () => ({ resendFailedEmail: mocks.resendFailedEmail }))

import { ResendEmailButton } from './ResendEmailButton'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

describe('ResendEmailButton attempt lifecycle', () => {
  beforeEach(() => {
    mocks.resendFailedEmail.mockReset()
    mocks.refresh.mockReset()
  })
  afterEach(cleanup)

  it('rotates the attempt key after a confirmed completed failed delivery', async () => {
    mocks.resendFailedEmail
      .mockResolvedValueOnce({ ok: false, error: 'Retry failed.', attemptCompleted: true })
      .mockResolvedValueOnce({ ok: true, emailed: 1 })
    render(<ResendEmailButton outboxId="row-1" />)

    fireEvent.click(screen.getByRole('button', { name: 'Resend' }))
    expect(await screen.findByText('Retry failed.')).toBeTruthy()
    const firstKey = mocks.resendFailedEmail.mock.calls[0][1]
    fireEvent.click(screen.getByRole('button', { name: 'Resend' }))
    await waitFor(() => expect(mocks.resendFailedEmail).toHaveBeenCalledTimes(2))
    expect(mocks.resendFailedEmail.mock.calls[1][1]).not.toBe(firstKey)
  })

  it('retains the attempt key and avoids refresh while a queued replay is processing', async () => {
    mocks.resendFailedEmail.mockResolvedValue({
      ok: true,
      emailed: 0,
      emailNote: 'Retry is still processing. Check the outbox for its current status.',
      attemptCompleted: false,
    })
    render(<ResendEmailButton outboxId="row-1" />)

    fireEvent.click(screen.getByRole('button', { name: 'Resend' }))
    expect(await screen.findByText('Retry is still processing. Check the outbox for its current status.')).toBeTruthy()
    const resendButton = await screen.findByRole('button', { name: 'Resend' })
    await waitFor(() => expect(resendButton).not.toHaveProperty('disabled', true))
    fireEvent.click(resendButton)
    await waitFor(() => expect(mocks.resendFailedEmail).toHaveBeenCalledTimes(2))
    expect(mocks.resendFailedEmail.mock.calls[1][1]).toBe(mocks.resendFailedEmail.mock.calls[0][1])
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it.each(['sent', 'skipped'])('rotates and refreshes after a completed %s retry', async () => {
    mocks.resendFailedEmail.mockResolvedValue({ ok: true, emailed: 1, attemptCompleted: true })
    render(<ResendEmailButton outboxId="row-1" />)

    fireEvent.click(screen.getByRole('button', { name: 'Resend' }))
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1))
    const firstKey = mocks.resendFailedEmail.mock.calls[0][1]
    fireEvent.click(screen.getByRole('button', { name: 'Resend' }))
    await waitFor(() => expect(mocks.resendFailedEmail).toHaveBeenCalledTimes(2))
    expect(mocks.resendFailedEmail.mock.calls[1][1]).not.toBe(firstKey)
  })

  it('retains the attempt key after a rejected action or unknown failure', async () => {
    mocks.resendFailedEmail
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce({ ok: false, error: 'Outbox row not found.' })
    render(<ResendEmailButton outboxId="row-1" />)

    fireEvent.click(screen.getByRole('button', { name: 'Resend' }))
    expect(await screen.findByText('Unable to retry this email right now.')).toBeTruthy()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Resend' })).not.toHaveProperty('disabled', true))
    fireEvent.click(screen.getByRole('button', { name: 'Resend' }))
    await waitFor(() => expect(mocks.resendFailedEmail).toHaveBeenCalledTimes(2))
    expect(mocks.resendFailedEmail.mock.calls[1][1]).toBe(mocks.resendFailedEmail.mock.calls[0][1])
  })

  it('synchronously latches double click while one retry is pending', async () => {
    const pending = deferred<{ ok: true; emailed: number; attemptCompleted: true }>()
    mocks.resendFailedEmail.mockReturnValue(pending.promise)
    render(<ResendEmailButton outboxId="row-1" />)
    const button = screen.getByRole('button', { name: 'Resend' })

    button.click()
    button.click()

    expect(mocks.resendFailedEmail).toHaveBeenCalledTimes(1)
    pending.resolve({ ok: true, emailed: 1, attemptCompleted: true })
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1))
  })
})
