import { describe, expect, it } from 'vitest'
import { buildNav } from '@/components/layout/AppHeader'

describe('buildNav role separation', () => {
  it('principal nav is slim — office tools live under Principal office', () => {
    const labels = buildNav('principal').map((n) => n.label)
    expect(labels).toEqual(
      expect.arrayContaining(['Home', 'Office', 'News', 'Settings', 'School site'])
    )
    expect(labels).not.toContain('Roster')
    expect(labels).not.toContain('Approvals')
    expect(labels).not.toContain('Badges')
    expect(labels).not.toContain('Go-live')
    expect(labels).not.toContain('My classroom')
    expect(labels).not.toContain('Lesson plans')
    expect(labels).not.toContain('Printables')
    expect(labels).not.toContain('Scan')
    expect(labels).not.toContain('Principal office')
  })

  it('teacher nav includes classroom tools, not principal office', () => {
    const labels = buildNav('teacher').map((n) => n.label)
    expect(labels).toContain('Classroom')
    expect(labels).toContain('Quick')
    expect(labels).not.toContain('Office')
    expect(labels).not.toContain('Approvals')
  })

  it('parent nav is minimal', () => {
    const labels = buildNav('parent').map((n) => n.label)
    expect(labels).toEqual(['Home', 'News', 'Settings', 'School site', 'About'])
  })
})
