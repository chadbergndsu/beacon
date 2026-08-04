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
  '/admin/emails',
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
    expect(resolveActiveNavHref('/principal/feedback', nav)).toBe('/principal')
  })

  it('treats / as home', () => {
    expect(resolveActiveNavHref('/', nav)).toBe('/dashboard')
  })
})
