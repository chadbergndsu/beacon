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
  const catalogOrder = defaults.order.filter((id) => present.has(id))
  const order = [...savedOrder]

  for (const id of catalogOrder) {
    if (order.includes(id)) continue

    const catalogIndex = catalogOrder.indexOf(id)
    let insertionIndex = -1

    for (let i = catalogIndex - 1; i >= 0; i -= 1) {
      const previousIndex = order.indexOf(catalogOrder[i])
      if (previousIndex >= 0) {
        insertionIndex = previousIndex + 1
        break
      }
    }

    if (insertionIndex < 0) {
      for (let i = catalogIndex + 1; i < catalogOrder.length; i += 1) {
        const nextIndex = order.indexOf(catalogOrder[i])
        if (nextIndex >= 0) {
          insertionIndex = nextIndex
          break
        }
      }
    }

    order.splice(insertionIndex < 0 ? order.length : insertionIndex, 0, id)
  }

  // Any present id not in catalog defaults (forward-compat)
  const extras = presentSectionIds.filter(
    (id) => !order.includes(id)
  )
  order.push(...extras)

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
