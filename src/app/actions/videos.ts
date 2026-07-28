'use server'

import { revalidatePath } from 'next/cache'
import { requirePrincipal } from '@/lib/principal'
import {
  deleteVideo,
  detectVideoProvider,
  listVideos,
  upsertVideo,
} from '@/lib/school-modules/store'
import type { SchoolVideo } from '@/lib/school-modules/types'

export async function getPrincipalVideos() {
  const { schoolId } = await requirePrincipal()
  return listVideos(schoolId)
}

export async function saveSchoolVideo(input: {
  id?: string
  title: string
  description: string
  url: string
  category: SchoolVideo['category']
  featured: boolean
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { schoolId, user } = await requirePrincipal()
  const title = input.title.trim()
  const url = input.url.trim()
  if (!title) return { ok: false, error: 'Title is required.' }
  if (!url.startsWith('http')) return { ok: false, error: 'Enter a valid video URL.' }

  const video: SchoolVideo = {
    id: input.id || `vid_${Date.now().toString(36)}`,
    title,
    description: input.description.trim(),
    url,
    provider: detectVideoProvider(url),
    category: input.category,
    featured: input.featured,
    createdAt: new Date().toISOString(),
    createdBy: user.id,
  }

  await upsertVideo(schoolId, video)
  revalidatePath('/principal/videos')
  revalidatePath('/principal')
  return { ok: true }
}

export async function removeSchoolVideo(
  videoId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { schoolId } = await requirePrincipal()
  await deleteVideo(schoolId, videoId)
  revalidatePath('/principal/videos')
  revalidatePath('/principal')
  return { ok: true }
}
