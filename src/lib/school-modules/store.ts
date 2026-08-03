/**
 * School modules store — pilot-ready.
 * Prefer first-class tables (migration 007). Fall back to schools.settings JSON
 * only when those tables are not yet applied or when a write fails soft.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import {
  emptyModules,
  type LessonPlan,
  type PulseEntry,
  type PulseLevel,
  type SchoolCamera,
  type SchoolModulesState,
  type SchoolVideo,
} from '@/lib/school-modules/types'

type SchoolSettings = {
  modules?: SchoolModulesState
  [key: string]: unknown
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isMissingRelation(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false
  const msg = (error.message || '').toLowerCase()
  const code = (error.code || '').toUpperCase()
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    msg.includes('does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('schema cache')
  )
}

function isFkOrCheckError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false
  const msg = (error.message || '').toLowerCase()
  const code = (error.code || '').toUpperCase()
  return (
    code === '23503' ||
    code === '23514' ||
    code === '22P02' ||
    msg.includes('foreign key') ||
    msg.includes('violates') ||
    msg.includes('invalid input syntax')
  )
}

function asUuidOrNull(value: string | null | undefined): string | null {
  if (!value) return null
  return UUID_RE.test(value) ? value : null
}

async function loadModulesJson(schoolId: string): Promise<SchoolModulesState> {
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
    cameras: settings.modules.cameras ?? [],
  }
}

async function saveModulesJson(schoolId: string, modules: SchoolModulesState) {
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

async function saveLessonPlanJson(schoolId: string, plan: LessonPlan) {
  const m = await loadModulesJson(schoolId)
  const idx = m.lessonPlans.findIndex((p) => p.id === plan.id)
  if (idx >= 0) m.lessonPlans[idx] = plan
  else m.lessonPlans.unshift(plan)
  await saveModulesJson(schoolId, m)
}

/** @deprecated Prefer table-backed helpers. Kept for any residual callers. */
export async function loadModules(schoolId: string): Promise<SchoolModulesState> {
  return loadModulesJson(schoolId)
}

function mapLessonRow(r: Record<string, unknown>): LessonPlan {
  return {
    id: String(r.id),
    classId: String(r.class_id),
    title: String(r.title || ''),
    date: String(r.date || '').slice(0, 10),
    unit: (r.unit as string) || '',
    objectives: String(r.objectives || ''),
    materials: String(r.materials || ''),
    activities: String(r.activities || ''),
    scripture: (r.scripture as string) || '',
    homework: (r.homework as string) || '',
    differentiation: (r.differentiation as string) || '',
    assessment: (r.assessment as string) || '',
    durationMinutes: Number(r.duration_minutes) || 45,
    status: (r.status as LessonPlan['status']) || 'draft',
    createdBy: String(r.created_by || ''),
    createdAt: String(r.created_at || new Date().toISOString()),
    updatedAt: String(r.updated_at || r.created_at || new Date().toISOString()),
  }
}

function mapPulseRow(r: Record<string, unknown>): PulseEntry {
  return {
    id: String(r.id),
    classId: String(r.class_id),
    studentId: String(r.student_id),
    teacherId: String(r.teacher_id || ''),
    teacherName: String(r.teacher_name || ''),
    date: String(r.date || '').slice(0, 10),
    overall: r.overall as PulseLevel,
    dimensions: (r.dimensions as PulseEntry['dimensions']) || {},
    note: String(r.note || ''),
    celebrate: (r.celebrate as string) || undefined,
    createdAt: String(r.created_at || new Date().toISOString()),
  }
}

function mapVideoRow(r: Record<string, unknown>): SchoolVideo {
  return {
    id: String(r.id),
    title: String(r.title || ''),
    description: String(r.description || ''),
    url: String(r.url || ''),
    provider: (r.provider as SchoolVideo['provider']) || 'other',
    category: (r.category as SchoolVideo['category']) || 'other',
    featured: Boolean(r.featured),
    createdAt: String(r.created_at || new Date().toISOString()),
    createdBy: String(r.created_by || ''),
  }
}

