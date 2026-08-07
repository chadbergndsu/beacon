import { reportError } from '@/lib/ops/report-error'
import { createAdminClient } from '@/lib/supabase/admin'
import type { PilotEvidenceScorecard, WorkflowMetric } from './types'
import {
  baselineDay,
  buildHelpfulnessMetric,
  buildRatioMetric,
  isBaselinePeriod,
  trailingWindow,
} from './windows'

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

type QueryResponse<Row> = {
  data: Row[] | null
  error: unknown
}

type SourceResult<Value> =
  | { ok: true; value: Value }
  | { ok: false }

type AdminClient = ReturnType<typeof createAdminClient>

function nextUtcMidnight(dateKey: string): string {
  return new Date(
    new Date(`${dateKey}T00:00:00.000Z`).getTime() + MILLISECONDS_PER_DAY
  ).toISOString()
}

function distinctStrings<Row>(rows: Row[], key: keyof Row): string[] {
  return [
    ...new Set(
      rows.flatMap((row) => {
        const value = row[key]
        return typeof value === 'string' && value ? [value] : []
      })
    ),
  ]
}

async function loadRows<Row>(
  schoolId: string,
  source: string,
  query: PromiseLike<QueryResponse<Row>>
): Promise<SourceResult<Row[]>> {
  try {
    const { data, error } = await query
    if (error) throw error
    if (data === null) throw new Error('Supabase query returned no data.')
    return { ok: true, value: data }
  } catch (error) {
    reportError(error, { source, schoolId })
    return { ok: false }
  }
}

async function loadEligibleLinkedParents(
  admin: AdminClient,
  schoolId: string
): Promise<SourceResult<string[]>> {
  const students = await loadRows<{ id: string }>(
    schoolId,
    'students',
    admin.from('students').select('id').eq('school_id', schoolId).eq('active', true)
  )
  if (!students.ok) return students

  const studentIds = distinctStrings(students.value, 'id')
  if (studentIds.length === 0) return { ok: true, value: [] }

  const links = await loadRows<{ parent_id: string; student_id: string }>(
    schoolId,
    'parent_students',
    admin
      .from('parent_students')
      .select('parent_id, student_id')
      .in('student_id', studentIds)
  )
  if (!links.ok) return links

  return { ok: true, value: distinctStrings(links.value, 'parent_id') }
}

async function loadGradeActivity(
  admin: AdminClient,
  schoolId: string,
  timestampStart: string,
  timestampEnd: string
): Promise<SourceResult<WorkflowMetric & { state: 'ready' }>> {
  const classes = await loadRows<{ id: string }>(
    schoolId,
    'classes',
    admin.from('classes').select('id').eq('school_id', schoolId)
  )
  if (!classes.ok) return classes

  const classIds = distinctStrings(classes.value, 'id')
  if (classIds.length === 0) {
    return { ok: true, value: { state: 'ready', primary: 0, secondary: 0 } }
  }

  const assignments = await loadRows<{ id: string }>(
    schoolId,
    'assignments',
    admin.from('assignments').select('id').in('class_id', classIds)
  )
  if (!assignments.ok) return assignments

  const assignmentIds = distinctStrings(assignments.value, 'id')
  if (assignmentIds.length === 0) {
    return { ok: true, value: { state: 'ready', primary: 0, secondary: 0 } }
  }

  const grades = await loadRows<{ assignment_id: string }>(
    schoolId,
    'grades',
    admin
      .from('grades')
      .select('assignment_id')
      .in('assignment_id', assignmentIds)
      .gte('entered_at', timestampStart)
      .lt('entered_at', timestampEnd)
  )
  if (!grades.ok) return grades

  return {
    ok: true,
    value: {
      state: 'ready',
      primary: distinctStrings(grades.value, 'assignment_id').length,
      secondary: grades.value.length,
    },
  }
}

