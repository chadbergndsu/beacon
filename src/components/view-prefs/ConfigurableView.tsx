'use client'

import {
  Children,
  isValidElement,
  useMemo,
  useState,
  useTransition,
  type ReactElement,
  type ReactNode,
} from 'react'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  LayoutGrid,
  Loader2,
  RotateCcw,
  X,
} from 'lucide-react'
import { saveViewLayoutAction } from '@/app/actions/view-prefs'
import { getScreenCatalog } from '@/lib/view-prefs/registry'
import {
  isSectionVisible,
  layoutsEqual,
  moveSection,
  resolveScreenLayout,
  toggleHidden,
} from '@/lib/view-prefs/resolve'
import {
  clearLocalLayout,
  readLocalLayouts,
  writeLocalLayout,
} from '@/lib/view-prefs/local'
import type { ScreenId, ScreenLayout } from '@/lib/view-prefs/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ViewSection } from './ViewSection'

type SectionChildProps = {
  id: string
  title: string
  description?: string
  locked?: boolean
  className?: string
  children?: ReactNode
}

function isViewSectionElement(
  child: ReactNode
): child is ReactElement<SectionChildProps> {
  if (!isValidElement(child)) return false
  const t = child.type as {
    displayName?: string
    __beaconViewSection?: string
    name?: string
  }
  if (child.type === ViewSection) return true
  if (t?.__beaconViewSection === 'beacon.ViewSection') return true
  if (t?.displayName === 'ViewSection') return true
  // Fallback: explicit id+title props from our ViewSection API
  const p = child.props as Partial<SectionChildProps>
  return typeof p?.id === 'string' && typeof p?.title === 'string' && p.id.length > 0
}

function mergeInitialLayout(
  screenId: ScreenId,
  presentIds: string[],
  serverLayout: ScreenLayout
): ScreenLayout {
  const catalog = getScreenCatalog(screenId).sections
  const local = readLocalLayouts()[screenId]
  // Prefer local if user edited offline / before migration
  const saved = local ?? serverLayout
  return resolveScreenLayout(screenId, presentIds, saved, catalog)
}

