import { describe, expect, it } from 'vitest'
import { buildNav, buildStaffNavGroups } from '@/components/layout/AppHeader'

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

  it('teacher primary bar is slim with secondary tools in More', () => {
    const { primary, more } = buildStaffNavGroups('teacher')
    expect(primary.map((n) => n.label)).toEqual([
      'Home',
      'Classroom',
      'Quick',
      'News',
      'Settings',
    ])
    expect(more.map((n) => n.label)).toEqual(
      expect.arrayContaining(['Lessons', 'Calendar', 'Printables', 'Scan', 'School site'])
    )
    expect(primary.map((n) => n.label)).not.toContain('Office')
    expect(buildNav('teacher').map((n) => n.label)).not.toContain('Approvals')
  })

  it('parent nav is minimal', () => {
    const labels = buildNav('parent').map((n) => n.label)
    expect(labels).toEqual(['Home', 'News', 'Messages', 'Settings', 'School site', 'About'])
  })
})
