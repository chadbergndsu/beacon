import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ParentExperienceFeedback } from './ParentExperienceFeedback'

describe('ParentExperienceFeedback', () => {
  it('renders the one-tap prompt without showing the optional note before selection', () => {
    const html = renderToStaticMarkup(
      <ParentExperienceFeedback initialResponse={null} />
    )

    expect(html).toContain('Was Beacon helpful for understanding school this week?')
    expect(html).toContain('>Yes</button>')
    expect(html).toContain('>Not yet</button>')
    expect(html).toContain('type="submit"')
    expect(html).toContain('min-h-11')
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
})
