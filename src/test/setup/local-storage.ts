import { beforeEach } from 'vitest'

type StorageLike = Pick<Storage, 'clear' | 'getItem' | 'key' | 'removeItem' | 'setItem'> & {
  readonly length: number
}

function createInMemoryStorage(): StorageLike {
  const values = new Map<string, string>()

  return {
    get length() {
      return values.size
    },
    clear() {
      values.clear()
    },
    getItem(key) {
      return values.get(String(key)) ?? null
    },
    key(index) {
      return [...values.keys()][Number(index)] ?? null
    },
    removeItem(key) {
      values.delete(String(key))
    },
    setItem(key, value) {
      values.set(String(key), String(value))
    },
  }
}

function hasWorkingStorage(value: unknown): value is StorageLike {
  if (
    value === null ||
    typeof value !== 'object' ||
    !('clear' in value) ||
    !('getItem' in value) ||
    !('key' in value) ||
    !('removeItem' in value) ||
    !('setItem' in value)
  ) {
    return false
  }

  const storage = value as StorageLike
  const hasStorageMethods =
    typeof storage.clear === 'function' &&
    typeof storage.getItem === 'function' &&
    typeof storage.key === 'function' &&
    typeof storage.removeItem === 'function' &&
    typeof storage.setItem === 'function'

  if (!hasStorageMethods) return false

  const probeKey = '__beacon_vitest_local_storage_probe__'

  try {
    const originalValue = storage.getItem(probeKey)
    storage.setItem(probeKey, 'probe')
    const wroteProbe = storage.getItem(probeKey) === 'probe'

    if (originalValue === null) {
      storage.removeItem(probeKey)
    } else {
      storage.setItem(probeKey, originalValue)
    }

    return wroteProbe && storage.getItem(probeKey) === originalValue
  } catch {
    return false
  }
}

if (typeof window !== 'undefined') {
  const nativeStorage = hasWorkingStorage(window.localStorage) ? window.localStorage : null
  const storage = nativeStorage ?? createInMemoryStorage()

  Object.defineProperty(window, 'localStorage', { configurable: true, value: storage })
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })

  if (nativeStorage === null) {
    beforeEach(() => {
      storage.clear()
    })
  }
}
