import { describe, expect, it, vi } from 'vitest'
import { createInMemoryStorage, installLocalStorage } from './local-storage'

type StorageHost = { localStorage?: unknown }

function storageHost(storage: unknown): StorageHost {
  return { localStorage: storage }
}

describe('localStorage test setup', () => {
  it('falls back when reading window.localStorage throws and binds one shared instance', () => {
    const windowTarget: StorageHost = {}
    Object.defineProperty(windowTarget, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('opaque origin', 'SecurityError')
      },
    })
    const globalTarget: StorageHost = {}

    const storage = installLocalStorage(windowTarget, globalTarget)

    expect(windowTarget.localStorage).toBe(storage)
    expect(globalTarget.localStorage).toBe(storage)
    storage.setItem('answer', '42')
    expect(storage.getItem('answer')).toBe('42')
  })

  it('falls back when clear throws without changing existing entries', () => {
    const values = new Map([['preserve', 'yes']])
    const brokenStorage = {
      get length() {
        return values.size
      },
      clear() {
        throw new Error('clear failed')
      },
      getItem(key: string) {
        return values.get(key) ?? null
      },
      key(index: number) {
        return [...values.keys()][index] ?? null
      },
      removeItem(key: string) {
        values.delete(key)
      },
      setItem(key: string, value: string) {
        values.set(key, value)
      },
    }
    const windowTarget = storageHost(brokenStorage)
    const globalTarget: StorageHost = {}

    const storage = installLocalStorage(windowTarget, globalTarget)

    expect(storage).not.toBe(brokenStorage)
    expect(values).toEqual(new Map([['preserve', 'yes']]))
    expect(windowTarget.localStorage).toBe(globalTarget.localStorage)
  })

  it.each([
    ['empties', (values: Map<string, string>) => values.clear()],
    ['partially removes', (values: Map<string, string>) => values.delete('first')],
  ])('restores entries and removes probes when clear %s before throwing', (_, mutate) => {
    const values = new Map([
      ['first', 'one'],
      ['second', 'two'],
    ])
    const brokenStorage = {
      get length() {
        return values.size
      },
      clear() {
        mutate(values)
        throw new Error('clear failed after mutation')
      },
      getItem(key: string) {
        return values.get(key) ?? null
      },
      key(index: number) {
        return [...values.keys()][index] ?? null
      },
      removeItem(key: string) {
        values.delete(key)
      },
      setItem(key: string, value: string) {
        values.set(key, value)
      },
    }
    const windowTarget = storageHost(brokenStorage)
    const globalTarget: StorageHost = {}

    expect(() => installLocalStorage(windowTarget, globalTarget)).not.toThrow()

    expect(windowTarget.localStorage).not.toBe(brokenStorage)
    expect(windowTarget.localStorage).toBe(globalTarget.localStorage)
    expect(values).toEqual(
      new Map([
        ['first', 'one'],
        ['second', 'two'],
      ])
    )
    expect([...values.keys()].some((key) => key.startsWith('__beacon_vitest_local_storage_probe__'))).toBe(
      false
    )
  })

  it('falls back from partial and individually broken storage capabilities', () => {
    const partialStorage = {
      get length() {
        return 0
      },
      clear() {},
      getItem() {
        return null
      },
      removeItem() {},
      setItem() {},
    }
    const keyThrows = createInMemoryStorage()
    vi.spyOn(keyThrows, 'key').mockImplementation(() => {
      throw new Error('key failed')
    })
    const lengthThrows = createInMemoryStorage()
    Object.defineProperty(lengthThrows, 'length', {
      configurable: true,
      get() {
        throw new Error('length failed')
      },
    })
    const setItemDoesNothing = createInMemoryStorage()
    vi.spyOn(setItemDoesNothing, 'setItem').mockImplementation(() => {})
    const removeItemThrows = createInMemoryStorage()
    vi.spyOn(removeItemThrows, 'removeItem').mockImplementation(() => {
      throw new Error('remove failed')
    })

    for (const candidate of [
      partialStorage,
      keyThrows,
      lengthThrows,
      setItemDoesNothing,
      removeItemThrows,
    ]) {
      const storage = installLocalStorage(storageHost(candidate), {})
      expect(storage).not.toBe(candidate)
    }
  })

  it('validates and restores a native storage before binding it to both hosts', () => {
    const nativeStorage = createInMemoryStorage()
    nativeStorage.setItem('first', 'one')
    nativeStorage.setItem('second', 'two')
    nativeStorage.setItem('__beacon_vitest_local_storage_probe__0', 'reserved')
    const clear = vi.spyOn(nativeStorage, 'clear')
    const windowTarget = storageHost(nativeStorage)
    const globalTarget: StorageHost = {}

    const storage = installLocalStorage(windowTarget, globalTarget)

    expect(storage).toBe(nativeStorage)
    expect(clear).toHaveBeenCalled()
    expect([...Array(nativeStorage.length)].map((_, index) => nativeStorage.key(index))).toEqual([
      'first',
      'second',
      '__beacon_vitest_local_storage_probe__0',
    ])
    expect(nativeStorage.getItem('first')).toBe('one')
    expect(nativeStorage.getItem('second')).toBe('two')
    expect(nativeStorage.getItem('__beacon_vitest_local_storage_probe__0')).toBe('reserved')
  })

  it('implements the storage surface with coercion, insertion order, Web IDL key conversion, and hidden methods', () => {
    const storage = createInMemoryStorage()
    const writableStorage = storage as unknown as { setItem(key: unknown, value: unknown): void }

    writableStorage.setItem(1, true)
    writableStorage.setItem('second', 2)

    expect(storage.length).toBe(2)
    expect(storage.getItem('1')).toBe('true')
    expect(storage.key(NaN)).toBe('1')
    expect(storage.key(1.9)).toBe('second')
    expect(storage.key(-1)).toBeNull()
    expect(storage.key(2 ** 32)).toBe('1')
    expect(Object.keys(storage)).toEqual([])
    expect(Object.prototype.propertyIsEnumerable.call(storage, 'setItem')).toBe(false)
  })
})
