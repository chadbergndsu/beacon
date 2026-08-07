/**
 * Parse SVG floor-plan exports (rect/polygon) into BeaconCraft rooms on a grid.
 * Expects coordinates in SVG user units; applies scale to block grid.
 */

import type { CraftRoomDef } from './types'

export type SvgImportOptions = {
  scale?: number
  offsetX?: number
  offsetZ?: number
  defaultKind?: CraftRoomDef['kind']
  namePrefix?: string
}

const COLORS = ['#bfdbfe', '#bbf7d0', '#fde68a', '#fca5a5', '#c4b5fd', '#fcd34d']

function parseNumber(v: string | null | undefined, fallback = 0): number {
  if (!v) return fallback
  const n = Number.parseFloat(v)
  return Number.isFinite(n) ? n : fallback
}

export function parseSvgFloorPlan(svg: string, opts: SvgImportOptions = {}): CraftRoomDef[] {
  const scale = opts.scale ?? 0.05
  const offsetX = opts.offsetX ?? 0
  const offsetZ = opts.offsetZ ?? 0
  const kind = opts.defaultKind ?? 'classroom'
  const prefix = opts.namePrefix ?? 'Imported'

  const rooms: CraftRoomDef[] = []
  let idx = 0

  const rectRe = /<rect\b([^>]*)\/?>/gi
  let match: RegExpExecArray | null
  while ((match = rectRe.exec(svg))) {
    const attrs = match[1] || ''
    const x = parseNumber(/x="([^"]+)"/i.exec(attrs)?.[1])
    const y = parseNumber(/y="([^"]+)"/i.exec(attrs)?.[1])
    const w = parseNumber(/width="([^"]+)"/i.exec(attrs)?.[1])
    const h = parseNumber(/height="([^"]+)"/i.exec(attrs)?.[1])
    if (w < 1 || h < 1) continue

    const id = `craft-import-${++idx}`
    rooms.push({
      roomId: id,
      name: `${prefix} ${idx}`,
      kind,
      origin: [Math.round(x * scale + offsetX), 0, Math.round(y * scale + offsetZ)],
      size: [Math.max(3, Math.round(w * scale)), 4, Math.max(3, Math.round(h * scale))],
      color: COLORS[idx % COLORS.length]!,
    })
  }

  return rooms
}

export function parseJsonLayout(text: string): unknown {
  return JSON.parse(text) as unknown
}
