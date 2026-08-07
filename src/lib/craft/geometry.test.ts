import { describe, expect, it } from 'vitest'
import { DEMO_SCHOOL_LAYOUT } from './layout'
import { buildSchoolGeometry } from './geometry'
import { parseCraftLayout } from './layout-validate'

describe('buildSchoolGeometry', () => {
  it('builds collision and lights for demo campus', () => {
    const geo = buildSchoolGeometry(DEMO_SCHOOL_LAYOUT)
    expect(geo.floors.length).toBe(DEMO_SCHOOL_LAYOUT.rooms.length)
    expect(geo.collision.length).toBeGreaterThan(10)
    expect(geo.lights.length).toBe(DEMO_SCHOOL_LAYOUT.rooms.length)
    expect(geo.windows.length).toBeGreaterThan(0)
  })
})

describe('parseCraftLayout', () => {
  it('accepts valid layout JSON', () => {
    const parsed = parseCraftLayout(DEMO_SCHOOL_LAYOUT)
    expect(parsed?.id).toBe(DEMO_SCHOOL_LAYOUT.id)
  })

  it('rejects invalid layout', () => {
    expect(parseCraftLayout({ version: 2 })).toBeNull()
  })
})
