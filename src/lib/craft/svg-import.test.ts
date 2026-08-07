import { describe, expect, it } from 'vitest'
import { parseSvgFloorPlan } from './svg-import'
import { normalizeCampusLayout } from './campus'
import { DEMO_SCHOOL_LAYOUT } from './layout'
import { parseCraftLayout } from './layout-validate'

describe('parseSvgFloorPlan', () => {
  it('extracts rect elements as rooms', () => {
    const svg = `<svg><rect x="0" y="0" width="200" height="120"/><rect x="220" y="0" width="180" height="100"/></svg>`
    const rooms = parseSvgFloorPlan(svg, { scale: 0.05 })
    expect(rooms.length).toBe(2)
    expect(rooms[0]?.size[0]).toBeGreaterThan(0)
  })
})

describe('parseCraftLayout v2', () => {
  it('accepts multi-floor demo campus', () => {
    const parsed = parseCraftLayout(DEMO_SCHOOL_LAYOUT)
    expect(parsed?.version).toBe(2)
    expect(parsed?.floors.length).toBeGreaterThan(1)
    expect(parsed?.portals.length).toBeGreaterThan(0)
  })

  it('normalizes v1 layouts', () => {
    const v1 = {
      version: 1 as const,
      id: 'legacy',
      name: 'Legacy',
      blockSize: 1,
      floorY: 0,
      rooms: DEMO_SCHOOL_LAYOUT.floors[0]!.rooms.slice(0, 2),
    }
    const parsed = parseCraftLayout(v1)
    expect(parsed?.version).toBe(2)
    expect(normalizeCampusLayout(v1)?.floors[0]?.rooms.length).toBe(2)
  })
})
