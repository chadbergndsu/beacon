import { describe, expect, it } from 'vitest'
import { DEFAULT_SKIN, SKINS, isSkinId, parseSkinId } from './catalog'

describe('skins catalog', () => {
  it('has exactly 10 skins', () => {
    expect(SKINS).toHaveLength(10)
    const ids = new Set(SKINS.map((s) => s.id))
    expect(ids.size).toBe(10)
  })

  it('parses unknown to classic', () => {
    expect(parseSkinId('nope')).toBe(DEFAULT_SKIN)
    expect(isSkinId('cartoon')).toBe(true)
    expect(isSkinId('xyz')).toBe(false)
  })
})