export function ConfigurableView({
  screenId,
  initialLayout,
  children,
  className,
}: {
  screenId: ScreenId
  /** Resolved server layout (or defaults). */
  initialLayout: ScreenLayout
  children: ReactNode
  className?: string
}) {
  const catalog = getScreenCatalog(screenId)
  const rawSections = useMemo(() => {
    return Children.toArray(children).filter(isViewSectionElement)
  }, [children])

  const presentIds = useMemo(
    () => rawSections.map((c) => c.props.id),
    [rawSections]
  )

  const lockedIds = useMemo(() => {
    const set = new Set<string>()
    for (const s of catalog.sections) {
      if (s.locked) set.add(s.id)
    }
    for (const c of rawSections) {
      if (c.props.locked) set.add(c.props.id)
    }
    return set
  }, [catalog.sections, rawSections])

  const [layout, setLayout] = useState<ScreenLayout>(() =>
    // server render + first client paint use server layout; local merge after mount via...
    resolveScreenLayout(screenId, presentIds, initialLayout, catalog.sections)
  )
  const [hydrated, setHydrated] = useState(false)
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Merge localStorage once on client without useEffect setState lint — use lazy pattern:
  // Call during render with guard (React 19 allows if careful). Prefer useEffect is flagged.
  // We'll use a small pattern: if !hydrated && typeof window, compute merged and setHydrated via...
  // Actually the cleanest lint-safe approach is onOpen edit or a button "Sync".
  // Or: key off requestAnimationFrame in event from Edit click.
  // For first paint SSR match, hydrate local on first edit open AND on first interaction.
  function ensureLocalHydrated() {
    if (hydrated || typeof window === 'undefined') return
    const merged = mergeInitialLayout(screenId, presentIds, initialLayout)
    if (!layoutsEqual(merged, layout)) {
      setLayout(merged)
    }
    setHydrated(true)
  }

  const sectionMeta = useMemo(() => {
    const map = new Map<string, { title: string; description?: string; locked: boolean }>()
    for (const def of catalog.sections) {
      map.set(def.id, {
        title: def.label,
        description: def.description,
        locked: Boolean(def.locked),
      })
    }
    for (const c of rawSections) {
      const prev = map.get(c.props.id)
      map.set(c.props.id, {
        title: c.props.title || prev?.title || c.props.id,
        description: c.props.description ?? prev?.description,
        locked: Boolean(c.props.locked || prev?.locked || lockedIds.has(c.props.id)),
      })
    }
    return map
  }, [catalog.sections, rawSections, lockedIds])

  const orderedSections = useMemo(() => {
    const byId = new Map(rawSections.map((c) => [c.props.id, c]))
    const ordered: ReactElement<SectionChildProps>[] = []
    for (const id of layout.order) {
      const el = byId.get(id)
      if (el) {
        ordered.push(el)
        byId.delete(id)
      }
    }
    for (const el of byId.values()) ordered.push(el)
    return ordered
  }, [rawSections, layout.order])

  function openEditor() {
    ensureLocalHydrated()
    setMessage(null)
    setError(null)
    setEditing(true)
  }

  function save() {
    setMessage(null)
    setError(null)
    writeLocalLayout(screenId, layout)
    startTransition(async () => {
      const result = await saveViewLayoutAction(screenId, layout)
      if (!result.ok) {
        setError(result.error)
        setMessage('Saved on this device. Cloud save needs a one-time DB update.')
        return
      }
      setMessage('View saved for your account.')
      setEditing(false)
    })
  }

  function resetDefaults() {
    const defaults = resolveScreenLayout(
      screenId,
      presentIds,
      null,
      catalog.sections
    )
    setLayout(defaults)
    clearLocalLayout(screenId)
    setMessage(null)
    setError(null)
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div className="print:hidden flex flex-wrap items-center justify-end gap-2">
        {!editing ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={openEditor}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Edit view
          </Button>
        ) : (
          <div className="flex w-full flex-col gap-3 rounded-2xl border border-sky-200 bg-sky-50/90 p-4 shadow-sm dark:border-sky-900 dark:bg-sky-950/40">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-navy dark:text-sky-50">
                  Edit view — {catalog.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Show, hide, or reorder sections. Saved to your account (and this browser).
                  Other people keep their own layout.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={resetDefaults}
                  className="gap-1"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(false)}
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={save}
                  disabled={pending}
                  className="gap-1"
                >
                  {pending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Save view
                </Button>
              </div>
            </div>

            <ul className="divide-y rounded-xl border border-sky-100 bg-white dark:border-sky-900 dark:bg-slate-900">
              {orderedSections.map((el, index) => {
                const id = el.props.id
                const meta = sectionMeta.get(id)
                const locked = lockedIds.has(id)
                const visible = isSectionVisible(id, layout, lockedIds)
                return (
                  <li
                    key={id}
                    className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:flex-nowrap"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-sky-50">
                        {meta?.title ?? id}
                        {locked ? (
                          <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Required
                          </span>
                        ) : null}
                      </p>
                      {meta?.description ? (
                        <p className="text-xs text-muted-foreground">{meta.description}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        disabled={index === 0}
                        aria-label={`Move ${meta?.title ?? id} up`}
                        onClick={() => setLayout((L) => moveSection(L, id, 'up'))}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        disabled={index === orderedSections.length - 1}
                        aria-label={`Move ${meta?.title ?? id} down`}
                        onClick={() => setLayout((L) => moveSection(L, id, 'down'))}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={visible ? 'outline' : 'secondary'}
                        className="gap-1"
                        disabled={locked}
                        onClick={() =>
                          setLayout((L) => toggleHidden(L, id, lockedIds))
                        }
                      >
                        {visible ? (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            Shown
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3.5 w-3.5" />
                            Hidden
                          </>
                        )}
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>

            {message && (
              <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200">
                {message}
              </p>
            )}
            {error && (
              <p className="text-xs text-amber-900 dark:text-amber-100">{error}</p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-8">
        {orderedSections.map((el) => {
          const id = el.props.id
          const visible = isSectionVisible(id, layout, lockedIds)
          if (!visible && !editing) return null
          return (
            <div
              key={id}
              data-view-section={id}
              className={cn(
                !visible &&
                  editing &&
                  'relative rounded-xl border border-dashed border-slate-300 p-3 opacity-60'
              )}
            >
              {editing && (
                <div className="print:hidden mb-2 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <span>{sectionMeta.get(id)?.title ?? id}</span>
                  {!visible && <span className="text-amber-700">Hidden</span>}
                </div>
              )}
              {visible || editing ? el : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
