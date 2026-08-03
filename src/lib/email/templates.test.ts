import { describe, expect, it } from 'vitest'
import {
  announcementBodies,
  dinnerDigestBodies,
  escapeHtml,
  subjectTag,
  fromDisplayName,
} from './templates'
import type { SchoolBrand } from '@/lib/school-brand'
import type { DinnerTableDigest } from '@/lib/insights/dinner-table'

const brand: SchoolBrand = {
  schoolId: 's1',
  name: 'Lighthouse Christian Academy',
  shortName: 'LCA',
  tagline: 'Academics · Families',
  websiteUrl: 'https://example.edu',
  email: 'office@example.edu',
  phone: '555-0100',
  city: 'Town',
  state: 'ND',
  mission: null,
  gradesServed: 'K-12',
  curriculumNote: null,
  logoLetter: 'L',
}

describe('email templates', () => {
  it('subject tag uses short name', () => {
    expect(subjectTag(brand)).toBe('LCA')
    expect(fromDisplayName(brand)).toContain('Lighthouse')
  })

  it('escapes html', () => {
    expect(escapeHtml('<script>"x"&')).toBe('&lt;script&gt;&quot;x&quot;&amp;')
  })

  it('builds branded announcement html with school name and body', () => {
    const { text, html } = announcementBodies({
      brand,
      title: 'Early dismissal',
      body: 'Friday at 1pm',
      author: 'Mrs. Smith',
      appUrl: 'https://beacon.example/announcements/1',
    })
    expect(text).toContain('Early dismissal')
    expect(text).toContain('Friday at 1pm')
    expect(html).toContain('Lighthouse Christian Academy')
    expect(html).toContain('Early dismissal')
    expect(html).toContain('Friday at 1pm')
    expect(html).toContain('Open in Beacon')
    expect(html).not.toContain('<script>')
  })

  it('builds dinner digest email with celebrate and conversation starters', () => {
    const digest: DinnerTableDigest = {
      studentName: 'Ava Smith',
      gradeLevel: '4',
      weekLabel: 'Week of Mar 1',
      celebrate: ['Great chapel reading'],
      watch: ['Science project still missing'],
      gradesLine: 'Math 92% · Reading 88%',
      presenceLine: 'Present all week',
      comingUp: ['Field trip permission due Fri'],
      conversationStarters: ['What was the best part of chapel?'],
      generatedAt: new Date().toISOString(),
    }
    const { text, html } = dinnerDigestBodies({
      brand,
      parentName: 'Parent Smith',
      digest,
      appUrl: 'https://beacon.example/students/1',
    })
    expect(text).toContain('Great chapel reading')
    expect(text).toContain('ASK AT DINNER')
    expect(html).toContain('Ava Smith')
    expect(html).toContain('Great chapel reading')
    expect(html).toContain('What was the best part of chapel?')
    expect(html).toContain('Dinner Table Digest')
  })
})
