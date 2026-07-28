import { createAdminClient } from '@/lib/supabase/admin'
import {
  emptyModules,
  type LessonPlan,
  type PulseEntry,
  type SchoolModulesState,
  type SchoolVideo,
} from '@/lib/school-modules/types'

type SchoolSettings = {
  modules?: SchoolModulesState
  [key: string]: unknown
}

export async function loadModules(schoolId: string): Promise<SchoolModulesState> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('schools')
    .select('settings')
    .eq('id', schoolId)
    .maybeSingle()

  const settings = (data?.settings || {}) as SchoolSettings
  if (!settings.modules) return emptyModules()
  return {
    lessonPlans: settings.modules.lessonPlans ?? [],
    pulses: settings.modules.pulses ?? [],
    videos: settings.modules.videos ?? [],
  }
}

async function saveModules(schoolId: string, modules: SchoolModulesState) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('schools')
    .select('settings')
    .eq('id', schoolId)
    .maybeSingle()

  const settings = { ...((data?.settings || {}) as SchoolSettings), modules }
  const { error } = await admin.from('schools').update({ settings }).eq('id', schoolId)
  if (error) throw new Error(error.message)
}

export async function listLessonPlans(schoolId: string, classId: string) {
  const m = await loadModules(schoolId)
  return m.lessonPlans
    .filter((p) => p.classId === classId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))
}

export async function upsertLessonPlan(schoolId: string, plan: LessonPlan) {
  const m = await loadModules(schoolId)
  const idx = m.lessonPlans.findIndex((p) => p.id === plan.id)
  if (idx >= 0) m.lessonPlans[idx] = plan
  else m.lessonPlans.unshift(plan)
  await saveModules(schoolId, m)
  return plan
}

export async function deleteLessonPlan(schoolId: string, planId: string) {
  const m = await loadModules(schoolId)
  m.lessonPlans = m.lessonPlans.filter((p) => p.id !== planId)
  await saveModules(schoolId, m)
}

export async function addPulse(schoolId: string, entry: PulseEntry) {
  const m = await loadModules(schoolId)
  m.pulses = [entry, ...m.pulses].slice(0, 2000) // cap history
  await saveModules(schoolId, m)
  return entry
}

export async function listPulsesForClass(schoolId: string, classId: string) {
  const m = await loadModules(schoolId)
  return m.pulses.filter((p) => p.classId === classId).slice(0, 200)
}

export async function listPulsesForStudent(schoolId: string, studentId: string) {
  const m = await loadModules(schoolId)
  return m.pulses.filter((p) => p.studentId === studentId).slice(0, 50)
}

export async function listAllPulses(schoolId: string) {
  const m = await loadModules(schoolId)
  return m.pulses.slice(0, 300)
}

export async function listVideos(schoolId: string) {
  const m = await loadModules(schoolId)
  return m.videos.sort((a, b) => Number(b.featured) - Number(a.featured) || b.createdAt.localeCompare(a.createdAt))
}

export async function upsertVideo(schoolId: string, video: SchoolVideo) {
  const m = await loadModules(schoolId)
  const idx = m.videos.findIndex((v) => v.id === video.id)
  if (idx >= 0) m.videos[idx] = video
  else m.videos.unshift(video)
  await saveModules(schoolId, m)
  return video
}

export async function deleteVideo(schoolId: string, videoId: string) {
  const m = await loadModules(schoolId)
  m.videos = m.videos.filter((v) => v.id !== videoId)
  await saveModules(schoolId, m)
}

export function detectVideoProvider(url: string): SchoolVideo['provider'] {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube'
  if (/vimeo\.com/i.test(url)) return 'vimeo'
  return 'other'
}

export function youtubeEmbedId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1) || null
    if (u.searchParams.get('v')) return u.searchParams.get('v')
    const parts = u.pathname.split('/')
    const embed = parts.indexOf('embed')
    if (embed >= 0 && parts[embed + 1]) return parts[embed + 1]
  } catch {
    return null
  }
  return null
}