// —— Lesson plans (table-first) ————————————————————————————————

export async function listLessonPlans(schoolId: string, classId: string): Promise<LessonPlan[]> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('lesson_plans')
      .select('*')
      .eq('school_id', schoolId)
      .eq('class_id', classId)
      .order('date', { ascending: false })

    if (!error && data) {
      const fromTable = data.map((r) => mapLessonRow(r as Record<string, unknown>))
      try {
        const m = await loadModulesJson(schoolId)
        const tableIds = new Set(fromTable.map((p) => p.id))
        const fromJson = m.lessonPlans.filter(
          (p) => p.classId === classId && !tableIds.has(p.id)
        )
        return [...fromTable, ...fromJson].sort(
          (a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt)
        )
      } catch {
        return fromTable
      }
    }
    if (error && !isMissingRelation(error)) {
      console.error('listLessonPlans table error:', error.message)
    }
  } catch (e) {
    console.error('listLessonPlans unexpected:', e)
  }

  const m = await loadModulesJson(schoolId)
  return m.lessonPlans
    .filter((p) => p.classId === classId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))
}

/** All lesson plans for many classes (teacher day/week planner). */
export async function listLessonPlansForClasses(
  schoolId: string,
  classIds: string[]
): Promise<LessonPlan[]> {
  if (!classIds.length) return []
  const idSet = new Set(classIds)
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('lesson_plans')
      .select('*')
      .eq('school_id', schoolId)
      .in('class_id', classIds)
      .order('date', { ascending: false })

    if (!error && data) {
      const fromTable = data.map((r) => mapLessonRow(r as Record<string, unknown>))
      try {
        const m = await loadModulesJson(schoolId)
        const tableIds = new Set(fromTable.map((p) => p.id))
        const fromJson = m.lessonPlans.filter(
          (p) => idSet.has(p.classId) && !tableIds.has(p.id)
        )
        return [...fromTable, ...fromJson]
      } catch {
        return fromTable
      }
    }
  } catch (e) {
    console.error('listLessonPlansForClasses:', e)
  }

  const m = await loadModulesJson(schoolId)
  return m.lessonPlans.filter((p) => idSet.has(p.classId))
}

export async function upsertLessonPlan(schoolId: string, plan: LessonPlan): Promise<LessonPlan> {
  const baseRow = {
    id: plan.id,
    school_id: schoolId,
    class_id: plan.classId,
    title: plan.title,
    date: plan.date,
    unit: plan.unit || null,
    objectives: plan.objectives || '',
    materials: plan.materials || '',
    activities: plan.activities || '',
    scripture: plan.scripture || null,
    homework: plan.homework || null,
    differentiation: plan.differentiation || null,
    assessment: plan.assessment || null,
    duration_minutes: plan.durationMinutes || 45,
    status: plan.status || 'draft',
    created_by: asUuidOrNull(plan.createdBy),
    created_at: plan.createdAt,
    updated_at: plan.updatedAt || new Date().toISOString(),
  }

  try {
    const admin = createAdminClient()
    let { error } = await admin.from('lesson_plans').upsert(baseRow, { onConflict: 'id' })

    // Retry without created_by if FK/profile missing
    if (error && isFkOrCheckError(error) && baseRow.created_by) {
      const retry = { ...baseRow, created_by: null }
      ;({ error } = await admin.from('lesson_plans').upsert(retry, { onConflict: 'id' }))
    }

    if (!error) return plan

    console.warn('upsertLessonPlan falling back to JSON:', error.message)
    await saveLessonPlanJson(schoolId, plan)
    return plan
  } catch (e) {
    console.error('upsertLessonPlan exception, JSON fallback:', e)
    try {
      await saveLessonPlanJson(schoolId, plan)
      return plan
    } catch (jsonErr) {
      throw new Error(
        jsonErr instanceof Error ? jsonErr.message : 'Could not save lesson plan.'
      )
    }
  }
}

