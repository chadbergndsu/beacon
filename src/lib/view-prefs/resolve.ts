import { defaultLayoutForScreen } from './registry'
import type { ScreenId, ScreenLayout, SectionDef } from './types'

/**
 * Merge saved prefs with the screen catalog for the sections actually
 * present on this render (role may omit some catalog entries).
 */
export function resolveScreenLayout(
  screenId: ScreenId,
  presentSectionIds: string[],
  saved: ScreenLayout | null | undefined,
  catalogSections: SectionDef[]
): ScreenLayout {
  const defaults = defaultLayoutForScreen(screenId)
  const present = new Set(presentSectionIds)
  const locked = new Set(
    catalogSections.filter((s) => s.locked).map((s) => s.id)
  )

  const savedOrder = (saved?.order ?? []).filter((id) => present.has(id))
  const rest = defaults.order.filter(
    (id) => present.has(id) && !savedOrder.includes(id)
  )
  // Any present id not in catalog defaults (forward-compat)
  const extras = presentSectionIds.filter(
    (id) => !savedOrder.includes(id) && !rest.includes(id)
  )
  const order = [...savedOrder, ...rest, ...extras]

  const hidden = (saved?.hidden ?? defaults.hidden).filter(
    (id) => present.has(id) && !locked.has(id)
  )

  return { order, hidden }
}

export function isSectionVisible(
  sectionId: string,
  layout: ScreenLayout,
  lockedIds: Set<string>
): boolean {
  if (lockedIds.has(sectionId)) return true
  return !layout.hidden.includes(sectionId)
}

export function toggleHidden(
  layout: ScreenLayout,
  sectionId: string,
  lockedIds: Set<string>
): ScreenLayout {
  if (lockedIds.has(sectionId)) return layout
  const hidden = new Set(layout.hidden)
  if (hidden.has(sectionId)) hidden.delete(sectionId)
  else hidden.add(sectionId)
  return { ...layout, hidden: [...hidden] }
}

export function moveSection(
  layout: ScreenLayout,
  sectionId: string,
  direction: 'up' | 'down'
): ScreenLayout {
  const order = [...layout.order]
  const i = order.indexOf(sectionId)
  if (i < 0) return layout
  const j = direction === 'up' ? i - 1 : i + 1
  if (j < 0 || j >= order.length) return layout
  ;[order[i], order[j]] = [order[j], order[i]]
  return { ...layout, order }
}

export function layoutsEqual(a: ScreenLayout, b: ScreenLayout): boolean {
  if (a.order.length !== b.order.length || a.hidden.length !== b.hidden.length) {
    return false
  }
  if (a.order.some((id, i) => id !== b.order[i])) return false
  const ha = [...a.hidden].sort()
  const hb = [...b.hidden].sort()
  return ha.every((id, i) => id === hb[i])
}
