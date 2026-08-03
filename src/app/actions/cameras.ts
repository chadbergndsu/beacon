'use server'

import { revalidatePath } from 'next/cache'
import { requirePrincipal } from '@/lib/principal'
import {
  deleteCamera,
  detectCameraStreamKind,
  listCameras,
  upsertCamera,
} from '@/lib/school-modules/store'
import type { CameraStreamKind, SchoolCamera } from '@/lib/school-modules/types'

function revalidateCameras() {
  revalidatePath('/principal/cameras')
  revalidatePath('/principal')
}

export async function getPrincipalCameras() {
  const { schoolId } = await requirePrincipal()
  return listCameras(schoolId)
}

export async function saveSchoolCamera(input: {
  id?: string
  name: string
  location: string
  zone: SchoolCamera['zone']
  streamUrl: string
  streamKind?: CameraStreamKind | 'auto'
  snapshotUrl?: string
  notes?: string
  enabled: boolean
  sortOrder?: number
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { schoolId } = await requirePrincipal()
  const name = input.name.trim()
  const streamUrl = input.streamUrl.trim()
  if (!name) return { ok: false, error: 'Camera name is required.' }
  if (!streamUrl) return { ok: false, error: 'Stream URL is required.' }
  // Allow http(s) for HLS/go2rtc; also relative paths for same-origin reverse proxies
  if (!/^https?:\/\//i.test(streamUrl) && !streamUrl.startsWith('/')) {
    return {
      ok: false,
      error: 'Use an http(s) stream URL (go2rtc HLS/WebRTC page) or a site-relative path.',
    }
  }

  const existing = input.id
    ? (await listCameras(schoolId)).find((c) => c.id === input.id)
    : undefined

  const kind: CameraStreamKind =
    !input.streamKind || input.streamKind === 'auto'
      ? detectCameraStreamKind(streamUrl)
      : input.streamKind

  const now = new Date().toISOString()
  const camera: SchoolCamera = {
    id: input.id || `cam_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    location: input.location.trim() || 'Campus',
    zone: input.zone || 'other',
    streamUrl,
    streamKind: kind,
    snapshotUrl: input.snapshotUrl?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    enabled: input.enabled !== false,
    sortOrder:
      typeof input.sortOrder === 'number'
        ? input.sortOrder
        : existing?.sortOrder ?? (await listCameras(schoolId)).length,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }

  await upsertCamera(schoolId, camera)
  revalidateCameras()
  return { ok: true, id: camera.id }
}

export async function removeSchoolCamera(
  cameraId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { schoolId } = await requirePrincipal()
  await deleteCamera(schoolId, cameraId)
  revalidateCameras()
  return { ok: true }
}