function unavailableScorecard(input: {
  windowStart: string
  windowEnd: string
  feedbackWindowStart: string
}): PilotEvidenceScorecard {
  return {
    ...input,
    baseline: false,
    baselineDay: null,
    activeTeachers: {
      state: 'unavailable',
      reason: 'Activity or eligibility data is unavailable.',
    },
    activeLinkedParents: {
      state: 'unavailable',
      reason: 'Activity or eligibility data is unavailable.',
    },
    attendanceActivity: {
      state: 'unavailable',
      reason: 'Attendance activity data is unavailable.',
    },
    gradeActivity: {
      state: 'unavailable',
      reason: 'Grade activity data is unavailable.',
    },
    emailDelivery: {
      state: 'unavailable',
      reason: 'Email delivery data is unavailable.',
    },
    parentHelpfulness: {
      state: 'unavailable',
      reason: 'Helpfulness data is unavailable.',
    },
    feedbackReceived: {
      state: 'unavailable',
      reason: 'Feedback data is unavailable.',
    },
  }
}

export async function loadPilotScorecard(
  schoolId: string,
  now = new Date()
): Promise<PilotEvidenceScorecard> {
  const sevenDayWindow = trailingWindow(now, 7)
  const feedbackWindow = trailingWindow(now, 30)
  const timestampStart = `${sevenDayWindow.start}T00:00:00.000Z`
  const feedbackTimestampStart = `${feedbackWindow.start}T00:00:00.000Z`
  const timestampEnd = nextUtcMidnight(sevenDayWindow.end)
  const windowFields = {
    windowStart: sevenDayWindow.start,
    windowEnd: sevenDayWindow.end,
    feedbackWindowStart: feedbackWindow.start,
  }

  let admin: AdminClient
  try {
    admin = createAdminClient()
  } catch (error) {
    reportError(error, { source: 'supabase', schoolId })
    return unavailableScorecard(windowFields)
  }

  const [
    teachers,
    eligibleParents,
    teacherActivity,
    parentActivity,
    attendance,
    gradeActivity,
    emailRows,
    parentFeedback,
    generalFeedback,
    firstActivity,
  ] = await Promise.all([
    loadRows<{ id: string }>(
      schoolId,
      'profiles',
      admin
        .from('profiles')
        .select('id')
        .eq('school_id', schoolId)
        .eq('role', 'teacher')
    ),
    loadEligibleLinkedParents(admin, schoolId),
    loadRows<{ user_id: string }>(
      schoolId,
      'pilot_activity_daily',
      admin
        .from('pilot_activity_daily')
        .select('user_id')
        .eq('school_id', schoolId)
        .eq('actor_role', 'teacher')
        .eq('event_type', 'teacher_work')
        .gte('activity_date', sevenDayWindow.start)
        .lte('activity_date', sevenDayWindow.end)
    ),
    loadRows<{ user_id: string }>(
      schoolId,
      'pilot_activity_daily',
      admin
        .from('pilot_activity_daily')
        .select('user_id')
        .eq('school_id', schoolId)
        .eq('actor_role', 'parent')
        .in('event_type', ['parent_portal', 'sign_in'])
        .gte('activity_date', sevenDayWindow.start)
        .lte('activity_date', sevenDayWindow.end)
    ),
    loadRows<{ date: string }>(
      schoolId,
      'attendance',
      admin
        .from('attendance')
        .select('date')
        .eq('school_id', schoolId)
        .gte('updated_at', timestampStart)
        .lt('updated_at', timestampEnd)
    ),
    loadGradeActivity(admin, schoolId, timestampStart, timestampEnd),
    loadRows<{ status: string }>(
      schoolId,
      'email_outbox',
      admin
        .from('email_outbox')
        .select('status')
        .eq('school_id', schoolId)
        .gte('created_at', timestampStart)
        .lt('created_at', timestampEnd)
    ),
    loadRows<{ rating: string; comment: string | null; created_at: string }>(
      schoolId,
      'parent_experience_feedback',
      admin
        .from('parent_experience_feedback')
        .select('rating, comment, created_at')
        .eq('school_id', schoolId)
        .gte('created_at', feedbackTimestampStart)
        .lt('created_at', timestampEnd)
    ),
    loadRows<{ id: string }>(
      schoolId,
      'pilot_feedback',
      admin
        .from('pilot_feedback')
        .select('id')
        .eq('school_id', schoolId)
        .gte('created_at', timestampStart)
        .lt('created_at', timestampEnd)
    ),
    loadRows<{ activity_date: string }>(
      schoolId,
      'pilot_activity_daily',
      admin
        .from('pilot_activity_daily')
        .select('activity_date')
        .eq('school_id', schoolId)
        .order('activity_date', { ascending: true })
        .limit(1)
    ),
  ])

  const eligibleTeacherIds = teachers.ok ? distinctStrings(teachers.value, 'id') : null
  const activeTeacherIds = teacherActivity.ok
    ? distinctStrings(teacherActivity.value, 'user_id')
    : null
  const activeTeachers =
    eligibleTeacherIds === null || activeTeacherIds === null
      ? buildRatioMetric({ active: null, eligible: eligibleTeacherIds?.length ?? null })
      : buildRatioMetric({
          active: activeTeacherIds.filter((id) => eligibleTeacherIds.includes(id)).length,
          eligible: eligibleTeacherIds.length,
        })

  const activeParentIds = parentActivity.ok
    ? distinctStrings(parentActivity.value, 'user_id')
    : null
  const activeLinkedParents =
    !eligibleParents.ok || activeParentIds === null
      ? buildRatioMetric({
          active: null,
          eligible: eligibleParents.ok ? eligibleParents.value.length : null,
        })
      : buildRatioMetric({
          active: activeParentIds.filter((id) => eligibleParents.value.includes(id)).length,
          eligible: eligibleParents.value.length,
        })

  const attendanceActivity: PilotEvidenceScorecard['attendanceActivity'] = attendance.ok
    ? {
        state: 'ready',
        primary: distinctStrings(attendance.value, 'date').length,
        secondary: attendance.value.length,
      }
    : { state: 'unavailable', reason: 'Attendance activity data is unavailable.' }

  const emailDelivery: PilotEvidenceScorecard['emailDelivery'] = emailRows.ok
    ? emailRows.value.reduce<PilotEvidenceScorecard['emailDelivery']>(
        (metric, row) => {
          if (metric.state !== 'ready') return metric
          if (row.status === 'sent') metric.delivered += 1
          else if (row.status === 'failed') metric.failed += 1
          else metric.unsent += 1
          return metric
        },
        { state: 'ready', delivered: 0, failed: 0, unsent: 0 }
      )
    : { state: 'unavailable', reason: 'Email delivery data is unavailable.' }

  const parentHelpfulness = parentFeedback.ok
    ? buildHelpfulnessMetric({
        helpful: parentFeedback.value.filter(({ rating }) => rating === 'helpful').length,
        total: parentFeedback.value.length,
      })
    : buildHelpfulnessMetric({ helpful: null, total: null })

  const feedbackReceived: PilotEvidenceScorecard['feedbackReceived'] =
    parentFeedback.ok && generalFeedback.ok
      ? {
          state: 'ready',
          count:
            generalFeedback.value.length +
            parentFeedback.value.filter(({ comment, created_at }) => {
              return (
                created_at >= timestampStart &&
                created_at < timestampEnd &&
                typeof comment === 'string' &&
                comment.trim().length > 0
              )
            }).length,
        }
      : { state: 'unavailable', reason: 'Feedback data is unavailable.' }

  const firstActivityDate = firstActivity.ok
    ? firstActivity.value[0]?.activity_date ?? null
    : null

  return {
    ...windowFields,
    baseline: isBaselinePeriod(firstActivityDate, now),
    baselineDay: baselineDay(firstActivityDate, now),
    activeTeachers,
    activeLinkedParents,
    attendanceActivity,
    gradeActivity: gradeActivity.ok
      ? gradeActivity.value
      : { state: 'unavailable', reason: 'Grade activity data is unavailable.' },
    emailDelivery,
    parentHelpfulness,
    feedbackReceived,
  }
}
