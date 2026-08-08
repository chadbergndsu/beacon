import { describe, expect, it } from 'vitest'
import { getScreenCatalog } from './registry'
import {
  isSectionVisible,
  moveSection,
  resolveScreenLayout,
  toggleHidden,
} from './resolve'

describe('resolveScreenLayout', () => {
  const catalog = getScreenCatalog('dashboard').sections

  it('uses catalog order when no prefs saved', () => {
    const present = ['header', 'classes', 'announcements']
    const layout = resolveScreenLayout('dashboard', present, null, catalog)
    expect(layout.order).toEqual(['header', 'classes', 'announcements'])
    expect(layout.hidden).toEqual([])
  })

  it('respects saved order and drops unknown ids', () => {
    const present = ['header', 'classes', 'announcements', 'teacher_today']
    const layout = resolveScreenLayout(
      'dashboard',
      present,
      { order: ['announcements', 'classes', 'gone'], hidden: ['teacher_today'] },
      catalog
    )
    expect(layout.order[0]).toBe('announcements')
    expect(layout.order).toContain('header')
    expect(layout.order).not.toContain('gone')
    expect(layout.hidden).toEqual(['teacher_today'])
  })

  it('inserts a new catalog section beside its neighbor in a legacy saved layout', () => {
    const present = [
      'header',
      'children',
      'parent_feed',
      'parent_feedback',
      'announcements',
    ]
    const layout = resolveScreenLayout(
      'dashboard',
      present,
      {
        order: ['header', 'children', 'parent_feed', 'announcements'],
        hidden: [],
      },
      catalog
    )

    expect(layout.order).toEqual([
      'header',
      'children',
      'parent_feed',
      'parent_feedback',
      'announcements',
    ])
  })

  it('never hides locked sections', () => {
    const present = ['header', 'classes']
    const layout = resolveScreenLayout(
      'dashboard',
      present,
      { order: present, hidden: ['header', 'classes'] },
      catalog
    )
    expect(layout.hidden).toEqual(['classes'])
    expect(
      isSectionVisible('header', layout, new Set(['header']))
    ).toBe(true)
  })

  it('registers pilot evidence and inserts it after Beacon Signal in legacy principal layouts', () => {
    const principalCatalog = getScreenCatalog('principal_overview').sections
    const pilotSection = principalCatalog.find((section) => section.id === 'pilot_evidence')
    const present = [
      'beacon_signal',
      'pilot_evidence',
      'stats',
      'quickbooks',
      'announcements',
      'shortcuts',
    ]
    const layout = resolveScreenLayout(
      'principal_overview',
      present,
      {
        order: ['beacon_signal', 'stats', 'quickbooks', 'announcements', 'shortcuts'],
        hidden: [],
      },
      principalCatalog
    )

    expect(pilotSection).toEqual({
      id: 'pilot_evidence',
      label: 'Pilot evidence',
      description: 'Seven-day activity, delivery, and parent feedback signals',
    })
    expect(layout.order).toEqual(present)
  })
})

describe('toggle + move', () => {
  it('toggles hidden and moves order', () => {
    let layout = { order: ['a', 'b', 'c'], hidden: [] as string[] }
    layout = toggleHidden(layout, 'b', new Set())
    expect(layout.hidden).toEqual(['b'])
    layout = toggleHidden(layout, 'b', new Set())
    expect(layout.hidden).toEqual([])
    layout = moveSection(layout, 'c', 'up')
    expect(layout.order).toEqual(['a', 'c', 'b'])
  })
})
