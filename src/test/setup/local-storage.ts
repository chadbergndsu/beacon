import { beforeEach } from 'vitest'

export type StorageLike = Pick<Storage, 'clear' | 'getItem' | 'key' | 'removeItem' | 'setItem'> & {
  readonly length: number
}

export type StorageHost = { localStorage?: unknown }

function toUnsignedLong(value: number): number {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue) || numericValue === 0) return 0
  return Math.trunc(numericValue) >>> 0
}

export function createInMemoryStorage(): StorageLike {
  const values = new Map<string, string>()
  const storage = {}

  Object.defineProperties(storage, {
    length: {
      configurable: true,
      enumerable: false,
      get: () => values.size,
    },
    clear: {
      configurable: true,
      enumerable: false,
      value: () => values.clear(),
      writable: true,
    },
    getItem: {
      configurable: true,
      enumerable: false,
      value: (key: unknown) => values.get(String(key)) ?? null,
      writable: true,
    },
    key: {
      configurable: true,
      enumerable: false,
      value: (index: number) => [...values.keys()][toUnsignedLong(index)] ?? null,
      writable: true,
    },
    removeItem: {
      configurable: true,
      enumerable: false,
      value: (key: unknown) => values.delete(String(key)),
      writable: true,
    },
    setItem: {
      configurable: true,
      enumerable: false,
      value: (key: unknown, value: unknown) => values.set(String(key), String(value)),
      writable: true,
    },
  })

  return storage as StorageLike
}

function isStorageLike(value: unknown): value is StorageLike {
  if (value === null || typeof value !== 'object') return false

  const storage = value as StorageLike
  try {
    return (
      typeof storage.clear === 'function' &&
      typeof storage.getItem === 'function' &&
      typeof storage.key === 'function' &&
      typeof storage.removeItem === 'function' &&
      typeof storage.setItem === 'function'
    )
  } catch {
    return false
  }
}

function snapshotStorage(storage: StorageLike): Array<[string, string]> {
  const length = storage.length
  if (!Number.isSafeInteger(length) || length < 0) {
    throw new TypeError('Storage length must be a non-negative safe integer')
  }

  const entries: Array<[string, string]> = []
  for (let index = 0; index < length; index += 1) {
    const key = storage.key(index)
    if (typeof key !== 'string') throw new TypeError('Storage key must be a string')
    const value = storage.getItem(key)
    if (typeof value !== 'string') throw new TypeError('Storage value must be a string')
    entries.push([key, value])
  }
  return entries
}

function restoreStorage(storage: StorageLike, entries: Array<[string, string]>): boolean {
  let removedCurrentEntries = false

  try {
    const currentEntries = snapshotStorage(storage)
    removedCurrentEntries = true
    for (const [key] of currentEntries) {
      storage.removeItem(key)
    }
  } catch {
    // Keep restoring original entries even when the broken storage cannot be cleaned fully.
  }

  let restoredEntries = true
  for (const [key, value] of entries) {
    try {
      storage.setItem(key, value)
    } catch {
      restoredEntries = false
    }
  }

  try {
    return removedCurrentEntries && restoredEntries && entriesMatch(storage, entries)
  } catch {
    return false
  }
}

function entriesMatch(storage: StorageLike, expectedEntries: Array<[string, string]>): boolean {
  return JSON.stringify(snapshotStorage(storage)) === JSON.stringify(expectedEntries)
}

function hasWorkingStorage(value: unknown): value is StorageLike {
  if (!isStorageLike(value)) return false

  const storage = value
  let entries: Array<[string, string]> | null = null

  try {
    entries = snapshotStorage(storage)
    const existingKeys = new Set(entries.map(([key]) => key))
    let probeIndex = 0
    let probeKey = '__beacon_vitest_local_storage_probe__0'
    while (existingKeys.has(probeKey)) {
      probeIndex += 1
      probeKey = `__beacon_vitest_local_storage_probe__${probeIndex}`
    }
    const initialLength = storage.length

    storage.setItem(probeKey, 'probe')
    const wroteProbe =
      storage.length === initialLength + 1 &&
      storage.getItem(probeKey) === 'probe' &&
      storage.key(initialLength) === probeKey
    storage.removeItem(probeKey)
    const removedProbe = storage.getItem(probeKey) === null && storage.length === initialLength

    storage.clear()
    const cleared = storage.length === 0 && storage.key(0) === null
    restoreStorage(storage, entries)

    return wroteProbe && removedProbe && cleared && entriesMatch(storage, entries)
  } catch {
    if (entries !== null) {
      try {
        restoreStorage(storage, entries)
      } catch {
        // The inaccessible native storage will be replaced below.
      }
    }
    return false
  }
}

function readStorage(host: StorageHost): unknown {
  try {
    return host.localStorage
  } catch {
    return undefined
  }
}

export function installLocalStorage(windowTarget: StorageHost, globalTarget: StorageHost): StorageLike {
  const candidate = readStorage(windowTarget)
  const storage = hasWorkingStorage(candidate) ? candidate : createInMemoryStorage()

  Object.defineProperty(windowTarget, 'localStorage', { configurable: true, value: storage })
  Object.defineProperty(globalTarget, 'localStorage', { configurable: true, value: storage })

  return storage
}

if (typeof window !== 'undefined') {
  const storage = installLocalStorage(window, globalThis)

  beforeEach(() => {
    storage.clear()
  })
}
