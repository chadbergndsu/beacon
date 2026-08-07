import { describe, expect, it } from 'vitest'
import { DEMO_SCHOOL_LAYOUT } from './layout'
import { buildSchoolGeometry } from './geometry'
import { getDefaultFloorId } from './campus'

describe('buildSchoolGeometry', () => {
  it('builds collision and lights per active floor', () => {
    const floorId = getDefaultFloorId(DEMO_SCHOOL_LAYOUT)
    const geo = buildSchoolGeometry(DEMO_SCHOOL_LAYOUT, floorId)
    expect(geo.floors.length).toBeGreaterThan(0)
    expect(geo.collision.length).toBeGreaterThan(10)
    expect(geo.portals.length).toBeGreaterThan(0)
    expect(geo.elevationY).toBe(0)
  })

  it('places locker banks in hallways on both floors', () => {
    const f1 = buildSchoolGeometry(DEMO_SCHOOL_LAYOUT, 'floor-1')
    const f2 = buildSchoolGeometry(DEMO_SCHOOL_LAYOUT, 'floor-2')
    expect(f1.lockers.length).toBeGreaterThan(10)
    expect(f2.lockers.length).toBeGreaterThan(10)
    expect(f1.lockers.some((b) => b.key.includes('locker'))).toBe(true)
  })

  it('uses floor elevation for upper level', () => {
    const geo = buildSchoolGeometry(DEMO_SCHOOL_LAYOUT, 'floor-2')
    expect(geo.elevationY).toBe(5)
  })
})
