/**
 * Per-school branding — Beacon is multi-tenant.
 * Prefer schools.name + schools.settings.brand; never hardcode one academy.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { cache } from 'react'

export type SchoolBrand = {
  schoolId: string | null
  name: string
  shortName: string
  tagline: string
  websiteUrl: string | null
  email: string | null
  phone: string | null
  city: string | null
  state: string | null
  mission: string | null
  gradesServed: string | null
  curriculumNote: string | null
  logoLetter: string
}

export const DEFAULT_BRAND: SchoolBrand = {
  schoolId: null,
  name: 'Your School',
  shortName: 'School',
  tagline: 'Academics · Families · Operations',
  websiteUrl: null,
  email: null,
  phone: null,
  city: null,
  state: null,
  mission: null,
  gradesServed: null,
  curriculumNote: null,
  logoLetter: 'B',
}

type BrandSettings = {
  brand?: Partial<{
    shortName: string
    tagline: string
    websiteUrl: string
    email: string
    phone: string
    city: string
    state: string
    mission: string
    gradesServed: string
    curriculumNote: string
    logoLetter: string
  }>
  releaseChecklist?: Record<string, boolean>
  [key: string]: unknown
}

function shortFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 12)
  const initials = words
    .filter((w) => w[0] === w[0]?.toUpperCase() && /[A-Za-z]/.test(w[0]))
    .map((w) => w[0])
    .join('')
  if (initials.length >= 2 && initials.length <= 5) return initials
  return words[0].slice(0, 12)
}

export function brandFromSchoolRow(row: {
  id: string
  name: string | null
  settings?: unknown
} | null): SchoolBrand {
  if (!row) return { ...DEFAULT_BRAND }
  const settings = (row.settings || {}) as BrandSettings
  const b = settings.brand || {}
  const name = (row.name || DEFAULT_BRAND.name).trim()
  return {
    schoolId: row.id,
    name,
    shortName: (b.shortName || shortFromName(name)).trim(),
    tagline: (b.tagline || DEFAULT_BRAND.tagline).trim(),
    websiteUrl: b.websiteUrl?.trim() || null,
    email: b.email?.trim() || null,
    phone: b.phone?.trim() || null,
    city: b.city?.trim() || null,
    state: b.state?.trim() || null,
    mission: b.mission?.trim() || null,
    gradesServed: b.gradesServed?.trim() || null,
    curriculumNote: b.curriculumNote?.trim() || null,
    logoLetter: (b.logoLetter || name[0] || 'B').slice(0, 1).toUpperCase(),
  }
}

/**
 * Resolve public school by host (e.g. lca.beacon.example) or path slug.
 * Settings.brand.publicSlug or shortName slug used for matching.
 */
export async function loadSchoolBrandByPublicKey(
  key: string | null | undefined
): Promise<SchoolBrand> {
  const slug = (key || '').trim().toLowerCase()
  if (!slug) return loadSchoolBrand(null)
  try {
    const admin = createAdminClient()
    const { data: schools } = await admin
      .from('schools')
      .select('id, name, settings')
      .limit(50)
    for (const row of schools ?? []) {
      const brand = brandFromSchoolRow(row)
      const publicSlug = (
        ((row.settings || {}) as { brand?: { publicSlug?: string } }).brand?.publicSlug ||
        brand.shortName ||
        ''
      )
        .toLowerCase()
        .replace(/\s+/g, '-')
      if (publicSlug === slug || row.id === slug) return brand
    }
  } catch {
    /* fall through */
  }
  return loadSchoolBrand(null)
}

export const loadSchoolBrand = cache(async function loadSchoolBrand(
  schoolId: string | null | undefined
): Promise<SchoolBrand> {
  if (!schoolId) {
    // Single-tenant fallback: only if exactly one school exists
    try {
      const admin = createAdminClient()
      const { data: rows, count } = await admin
        .from('schools')
        .select('id, name, settings', { count: 'exact' })
        .order('created_at', { ascending: true })
        .limit(2)
      if ((count ?? rows?.length ?? 0) === 1 && rows?.[0]) {
        return brandFromSchoolRow(rows[0])
      }
      // Multi-school without explicit id: generic brand (avoid wrong tenant)
      if ((count ?? 0) > 1) {
        return {
          ...DEFAULT_BRAND,
          name: 'School site',
          shortName: 'Beacon',
          mission: 'Set brand.publicSlug and open /school?school=your-slug',
        }
      }
    } catch {
      /* env not ready */
    }
    return { ...DEFAULT_BRAND }
  }

  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('schools')
      .select('id, name, settings')
      .eq('id', schoolId)
      .maybeSingle()
    return brandFromSchoolRow(data)
  } catch {
    return { ...DEFAULT_BRAND }
  }
})

export function locationLine(brand: SchoolBrand): string | null {
  const parts = [brand.city, brand.state].filter(Boolean)
  return parts.length ? parts.join(', ') : null
}
