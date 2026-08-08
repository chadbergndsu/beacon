import type { Role } from '@/lib/types'

export const PEOPLE_SEARCH_MIN_CHARS = 2
export const PEOPLE_SEARCH_RESULT_LIMIT = 20
export const PEOPLE_RECENT_LIMIT = 8
export const PEOPLE_SELECTION_LIMIT = 50
export const PEOPLE_DELIVERY_LIMIT = 100

export type FacultyRole = Extract<Role, 'admin' | 'staff' | 'principal' | 'teacher'>
export type PeopleRecipientRef =
  | { kind: 'profile'; id: string }
  | { kind: 'student'; id: string }

export type PeopleSearchResult = {
  key: string
  ref: PeopleRecipientRef
  group: 'Faculty' | 'Parents' | 'Students'
  label: string
  context: string
  recipientCount: number
  disabledReason: string | null
}

export type PeopleSelectionPreview = PeopleSearchResult & {
  recipientNames: string[]
}

export type PeoplePreview = {
  selectedCount: number
  recipientCount: number
  selections: PeopleSelectionPreview[]
  unavailableCount: number
}

export type PeopleMessageResult =
  | { ok: true; sent: number; failed: number; skipped: number; note?: string }
  | { ok: false; error: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function normalizePeopleQuery(value: unknown): string {
  const query = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, 80) : ''
  return query.length >= PEOPLE_SEARCH_MIN_CHARS ? query : ''
}

export function peopleRefKey(ref: PeopleRecipientRef): string {
  return `${ref.kind}:${ref.id}`
}

export function normalizePeopleRefs(value: unknown): PeopleRecipientRef[] {
  if (!Array.isArray(value) || value.length > PEOPLE_SELECTION_LIMIT) return []
  const refs = new Map<string, PeopleRecipientRef>()
  let invalid = false
  for (const candidate of value) {
    if (!candidate || typeof candidate !== 'object') {
      invalid = true
      continue
    }
    const kind = Reflect.get(candidate, 'kind')
    const id = Reflect.get(candidate, 'id')
    if ((kind !== 'profile' && kind !== 'student') || typeof id !== 'string' || !UUID.test(id)) {
      invalid = true
      continue
    }
    const ref = { kind, id } as PeopleRecipientRef
    refs.set(peopleRefKey(ref), ref)
  }
  return invalid ? [] : [...refs.values()]
}
