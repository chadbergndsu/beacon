'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { searchPeopleRecipients } from '@/app/actions/people-messaging'
import { Label } from '@/components/ui/label'
import {
  PEOPLE_RECENT_LIMIT,
  PEOPLE_SEARCH_RESULT_LIMIT,
  normalizePeopleRefs,
  peopleRefKey,
  type PeopleRecipientRef,
  type PeopleSearchResult,
} from '@/lib/email/people-types'

const RECENTS_STORAGE_KEY = 'beacon:people-message-recents:v1'
const GROUPS: PeopleSearchResult['group'][] = ['Faculty', 'Parents', 'Students']

type PeopleRecipientComboboxProps = {
  selected: PeopleSearchResult[]
  onChange: (selected: PeopleSearchResult[]) => void
  disabled?: boolean
}

function clearRecentRefs() {
  try {
    window.localStorage.removeItem(RECENTS_STORAGE_KEY)
  } catch {
    // Storage is optional and errors must not affect recipient selection.
  }
}

function readRecentRefs(): PeopleRecipientRef[] {
  try {
    const stored = window.localStorage.getItem(RECENTS_STORAGE_KEY)
    if (stored == null) return []
    const parsed: unknown = JSON.parse(stored)
    if (!Array.isArray(parsed)) {
      clearRecentRefs()
      return []
    }

    const refs = normalizePeopleRefs(parsed).slice(0, PEOPLE_RECENT_LIMIT)
    if (parsed.length > 0 && refs.length === 0) {
      clearRecentRefs()
      return []
    }
    const sanitized = refs.map((ref) => ({ kind: ref.kind, id: ref.id }))
    if (JSON.stringify(parsed) !== JSON.stringify(sanitized)) {
      window.localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(sanitized))
    }
    return sanitized
  } catch {
    clearRecentRefs()
    return []
  }
}

function persistRecentRef(ref: PeopleRecipientRef) {
  try {
    const recents = readRecentRefs()
    const next = [ref, ...recents.filter((recent) => peopleRefKey(recent) !== peopleRefKey(ref))]
      .slice(0, PEOPLE_RECENT_LIMIT)
      .map((recent) => ({ kind: recent.kind, id: recent.id }))
    window.localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Recents are optional and must never block recipient selection.
  }
}

function firstEnabledIndex(results: PeopleSearchResult[]) {
  return results.findIndex((result) => !result.disabledReason)
}

function nextEnabledIndex(results: PeopleSearchResult[], current: number, direction: 1 | -1) {
  if (results.length === 0) return -1
  for (let offset = 1; offset <= results.length; offset += 1) {
    const index = (current + direction * offset + results.length) % results.length
    if (!results[index].disabledReason) return index
  }
  return -1
}

