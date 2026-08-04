import type { ScreenId, ScreenLayout, ViewLayoutsMap } from './types'

const LOCAL_KEY = 'beacon:viewLayouts'

export function readLocalLayouts(): ViewLayoutsMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as ViewLayoutsMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function writeLocalLayout(screenId: ScreenId, layout: ScreenLayout) {
  if (typeof window === 'undefined') return
  try {
    const all = readLocalLayouts()
    all[screenId] = layout
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(all))
  } catch {
    // ignore quota / private mode
  }
}

export function clearLocalLayout(screenId: ScreenId) {
  if (typeof window === 'undefined') return
  try {
    const all = readLocalLayouts()
    delete all[screenId]
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(all))
  } catch {
    // ignore
  }
}
