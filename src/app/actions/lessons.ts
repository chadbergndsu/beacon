'use server'

import { revalidatePath } from 'next/cache'
import { requireClassManager } from '@/lib/class-access'
import { deleteLessonPlan, listLessonPlans, upsertLessonPlan } from '@/lib/school-modules/store'
import type { LessonPlan } from '@/lib/school-modules/types'

export async function getClassLessonPlans(classId: string) {
  const access = await requireClassManager(classId)
  if (!access.ok) return { ok: false as const, error: access.error, plans: [] as LessonPlan[] }
  const plans = await listLessonPlans(access.classRow.school_id, classId)
  return { ok: true as const, plans }
}

export async function saveLessonPlan(
  classId: string,
  input: {
    id?: string
    title: string
    date: string
    unit?: string
    objectives: string
    materials: string
    activities: string
    scripture?: string
    homework?: string
    differentiation?: string
    assessment?: string
    durationMinutes?: number
    status: LessonPlan['status']
  }
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const access = await requireClassManager(classId)
  if (!access.ok) return access

  const title = input.title.trim()
  if (!title) return { ok: false, error: 'Title is required.' }
  if (!input.date) return { ok: false, error: 'Date is required.' }

  const now = new Date().toISOString()
  const existingId = input.id
  let createdAt = now
  if (existingId) {
    const plans = await listLessonPlans(access.classRow.school_id, classId)
    const found = plans.find((p) => p.id === existingId)
    if (found) createdAt = found.createdAt
  }

  const plan: LessonPlan = {
    id: existingId || `lp_${Date.now().toString(36)}`,
    classId,
    title,
    date: input.date,
    unit: input.unit?.trim() || '',
    objectives: input.objectives.trim(),
    materials: input.materials.trim(),
    activities: input.activities.trim(),
    scripture: input.scripture?.trim() || '',
    homework: input.homework?.trim() || '',
    differentiation: input.differentiation?.trim() || '',
    assessment: input.assessment?.trim() || '',
    durationMinutes: input.durationMinutes || 45,
    status: input.status,
    createdBy: access.user.id,
    createdAt,
    updatedAt: now,
  }

  await upsertLessonPlan(access.classRow.school_id, plan)
  revalidatePath(`/classes/${classId}`)
  return { ok: true, id: plan.id }
}

export async function removeLessonPlan(
  classId: string,
  planId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await requireClassManager(classId)
  if (!access.ok) return access
  await deleteLessonPlan(access.classRow.school_id, planId)
  revalidatePath(`/classes/${classId}`)
  return { ok: true }
}