export function PeopleRecipientCombobox({
  selected,
  onChange,
  disabled = false,
}: PeopleRecipientComboboxProps) {
  const inputId = useId()
  const listboxId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef(new Map<string, HTMLDivElement>())
  const latestRequest = useRef(0)
  const pendingRemovalFocusKey = useRef<string | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PeopleSearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emptyResult, setEmptyResult] = useState(false)

  const selectedKeys = useMemo(() => new Set(selected.map((result) => result.key)), [selected])
  const visibleResults = useMemo(
    () => results.filter((result) => !selectedKeys.has(result.key)),
    [results, selectedKeys]
  )
  const orderedResults = useMemo(
    () => GROUPS.flatMap((group) => visibleResults.filter((result) => result.group === group)),
    [visibleResults]
  )
  const selectableResults = useMemo(
    () => orderedResults.filter((result) => !result.disabledReason),
    [orderedResults]
  )
  const activeIndex = activeKey ? orderedResults.findIndex((result) => result.key === activeKey) : -1
  const activeResult = activeIndex >= 0 ? orderedResults[activeIndex] : undefined
  const selectedAnnouncement = `${selected.length} selected`
  const announcement = error
    ? error
    : pending
      ? `${selectedAnnouncement}. Searching recipients.`
      : open
        ? `${selectedAnnouncement}. ${selectableResults.length} selectable result${selectableResults.length === 1 ? '' : 's'} available.`
        : selectedAnnouncement

  const applyResults = useCallback((nextResults: PeopleSearchResult[], request: number) => {
    if (request !== latestRequest.current) return
    const limitedResults = nextResults.slice(0, PEOPLE_SEARCH_RESULT_LIMIT)
    setResults(limitedResults)
    setActiveKey(null)
    setOpen(limitedResults.length > 0)
    setEmptyResult(limitedResults.length === 0)
    setPending(false)
  }, [])

  useEffect(() => {
    const recentRefs = readRecentRefs()
    if (recentRefs.length === 0) return
    const request = ++latestRequest.current
    void searchPeopleRecipients({ query: '', recent_refs: recentRefs })
      .then((response) => {
        if (request !== latestRequest.current) return
        if (response.ok) {
          setError(null)
          applyResults(response.results, request)
          return
        }
        setError(response.error)
        setPending(false)
      })
      .catch(() => {
        if (request !== latestRequest.current) return
        setError('Unable to search People right now.')
        setPending(false)
      })
  }, [applyResults])

  useEffect(() => {
    return () => {
      latestRequest.current += 1
    }
  }, [])

  useEffect(() => {
    if (!activeResult) return
    optionRefs.current.get(activeResult.key)?.scrollIntoView({ block: 'nearest' })
  }, [activeResult])

  useEffect(() => {
    const removedKey = pendingRemovalFocusKey.current
    if (!removedKey || selected.some((result) => result.key === removedKey)) return
    pendingRemovalFocusKey.current = null
    inputRef.current?.focus()
  }, [selected])

  useEffect(() => {
    const trimmedQuery = query.trim()
    if (trimmedQuery.length < 2) return
    const request = latestRequest.current
    const timer = window.setTimeout(() => {
      void searchPeopleRecipients({ query, recent_refs: [] })
        .then((response) => {
          if (request !== latestRequest.current) return
          if (response.ok) {
            applyResults(response.results, request)
            return
          }
          setError(response.error)
          setPending(false)
        })
        .catch(() => {
          if (request !== latestRequest.current) return
          setError('Unable to search People right now.')
          setPending(false)
        })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [applyResults, query])

  const chooseResult = useCallback(
    (result: PeopleSearchResult) => {
      if (disabled || result.disabledReason || selectedKeys.has(result.key)) return
      onChange([...selected, result])
      persistRecentRef(result.ref)
      latestRequest.current += 1
      setQuery('')
      setResults([])
      setOpen(false)
      setActiveKey(null)
      setPending(false)
      setEmptyResult(false)
    },
    [disabled, onChange, selected, selectedKeys]
  )

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false)
      setActiveKey(null)
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (orderedResults.length === 0) return
      setOpen(true)
      if (activeIndex < 0) {
        const nextIndex =
          event.key === 'ArrowDown'
            ? firstEnabledIndex(orderedResults)
            : nextEnabledIndex(orderedResults, 0, -1)
        setActiveKey(nextIndex >= 0 ? orderedResults[nextIndex].key : null)
        return
      }
      const nextIndex = nextEnabledIndex(
        orderedResults,
        activeIndex,
        event.key === 'ArrowDown' ? 1 : -1
      )
      setActiveKey(nextIndex >= 0 ? orderedResults[nextIndex].key : null)
      return
    }
    if (event.key === 'Enter' && activeResult) {
      event.preventDefault()
      chooseResult(activeResult)
    }
  }

  const handleQueryChange = (nextQuery: string) => {
    latestRequest.current += 1
    setQuery(nextQuery)
    setResults([])
    setOpen(false)
    setActiveKey(null)
    setError(null)
    setEmptyResult(false)
    setPending(nextQuery.trim().length >= 2)
  }

  return (
    <div>
      <Label htmlFor={inputId}>To</Label>
      <div className="mt-1 flex min-h-12 flex-wrap items-center gap-2 rounded-lg border border-input bg-background p-2">
        {selected.map((item) => (
          <span
            key={item.key}
            className="inline-flex min-h-11 items-center gap-1 rounded-full bg-muted px-3"
          >
            <span>
              <span className="block text-sm font-medium">{item.label}</span>
              <span className="block text-xs text-muted-foreground">{item.context}</span>
            </span>
            <button
              type="button"
              aria-label={`Remove ${item.label}`}
              className="min-h-11 min-w-11 rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={disabled}
              onClick={() => {
                pendingRemovalFocusKey.current = item.key
                onChange(selected.filter((selectedItem) => selectedItem.key !== item.key))
              }}
            >
              <span aria-hidden="true">×</span>
            </button>
          </span>
        ))}
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={activeResult ? `${listboxId}-${activeResult.key}` : undefined}
          value={query}
          disabled={disabled}
          className="min-h-11 min-w-40 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
          placeholder="Search people"
          onChange={(event) => handleQueryChange(event.target.value)}
          onFocus={() => {
            if (visibleResults.length > 0) setOpen(true)
          }}
          onKeyDown={handleKeyDown}
        />
      </div>
      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="People search results"
          className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-input bg-background p-1 shadow-sm"
        >
          {GROUPS.map((group) => {
            const groupResults = orderedResults.filter((result) => result.group === group)
            if (groupResults.length === 0) return null
            return (
              <div key={group} role="group" aria-label={group}>
                <p className="px-3 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group}
                </p>
                {groupResults.map((result) => {
                  const index = orderedResults.indexOf(result)
                  const isDisabled = Boolean(result.disabledReason)
                  return (
                    <div
                      key={result.key}
                      ref={(node) => {
                        if (node) optionRefs.current.set(result.key, node)
                        else optionRefs.current.delete(result.key)
                      }}
                      id={`${listboxId}-${result.key}`}
                      role="option"
                      aria-selected={index === activeIndex}
                      aria-disabled={isDisabled || undefined}
                      className={`min-h-11 cursor-pointer rounded-md px-3 py-2 text-sm ${
                        index === activeIndex ? 'bg-muted' : ''
                      } ${isDisabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-muted'}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => chooseResult(result)}
                    >
                      <span className="block font-medium">{result.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {result.context}
                        {result.disabledReason ? ` · ${result.disabledReason}` : ''}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      ) : null}
      {emptyResult && query.trim().length >= 2 && !pending && !error ? (
        <p role="status" className="mt-2 text-sm text-muted-foreground">
          No permitted people found
        </p>
      ) : null}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}
