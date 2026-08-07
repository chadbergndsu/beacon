import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ParentExperienceFeedbackInbox } from './ParentExperienceFeedbackInbox'

describe('ParentExperienceFeedbackInbox', () => {
  it('renders ratings, dates, and comments without identity or student data', () => {
    const items = [
      {
        id: 'feedback-1',
        rating: 'helpful' as const,
        comment: 'The family feed made the week easier.',
        created_at: '2026-08-07T14:00:00.000Z',
        parent_id: 'parent-secret',
        email: 'parent@example.com',
        child: 'Child Secret',
        student: 'Student Secret',
      },
      {
        id: 'feedback-2',
        rating: 'not_yet' as const,
        comment: 'A shorter summary would help.',
        created_at: '2026-08-06T12:00:00.000Z',
      },
    ]

    const html = renderToStaticMarkup(
      <ParentExperienceFeedbackInbox initialItems={{ state: 'ready', items }} />
    )

    expect(html).toContain('Helpful')
    expect(html).toContain('Not yet')
    expect(html).toContain('Aug 7, 2026')
    expect(html).toContain('The family feed made the week easier.')
    expect(html).toContain('A shorter summary would help.')
    expect(html).not.toContain('parent-secret')
    expect(html).not.toContain('parent@example.com')
    expect(html).not.toContain('Child Secret')
    expect(html).not.toContain('Student Secret')
  })

  it('renders the prescribed empty state', () => {
    const html = renderToStaticMarkup(
      <ParentExperienceFeedbackInbox
        initialItems={{ state: 'ready', items: [] }}
      />
    )

    expect(html).toContain('No parent comments yet.')
  })

  it('renders unavailable separately from a successful empty result', () => {
    const html = renderToStaticMarkup(
      <ParentExperienceFeedbackInbox
        initialItems={{
          state: 'unavailable',
          reason: 'Parent comments are temporarily unavailable.',
        }}
      />
    )

    expect(html).toContain('Temporarily unavailable')
    expect(html).not.toContain('No parent comments yet.')
    expect(html).not.toContain('private')
  })

  it('does not crash when a legacy comment has an unrenderable creation date', () => {
    const html = renderToStaticMarkup(
      <ParentExperienceFeedbackInbox
        initialItems={{
          state: 'ready',
          items: [
            {
              id: 'feedback-legacy',
              rating: 'helpful',
              comment: 'Legacy comment remains reviewable.',
              created_at: 'infinity',
            },
          ],
        }}
      />
    )

    expect(html).toContain('Legacy comment remains reviewable.')
    expect(html).toContain('Date unavailable')
  })
})