export async function deleteLessonPlan(schoolId: string, planId: string): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('lesson_plans').delete().eq('id', planId).eq('school_id', schoolId)
  } catch (e) {
    console.error('deleteLessonPlan table:', e)
  }
  try {
    const m = await loadModulesJson(schoolId)
    m.lessonPlans = m.lessonPlans.filter((p) => p.id !== planId)
    await saveModulesJson(schoolId, m)
  } catch (e) {
    console.error('deleteLessonPlan json:', e)
  }
}

// —— Beacon Pulse (table-first) ————————————————————————————————

export async function addPulse(schoolId: string, entry: PulseEntry): Promise<PulseEntry> {
  const admin = createAdminClient()
  const row = {
    id: entry.id,
    school_id: schoolId,
    class_id: entry.classId,
    student_id: entry.studentId,
    teacher_id: asUuidOrNull(entry.teacherId),
    teacher_name: entry.teacherName || null,
    date: entry.date,
    overall: entry.overall,
    dimensions: entry.dimensions || {},
    note: entry.note || null,
    celebrate: entry.celebrate || null,
    created_at: entry.createdAt,
  }

  const { error } = await admin.from('pulse_entries').upsert(row, { onConflict: 'id' })
  if (!error) return entry

  if (!isMissingRelation(error) && !isFkOrCheckError(error)) {
    console.error('addPulse table error:', error.message)
  }

  const m = await loadModulesJson(schoolId)
  m.pulses = [entry, ...m.pulses].slice(0, 2000)
  await saveModulesJson(schoolId, m)
  return entry
}

export async function listPulsesForClass(schoolId: string, classId: string): Promise<PulseEntry[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('pulse_entries')
    .select('*')
    .eq('school_id', schoolId)
    .eq('class_id', classId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (!error && data) {
    return data.map((r) => mapPulseRow(r as Record<string, unknown>))
  }
  if (error && !isMissingRelation(error)) {
    console.error('listPulsesForClass table error:', error.message)
  }

  const m = await loadModulesJson(schoolId)
  return m.pulses.filter((p) => p.classId === classId).slice(0, 200)
}

export async function listPulsesForStudent(
  schoolId: string,
  studentId: string
): Promise<PulseEntry[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('pulse_entries')
    .select('*')
    .eq('school_id', schoolId)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (!error && data) {
    return data.map((r) => mapPulseRow(r as Record<string, unknown>))
  }
  if (error && !isMissingRelation(error)) {
    console.error('listPulsesForStudent table error:', error.message)
  }

  const m = await loadModulesJson(schoolId)
  return m.pulses.filter((p) => p.studentId === studentId).slice(0, 50)
}

export async function listAllPulses(schoolId: string): Promise<PulseEntry[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('pulse_entries')
    .select('*')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })
    .limit(300)

  if (!error && data) {
    return data.map((r) => mapPulseRow(r as Record<string, unknown>))
  }
  if (error && !isMissingRelation(error)) {
    console.error('listAllPulses table error:', error.message)
  }

  const m = await loadModulesJson(schoolId)
  return m.pulses.slice(0, 300)
}

// —— School videos (table-first) ————————————————————————————————

export async function listVideos(schoolId: string): Promise<SchoolVideo[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('school_videos')
    .select('*')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })

  if (!error && data) {
    return data
      .map((r) => mapVideoRow(r as Record<string, unknown>))
      .sort((a, b) => Number(b.featured) - Number(a.featured) || b.createdAt.localeCompare(a.createdAt))
  }
  if (error && !isMissingRelation(error)) {
    console.error('listVideos table error:', error.message)
  }

  const m = await loadModulesJson(schoolId)
  return m.videos.sort(
    (a, b) => Number(b.featured) - Number(a.featured) || b.createdAt.localeCompare(a.createdAt)
  )
}

