'use server'

import { revalidatePath } from 'next/cache'
import { requireClassManager } from '@/lib/class-access'

function revalidateClass(classId: string) {
  revalidatePath(`/classes/${classId}`)
  revalidatePath(`/classes/${classId}`, 'layout')
}

export async function createCategory(
  classId: string,
  input: { name: string; weight: number; drop_lowest: number }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await requireClassManager(classId)
  if (!access.ok) return access

  const name = input.name.trim()
  if (!name) return { ok: false, error: 'Category name is required.' }
  const weight = Number(input.weight)
  if (!Number.isFinite(weight) || weight < 0 || weight > 100) {
    return { ok: false, error: 'Weight must be between 0 and 100.' }
  }

  const { error } = await access.admin.from('grade_categories').insert({
    class_id: classId,
    name,
    weight,
    drop_lowest: Math.max(0, Math.floor(Number(input.drop_lowest) || 0)),
  })

  if (error) return { ok: false, error: error.message }
  revalidateClass(classId)
  return { ok: true }
}

export async function updateCategory(
  classId: string,
  categoryId: string,
  input: { name: string; weight: number; drop_lowest: number }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await requireClassManager(classId)
  if (!access.ok) return access

  const name = input.name.trim()
  if (!name) return { ok: false, error: 'Category name is required.' }

  const { error } = await access.admin
    .from('grade_categories')
    .update({
      name,
      weight: Number(input.weight),
      drop_lowest: Math.max(0, Math.floor(Number(input.drop_lowest) || 0)),
    })
    .eq('id', categoryId)
    .eq('class_id', classId)

  if (error) return { ok: false, error: error.message }
  revalidateClass(classId)
  return { ok: true }
}

export async function deleteCategory(
  classId: string,
  categoryId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await requireClassManager(classId)
  if (!access.ok) return access

  const { error } = await access.admin
    .from('grade_categories')
    .delete()
    .eq('id', categoryId)
    .eq('class_id', classId)

  if (error) return { ok: false, error: error.message }
  revalidateClass(classId)
  return { ok: true }
}

export async function createAssignment(
  classId: string,
  input: {
    title: string
    category_id: string | null
    max_points: number
    due_date: string | null
    is_extra_credit: boolean
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await requireClassManager(classId)
  if (!access.ok) return access

  const title = input.title.trim()
  if (!title) return { ok: false, error: 'Title is required.' }
  const max_points = Number(input.max_points)
  if (!Number.isFinite(max_points) || max_points <= 0) {
    return { ok: false, error: 'Max points must be greater than 0.' }
  }

  const { error } = await access.admin.from('assignments').insert({
    class_id: classId,
    title,
    category_id: input.category_id || null,
    max_points,
    due_date: input.due_date || null,
    is_extra_credit: Boolean(input.is_extra_credit),
  })

  if (error) return { ok: false, error: error.message }
  revalidateClass(classId)
  return { ok: true }
}

export async function deleteAssignment(
  classId: string,
  assignmentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await requireClassManager(classId)
  if (!access.ok) return access

  const { error } = await access.admin
    .from('assignments')
    .delete()
    .eq('id', assignmentId)
    .eq('class_id', classId)

  if (error) return { ok: false, error: error.message }
  revalidateClass(classId)
  return { ok: true }
}

export async function enrollStudent(
  classId: string,
  input: { first_name: string; last_name: string; grade_level: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await requireClassManager(classId)
  if (!access.ok) return access

  const first_name = input.first_name.trim()
  const last_name = input.last_name.trim()
  if (!first_name || !last_name) {
    return { ok: false, error: 'First and last name are required.' }
  }

  const schoolId = access.classRow.school_id
  const { data: student, error: studentError } = await access.admin
    .from('students')
    .insert({
      school_id: schoolId,
      first_name,
      last_name,
      grade_level: input.grade_level.trim() || null,
      active: true,
    })
    .select('id')
    .single()

  if (studentError || !student) {
    return { ok: false, error: studentError?.message || 'Could not create student.' }
  }

  const { error: enrollError } = await access.admin.from('enrollments').insert({
    student_id: student.id,
    class_id: classId,
  })

  if (enrollError) {
    return { ok: false, error: enrollError.message }
  }

  revalidateClass(classId)
  return { ok: true }
}
