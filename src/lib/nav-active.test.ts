import { describe, expect, it } from 'vitest'
import { resolveActiveNavHref } from './nav-active'

const nav = [
  '/dashboard',
  '/teacher/quick',
  '/teacher/lessons',
  '/teacher/calendar',
  '/teacher/printables',
  '/principal',
  '/principal/release',
  '/announcements',
  '/desk',
  '/school',
  '/about',
]

describe('resolveActiveNavHref', () => {
  it('highlights Printables on printables page', () => {
    expect(resolveActiveNavHref('/teacher/printables', nav)).toBe(
      '/teacher/printables'
    )
  })

  it('highlights Quick mode only on quick route', () => {
    expect(resolveActiveNavHref('/teacher/quick', nav)).toBe('/teacher/quick')
    expect(resolveActiveNavHref('/teacher/printables', nav)).not.toBe(
      '/teacher/quick'
    )
  })

  it('uses longest match for principal sub-routes', () => {
    expect(resolveActiveNavHref('/principal/release', nav)).toBe(
      '/principal/release'
    )
    // Overview is exact-only so deep principal pages do not stay green on Overview
    expect(resolveActiveNavHref('/principal/feedback', nav)).toBeNull()
    expect(resolveActiveNavHref('/principal', nav)).toBe('/principal')
    // Longer prefix wins over /principal
    expect(
      resolveActiveNavHref('/principal/approvals', [
        ...nav,
        '/principal/approvals',
      ])
    ).toBe('/principal/approvals')
  })

  it('treats / as home', () => {
    expect(resolveActiveNavHref('/', nav)).toBe('/dashboard')
  })

  it('lights Desk on /desk and /admin/emails', () => {
    expect(resolveActiveNavHref('/desk', nav)).toBe('/desk')
    expect(resolveActiveNavHref('/admin/emails', nav)).toBe('/desk')
  })
})
