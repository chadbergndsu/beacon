import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { PilotEvidenceScorecard } from '@/lib/pilot-analytics/types'
import { PilotScorecard } from './PilotScorecard'

const readyScorecard: PilotEvidenceScorecard = {
  windowStart: '2026-08-01',
  windowEnd: '2026-08-07',
  feedbackWindowStart: '2026-07-09',
  baseline: { state: 'gathering', day: 12 },
  activeTeachers: { state: 'ready', active: 6, eligible: 8, percent: 75 },
  activeLinkedParents: { state: 'ready', active: 15, eligible: 20, percent: 75 },
  attendanceActivity: { state: 'ready', primary: 4, secondary: 86 },
  gradeActivity: { state: 'ready', primary: 7, secondary: 112 },
  emailDelivery: { state: 'ready', delivered: 32, failed: 2, unsent: 3 },
  parentHelpfulness: { state: 'ready', helpful: 6, total: 8, percent: 75 },
  feedbackReceived: { state: 'ready', count: 5 },
}

function renderScorecard(overrides: Partial<PilotEvidenceScorecard> = {}) {
  return renderToStaticMarkup(<PilotScorecard scorecard={{ ...readyScorecard, ...overrides }} />)
}

describe('PilotScorecard', () => {
  it('renders the ready evidence model with neutral method context', () => {
    const html = renderScorecard()

    expect(html).toContain('Pilot evidence')
    expect(html).toContain('Last 7 days')
    expect(html).toContain('Baseline gathering · day 12 of 28')
    expect(html).toContain('Teachers active')
    expect(html).toContain('6 of 8 eligible · 75%')
    expect(html).toContain('Linked parents active')
    expect(html).toContain('15 of 20 eligible · 75%')
    expect(html).toContain('Attendance activity')
    expect(html).toContain('4 school days · 86 records')
    expect(html).toContain('Grade activity')
    expect(html).toContain('7 assignments · 112 records')
    expect(html).toContain('Email delivery')
    expect(html).toContain('32 delivered')
    expect(html).toContain('2 failed')
    expect(html).toContain('3 unsent')
    expect(html).toContain('Parent helpfulness')
    expect(html).toContain('75% helpful · 8 responses')
    expect(html).toContain('Feedback received')
    expect(html).toContain('5 responses')
    expect(html).toContain('href="/principal/feedback"')
    expect(html).toContain('Review feedback')
    expect(html).toContain('Activity is deduplicated by person, workflow, and UTC day.')
    expect(html).toContain(
      'These are pilot observations, not staff performance scores or outcome claims.'
    )
  })

  it('renders each baseline state without presenting unavailable data as zero', () => {
    const notStarted = renderScorecard({ baseline: { state: 'not_started' } })
    const complete = renderScorecard({ baseline: { state: 'complete' } })
    const unavailable = renderScorecard({
      baseline: { state: 'unavailable', reason: 'Activity source offline.' },
    })

    expect(notStarted).toContain('Baseline starts with first pilot activity')
    expect(complete).toContain('Baseline complete')
    expect(complete).not.toContain('day 28 of 28')
    expect(unavailable).toContain('Baseline temporarily unavailable')
    expect(unavailable).not.toContain('Baseline gathering')
    expect(unavailable).not.toContain('>0<')
  })

  it('distinguishes no eligible accounts, zero activity, and unavailable ratios', () => {
    const html = renderScorecard({
      activeTeachers: { state: 'no_eligible', active: 0, eligible: 0 },
      activeLinkedParents: { state: 'ready', active: 0, eligible: 9, percent: 0 },
    })
    const unavailable = renderScorecard({
      activeTeachers: { state: 'unavailable', reason: 'Teacher source offline.' },
      activeLinkedParents: { state: 'unavailable', reason: 'Parent source offline.' },
    })

    expect(html).toContain('No eligible teacher accounts yet')
    expect(html).toContain('0 of 9 eligible · 0%')
    expect(html).toContain('No activity recorded in this window')
    expect(unavailable.match(/Temporarily unavailable/g)).toHaveLength(2)
    expect(unavailable).not.toContain('0 of')
  })

  it('keeps workflow and delivery unavailable states distinct from real zero activity', () => {
    const zeroActivity = renderScorecard({
      attendanceActivity: { state: 'ready', primary: 0, secondary: 0 },
      gradeActivity: { state: 'ready', primary: 0, secondary: 0 },
      emailDelivery: { state: 'ready', delivered: 0, failed: 0, unsent: 0 },
    })
    const unavailable = renderScorecard({
      attendanceActivity: { state: 'unavailable', reason: 'Attendance source offline.' },
      gradeActivity: { state: 'unavailable', reason: 'Grade source offline.' },
      emailDelivery: { state: 'unavailable', reason: 'Email source offline.' },
    })

    expect(zeroActivity.match(/No activity recorded in this window/g)).toHaveLength(2)
    expect(zeroActivity).toContain('0 delivered')
    expect(zeroActivity).toContain('0 failed')
    expect(zeroActivity).toContain('0 unsent')
    expect(unavailable.match(/Temporarily unavailable/g)).toHaveLength(3)
    expect(unavailable).not.toContain('0 records')
    expect(unavailable).not.toContain('0 delivered')
  })

  it('withholds the helpfulness percentage below five responses', () => {
    const smallSample = renderScorecard({
      parentHelpfulness: { state: 'small_sample', helpful: 3, total: 4, minimum: 5 },
    })
    const unavailable = renderScorecard({
      parentHelpfulness: { state: 'unavailable', reason: 'Feedback source offline.' },
    })

    expect(smallSample).toContain('4 responses · not enough for a percentage')
    expect(smallSample).not.toContain('75% helpful')
    expect(unavailable).toContain('Temporarily unavailable')
    expect(unavailable).not.toContain('0%')
  })

  it('renders zero feedback as observed data and unavailable feedback without a zero', () => {
    const zeroFeedback = renderScorecard({
      feedbackReceived: { state: 'ready', count: 0 },
    })
    const unavailable = renderScorecard({
      feedbackReceived: { state: 'unavailable', reason: 'Feedback source offline.' },
    })

    expect(zeroFeedback).toContain('0 responses')
    expect(unavailable).toContain('Temporarily unavailable')
    expect(unavailable).not.toContain('0 responses')
  })

  it('does not add judgement, targets, rankings, or person-name language', () => {
    const text = renderScorecard().replace(/<[^>]*>/g, ' ').toLowerCase()

    expect(text).not.toMatch(/\b(?:green|red|success|target|ranking)\b/)
    expect(text).not.toContain('teacher name')
    expect(text).not.toContain('student name')
  })
})
