/** @vitest-environment jsdom */

import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  searchPeopleRecipients: vi.fn(),
  previewPeopleRecipients: vi.fn(),
  sendPeopleMessage: vi.fn(),
  previewComposeRecipients: vi.fn(),
  composeFamilyMessage: vi.fn(),
}))

vi.mock('@/app/actions/people-messaging', () => ({
  searchPeopleRecipients: mocks.searchPeopleRecipients,
  previewPeopleRecipients: mocks.previewPeopleRecipients,
  sendPeopleMessage: mocks.sendPeopleMessage,
}))

vi.mock('@/app/actions/communications', () => ({
  previewComposeRecipients: mocks.previewComposeRecipients,
  composeFamilyMessage: mocks.composeFamilyMessage,
}))

import { CommunicationsComposer } from './CommunicationsComposer'

const classes = [{ id: 'class-1', name: 'Fourth Grade' }]

describe('CommunicationsComposer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    mocks.searchPeopleRecipients.mockResolvedValue({ ok: true, results: [] })
    mocks.previewPeopleRecipients.mockResolvedValue({
      ok: true,
      preview: { selectedCount: 0, recipientCount: 0, unavailableCount: 0, selections: [] },
    })
    mocks.previewComposeRecipients.mockResolvedValue({ ok: true, count: 3, sample: [] })
    mocks.composeFamilyMessage.mockResolvedValue({ ok: true, emailed: 3, failed: 0, skipped: 0 })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('opens in People mode and preserves the existing Groups composer', async () => {
    const user = userEvent.setup()
    render(<CommunicationsComposer classes={classes} canSchoolWide />)
    const peopleTab = screen.getByRole('tab', { name: 'People' })
    const groupsTab = screen.getByRole('tab', { name: 'Groups' })

    expect(peopleTab.getAttribute('aria-selected')).toBe('true')
    expect(peopleTab.getAttribute('aria-controls')).toBe('people-panel')
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe('people-tab')
    expect(screen.getByText('Message specific people')).toBeTruthy()
    expect(peopleTab.className).toContain('min-h-11')

    await user.click(groupsTab)
    expect(groupsTab.getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('Compose to groups')).toBeTruthy()
  })

  it('supports arrow-key tab navigation with one tab in the focus order', async () => {
    const user = userEvent.setup()
    render(<CommunicationsComposer classes={classes} canSchoolWide />)
    const peopleTab = screen.getByRole('tab', { name: 'People' })
    const groupsTab = screen.getByRole('tab', { name: 'Groups' })

    peopleTab.focus()
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(groupsTab)
    expect(groupsTab.getAttribute('aria-selected')).toBe('true')
    expect(peopleTab.getAttribute('tabindex')).toBe('-1')
    expect(groupsTab.getAttribute('tabindex')).toBe('0')
  })

  it('cancels a People mode switch without losing the draft, then clears it after confirmation', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    const user = userEvent.setup()
    render(<CommunicationsComposer classes={classes} canSchoolWide />)
    await user.type(screen.getByLabelText('Subject'), 'Keep this draft')

    await user.click(screen.getByRole('tab', { name: 'Groups' }))
    expect(confirm).toHaveBeenLastCalledWith('Switch modes? Your current draft will be cleared.')
    expect((screen.getByLabelText('Subject') as HTMLInputElement).value).toBe('Keep this draft')
    expect(screen.getByRole('tab', { name: 'People' }).getAttribute('aria-selected')).toBe('true')

    await user.click(screen.getByRole('tab', { name: 'Groups' }))
    expect(screen.getByText('Compose to groups')).toBeTruthy()
    await user.click(screen.getByRole('tab', { name: 'People' }))
    expect((screen.getByLabelText('Subject') as HTMLInputElement).value).toBe('')
  })

  it('cancels a Groups mode switch without losing the draft, then clears it after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    const user = userEvent.setup()
    render(<CommunicationsComposer classes={classes} canSchoolWide />)
    await user.click(screen.getByRole('tab', { name: 'Groups' }))
    await user.type(screen.getByLabelText('Subject'), 'Group draft')

    await user.click(screen.getByRole('tab', { name: 'People' }))
    expect((screen.getByLabelText('Subject') as HTMLInputElement).value).toBe('Group draft')
    expect(screen.getByRole('tab', { name: 'Groups' }).getAttribute('aria-selected')).toBe('true')

    await user.click(screen.getByRole('tab', { name: 'People' }))
    expect(screen.getByText('Message specific people')).toBeTruthy()
    await user.click(screen.getByRole('tab', { name: 'Groups' }))
    expect((screen.getByLabelText('Subject') as HTMLInputElement).value).toBe('')
  })

  it('marks a Groups draft clean only after a complete successful send', async () => {
    const confirm = vi.spyOn(window, 'confirm')
    const user = userEvent.setup()
    render(<CommunicationsComposer classes={classes} canSchoolWide />)
    await user.click(screen.getByRole('tab', { name: 'Groups' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send to 3 recipients' })).toBeTruthy())
    await user.type(screen.getByLabelText('Subject'), 'School update')
    await user.type(screen.getByLabelText('Message'), 'Details for everyone.')
    await user.click(screen.getByRole('button', { name: 'Send to 3 recipients' }))
    await act(async () => {})

    await user.click(screen.getByRole('tab', { name: 'People' }))
    expect(confirm).not.toHaveBeenCalled()
    expect(screen.getByText('Message specific people')).toBeTruthy()
  })

  it('keeps a Groups draft dirty after a partial delivery', async () => {
    mocks.composeFamilyMessage.mockResolvedValueOnce({
      ok: true,
      emailed: 2,
      failed: 1,
      skipped: 0,
    })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    render(<CommunicationsComposer classes={classes} canSchoolWide />)
    await user.click(screen.getByRole('tab', { name: 'Groups' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send to 3 recipients' })).toBeTruthy())
    await user.type(screen.getByLabelText('Subject'), 'Partial update')
    await user.type(screen.getByLabelText('Message'), 'Keep this for inspection.')
    await user.click(screen.getByRole('button', { name: 'Send to 3 recipients' }))
    await act(async () => {})

    expect((screen.getByLabelText('Subject') as HTMLInputElement).value).toBe('Partial update')
    await user.click(screen.getByRole('tab', { name: 'People' }))
    expect(confirm).toHaveBeenCalledOnce()
    expect(screen.getByText('Compose to groups')).toBeTruthy()
  })
})
