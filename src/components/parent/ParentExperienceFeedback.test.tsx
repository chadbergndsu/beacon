/** @vitest-environment jsdom */

import { renderToStaticMarkup } from 'react-dom/server'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  submitParentExperienceFeedback: vi.fn(),
}))

vi.mock('@/app/actions/parent-feedback', () => ({
  submitParentExperienceFeedback: mocks.submitParentExperienceFeedback,
}))

import { ParentExperienceFeedback } from './ParentExperienceFeedback'

describe('ParentExperienceFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the one-tap prompt without showing the optional note before selection', () => {
    const html = renderToStaticMarkup(
      <ParentExperienceFeedback initialResponse={null} />
    )

    expect(html).toContain('Was Beacon helpful for understanding school this week?')
    expect(html).toContain('>Yes</button>')
    expect(html).toContain('>Not yet</button>')
    expect(html).toContain('type="submit"')
    expect(html).toContain('min-h-12')
    expect(html).not.toContain('Anything you want us to know?')
  })

  it('shows an editable 500-character optional note for an existing response', () => {
    const html = renderToStaticMarkup(
      <ParentExperienceFeedback
        initialResponse={{
          rating: 'helpful',
          comment: 'The family feed was useful.',
        }}
      />
    )

    expect(html).toContain('Anything you want us to know?')
    expect(html).toContain('maxLength="500"')
    expect(html).toContain('The family feed was useful.')
    expect(html).toContain(
      'Please do not include student names, medical details, or other sensitive information.'
    )
  })

  it('announces an unavailable state and disables submission', () => {
    const html = renderToStaticMarkup(
      <ParentExperienceFeedback initialResponse={null} unavailable />
    )

    expect(html).toContain('role="alert"')
    expect(html).toContain('Weekly feedback is unavailable right now. Please try again later.')
    expect(html.match(/disabled=""/g)).toHaveLength(2)
  })

  it('preserves an edited comment after a failed update', async () => {
    mocks.submitParentExperienceFeedback.mockResolvedValueOnce({
      error: 'We could not save your feedback. Please try again.',
    })
    const user = userEvent.setup()
    render(
      <ParentExperienceFeedback
        initialResponse={{ rating: 'helpful', comment: 'Saved note.' }}
      />
    )

    const comment = screen.getByRole('textbox', {
      name: 'Anything you want us to know?',
    }) as HTMLTextAreaElement
    await user.clear(comment)
    await user.type(comment, 'Keep this draft after failure.')
    await user.click(screen.getByRole('button', { name: 'Not yet' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'We could not save your feedback. Please try again.'
    )
    expect(comment.value).toBe('Keep this draft after failure.')
  })

  it('announces that a one-tap rating is saving while the action is pending', async () => {
    let finish!: (value: { ok: true; rating: 'helpful' }) => void
    mocks.submitParentExperienceFeedback.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      })
    )
    const user = userEvent.setup()
    render(<ParentExperienceFeedback initialResponse={null} />)

    await user.click(screen.getByRole('button', { name: 'Yes' }))

    try {
      expect((await screen.findByRole('status')).textContent).toContain('Saving your feedback')
    } finally {
      finish({ ok: true, rating: 'helpful' })
    }
    expect((await screen.findByRole('status')).textContent).toContain('Thank you')
  })

  it('keeps the edited comment and selected rating after a successful update', async () => {
    mocks.submitParentExperienceFeedback.mockResolvedValueOnce({
      ok: true,
      rating: 'not_yet',
    })
    const user = userEvent.setup()
    render(
      <ParentExperienceFeedback
        initialResponse={{ rating: 'helpful', comment: 'Saved note.' }}
      />
    )

    const comment = screen.getByRole('textbox', {
      name: 'Anything you want us to know?',
    }) as HTMLTextAreaElement
    await user.clear(comment)
    await user.type(comment, 'Updated note.')
    await user.click(screen.getByRole('button', { name: 'Not yet' }))

    expect((await screen.findByRole('status')).textContent).toContain(
      'Thank you - your school and the Beacon team can use this to improve the pilot.'
    )
    expect(comment.value).toBe('Updated note.')
    expect(screen.getByRole('button', { name: 'Not yet' }).getAttribute('aria-pressed')).toBe(
      'true'
    )
  })
})
