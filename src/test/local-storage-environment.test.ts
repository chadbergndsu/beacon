/** @vitest-environment jsdom */

import { describe, expect, it } from 'vitest'

describe('jsdom localStorage environment', () => {
  it('provides one standards-shaped storage instance to window and globalThis', () => {
    expect(window.localStorage).toBe(globalThis.localStorage)

    window.localStorage.clear()
    const storageWithJavaScriptInputs = window.localStorage as unknown as {
      setItem(key: unknown, value: unknown): void
    }
    storageWithJavaScriptInputs.setItem('answer', 42)
    window.localStorage.setItem('other', 'value')

    expect(window.localStorage.length).toBe(2)
    expect(window.localStorage.key(0)).toBe('answer')
    expect(globalThis.localStorage.getItem('answer')).toBe('42')

    globalThis.localStorage.removeItem('answer')
    expect(window.localStorage.getItem('answer')).toBeNull()

    globalThis.localStorage.clear()
    expect(window.localStorage.length).toBe(0)
    expect(window.localStorage.key(0)).toBeNull()
  })
})