export async function upsertVideo(schoolId: string, video: SchoolVideo): Promise<SchoolVideo> {
  const admin = createAdminClient()
  const row = {
    id: video.id,
    school_id: schoolId,
    title: video.title,
    description: video.description || null,
    url: video.url,
    provider: video.provider || 'other',
    category: video.category || 'other',
    featured: Boolean(video.featured),
    created_by: asUuidOrNull(video.createdBy),
    created_at: video.createdAt,
  }

  const { error } = await admin.from('school_videos').upsert(row, { onConflict: 'id' })
  if (!error) return video

  if (!isMissingRelation(error) && !isFkOrCheckError(error)) {
    console.error('upsertVideo table error:', error.message)
  }

  const m = await loadModulesJson(schoolId)
  const idx = m.videos.findIndex((v) => v.id === video.id)
  if (idx >= 0) m.videos[idx] = video
  else m.videos.unshift(video)
  await saveModulesJson(schoolId, m)
  return video
}

export async function deleteVideo(schoolId: string, videoId: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('school_videos')
    .delete()
    .eq('id', videoId)
    .eq('school_id', schoolId)

  if (!error) return
  if (!isMissingRelation(error)) {
    console.error('deleteVideo table error:', error.message)
  }

  const m = await loadModulesJson(schoolId)
  m.videos = m.videos.filter((v) => v.id !== videoId)
  await saveModulesJson(schoolId, m)
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

// —— Campus cameras (settings JSON; browser-safe streams via go2rtc/HLS) ——

export async function listCameras(schoolId: string): Promise<SchoolCamera[]> {
  const m = await loadModulesJson(schoolId)
  return (m.cameras || [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

export async function upsertCamera(
  schoolId: string,
  camera: SchoolCamera
): Promise<SchoolCamera> {
  const m = await loadModulesJson(schoolId)
  const cameras = m.cameras || []
  const idx = cameras.findIndex((c) => c.id === camera.id)
  if (idx >= 0) cameras[idx] = camera
  else cameras.push(camera)
  m.cameras = cameras
  await saveModulesJson(schoolId, m)
  return camera
}

export async function deleteCamera(schoolId: string, cameraId: string): Promise<void> {
  const m = await loadModulesJson(schoolId)
  m.cameras = (m.cameras || []).filter((c) => c.id !== cameraId)
  await saveModulesJson(schoolId, m)
}

/** Infer stream kind from URL when principal leaves it auto. */
export function detectCameraStreamKind(url: string): SchoolCamera['streamKind'] {
  const u = url.toLowerCase()
  if (u === 'simulator' || u.startsWith('sim://')) return 'simulator'
  // MediaMTX path style: …/camname/index.m3u8 (EasyCamera media-engine)
  if (u.includes('.m3u8') || u.includes('/hls/') || u.includes('/index.m3u8')) return 'hls'
  if (u.includes('mjpeg') || u.includes('mjpg') || u.endsWith('.cgi')) return 'mjpeg'
  if (u.includes('/stream.html') || u.includes('go2rtc') || u.includes('/api/webrtc'))
    return 'iframe'
  if (u.match(/\.(jpe?g|png|webp)(\?|$)/i)) return 'snapshot'
  // go2rtc default web UI
  if (u.includes(':1984/')) return 'iframe'
  // MediaMTX WHEP is not wired yet — treat base path as HLS index if ends with path
  if (u.includes(':8888/') || u.includes('mediamtx')) return 'hls'
  return 'hls'
}

/** Demo wall for schools without go2rtc yet — mirrors EasyCamera LiveGrid simulator. */
export function demoCameras(): SchoolCamera[] {
  const now = new Date().toISOString()
  const specs: { name: string; location: string; zone: SchoolCamera['zone'] }[] = [
    { name: 'Front entrance', location: 'Main doors · north', zone: 'entrance' },
    { name: 'Hallway A', location: 'Primary wing', zone: 'hallway' },
    { name: 'Playground', location: 'East yard', zone: 'playground' },
    { name: 'Parking lot', location: 'Staff lot', zone: 'parking' },
  ]
  return specs.map((s, i) => ({
    id: `cam_demo_${i + 1}`,
    name: s.name,
    location: s.location,
    zone: s.zone,
    streamUrl: 'simulator',
    streamKind: 'simulator' as const,
    notes: 'EasyCamera-style simulator — replace with go2rtc/MediaMTX HLS when ready',
    enabled: true,
    sortOrder: i,
    createdAt: now,
    updatedAt: now,
  }))
}
