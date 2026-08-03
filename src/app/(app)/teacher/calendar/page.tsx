import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSchoolStaff } from '@/lib/roles'
import {
  AssignmentMonthCalendar,
  type CalendarAssignment,
  type CalendarHoliday,
} from '@/components/lessons/AssignmentMonthCalendar'
import type { Assignment } from '@/lib/types'

export default async function TeacherCalendarPage() {
  const { profile, user } = await getProfile()
  if (!profile || !isSchoolStaff(profile.role)) {
    redirect('/dashboard')
  }

  const admin = createAdminClient()
  let classRows: { id: string; name: string; subject: string | null }[] = []

  if (profile.role === 'teacher') {
    const { data } = await admin
      .from('classes')
      .select('id, name, subject')
      .eq('teacher_id', user.id)
      .eq('active', true)
    classRows = data ?? []
  } else if (profile.school_id) {
    const { data } = await admin
      .from('classes')
      .select('id, name, subject')
      .eq('school_id', profile.school_id)
      .eq('active', true)
    classRows = data ?? []
  }

  const classMap = new Map(classRows.map((c) => [c.id, c]))
  const classIds = classRows.map((c) => c.id)

  let assignments: CalendarAssignment[] = []
  if (classIds.length) {
    const { data } = await admin
      .from('assignments')
      .select('id, title, due_date, class_id, max_points, is_extra_credit')
      .in('class_id', classIds)
      .not('due_date', 'is', null)

    assignments = ((data ?? []) as Assignment[])
      .filter((a) => a.due_date)
      .map((a) => {
        const c = classMap.get(a.class_id)
        return {
          id: a.id,
          title: a.title,
          dueDate: String(a.due_date).slice(0, 10),
          classId: a.class_id,
          className: c?.subject || c?.name || 'Class',
          maxPoints: a.max_points,
          isExtraCredit: a.is_extra_credit,
        }
      })
  }

  // Optional school holidays from settings.brand or settings.holidays
  let holidays: CalendarHoliday[] = []
  if (profile.school_id) {
    const { data: school } = await admin
      .from('schools')
      .select('settings')
      .eq('id', profile.school_id)
      .maybeSingle()
    const settings = (school?.settings || {}) as {
      holidays?: { id?: string; label: string; startDate: string; endDate: string }[]
    }
    holidays = (settings.holidays || []).map((h, i) => ({
      id: h.id || `hol_${i}`,
      label: h.label,
      startDate: h.startDate,
      endDate: h.endDate,
    }))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href="/teacher/lessons"
          className="rounded-xl border border-border bg-card px-3 py-2 font-semibold hover:border-sky-300"
        >
          ← Lesson day/week
        </Link>
        <Link
          href="/teacher/calendar"
          className="rounded-xl border border-sky-300 bg-sky-50 px-3 py-2 font-semibold text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100"
        >
          Assignment month
        </Link>
      </div>
      <AssignmentMonthCalendar
        assignments={assignments}
        holidays={holidays}
        title="Assignment calendar"
      />
    </div>
  )
}
