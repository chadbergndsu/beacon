import { listRoomPresence } from '@/lib/badge/store'
import type { CraftPresenceRecord } from './types'

type StoreKey = string

const mockStore = new Map<StoreKey, CraftPresenceRecord>()

function storeKey(schoolId: string, studentId: string): StoreKey {
  return `${schoolId}:${studentId}`
}

export function upsertMockPresence(input: {
  schoolId: string
  studentId: string
  studentName: string
  roomId: string
  since?: string
}): CraftPresenceRecord {
  const rec: CraftPresenceRecord = {
    studentId: input.studentId,
    studentName: input.studentName,
    roomId: input.roomId,
    since: input.since ?? new Date().toISOString(),
    source: 'mock',
  }
  mockStore.set(storeKey(input.schoolId, input.studentId), rec)
  return rec
}

export function listMockPresence(schoolId: string): CraftPresenceRecord[] {
  const prefix = `${schoolId}:`
  return [...mockStore.entries()]
    .filter(([k]) => k.startsWith(prefix))
    .map(([, v]) => v)
}

export async function loadCampusPresence(opts: {
  schoolId: string
  layoutRoomIds: string[]
  layoutToDbRoom: Record<string, string>
  dbToLayoutRoom: Record<string, string>
}): Promise<CraftPresenceRecord[]> {
  const { schoolId, layoutRoomIds, layoutToDbRoom, dbToLayoutRoom } = opts
  const byStudent = new Map<string, CraftPresenceRecord>()

  for (const rec of listMockPresence(schoolId)) {
    if (layoutRoomIds.includes(rec.roomId)) {
      byStudent.set(rec.studentId, rec)
    }
  }

  for (const layoutRoomId of layoutRoomIds) {
    const dbRoomId = layoutToDbRoom[layoutRoomId]
    if (!dbRoomId) continue
    try {
      const present = await listRoomPresence(schoolId, dbRoomId)
      for (const p of present) {
        const mappedRoomId = dbToLayoutRoom[dbRoomId] ?? layoutRoomId
        byStudent.set(p.studentId, {
          studentId: p.studentId,
          studentName: p.studentName,
          roomId: mappedRoomId,
          since: p.since,
          source: 'badge',
        })
      }
    } catch {
      // DB unavailable — mock store still works for demos
    }
  }

  return [...byStudent.values()]
}

/** Dev helper — clears in-memory mock markers for one school. */
export function clearMockPresence(schoolId: string): void {
  const prefix = `${schoolId}:`
  for (const key of [...mockStore.keys()]) {
    if (key.startsWith(prefix)) mockStore.delete(key)
  }
}
