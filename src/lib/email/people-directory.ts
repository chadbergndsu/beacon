import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import {
  PEOPLE_RECENT_LIMIT,
  PEOPLE_SEARCH_RESULT_LIMIT,
  normalizePeopleQuery,
  peopleRefKey,
  type FacultyRole,
  type PeoplePreview,
  type PeopleRecipientRef,
  type PeopleSearchResult,
  type PeopleSelectionPreview,
} from './people-types'

export type PeopleSender = { id: string; schoolId: string; role: FacultyRole }

export type ResolvedPeopleDelivery = {
  email: string
  name: string | null
  role: string
  sourceKeys: string[]
}

export type ResolvedPeopleDirectory = {
  preview: PeoplePreview
  deliveries: ResolvedPeopleDelivery[]
  rejectedKeys: string[]
}

type AdminClient = ReturnType<typeof createAdminClient>
type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  role: string
  school_id?: string | null
}
type StudentRow = {
  id: string
  first_name: string
  last_name: string
  grade_level: string | null
  school_id?: string
  active?: boolean
}
type ParentStudentRow = { parent_id: string; student_id: string }
type SenderScope = { studentIds: Set<string> | null; parentIds: Set<string> | null }

const FACULTY_ROLES: FacultyRole[] = ['admin', 'staff', 'principal', 'teacher']

function assertValidPeopleSender(sender: PeopleSender) {
  if (!sender || !FACULTY_ROLES.includes(sender.role)) {
    throw new Error('Invalid People sender')
  }
}

function throwOnError(error: unknown) {
  if (error) throw new Error('People directory query failed')
}

async function loadSenderScope(admin: AdminClient, sender: PeopleSender): Promise<SenderScope> {
  if (sender.role !== 'teacher') return { studentIds: null, parentIds: null }

  const { data: classes, error: classesError } = await admin
    .from('classes')
    .select('id')
    .eq('school_id', sender.schoolId)
    .eq('teacher_id', sender.id)
  throwOnError(classesError)

  const classIds = (classes ?? []).map((row) => row.id)
  if (classIds.length === 0) {
    return { studentIds: new Set<string>(), parentIds: new Set<string>() }
  }

  const { data: enrollments, error: enrollmentsError } = await admin
    .from('enrollments')
    .select('student_id')
    .in('class_id', classIds)
  throwOnError(enrollmentsError)

  const studentIds = new Set<string>((enrollments ?? []).map((row) => row.student_id))
  if (studentIds.size === 0) return { studentIds, parentIds: new Set<string>() }

  const { data: links, error: linksError } = await admin
    .from('parent_students')
    .select('parent_id, student_id')
    .in('student_id', [...studentIds])
  throwOnError(linksError)

  return {
    studentIds,
    parentIds: new Set<string>((links ?? []).map((row) => row.parent_id)),
  }
}

function escapeSqlLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`)
}

function quotePostgrestValue(value: string) {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function normalizeEmail(value: string | null | undefined) {
  const email = value?.trim().toLocaleLowerCase() ?? ''
  return email.includes('@') ? email : null
}

function profileLabel(profile: ProfileRow) {
  return profile.full_name?.trim() || (profile.role === 'parent' ? 'Parent' : 'Faculty member')
}

function studentLabel(student: StudentRow) {
  return `${student.first_name} ${student.last_name}`.trim()
}

function roleLabel(role: string) {
  return role.charAt(0).toLocaleUpperCase() + role.slice(1)
}

function profileSearchResult(profile: ProfileRow, childNames: string[] = []): PeopleSearchResult {
  const isParent = profile.role === 'parent'
  return {
    key: `profile:${profile.id}`,
    ref: { kind: 'profile', id: profile.id },
    group: isParent ? 'Parents' : 'Faculty',
    label: profileLabel(profile),
    context: isParent
      ? childNames.length > 0
        ? `Parent of ${childNames.join(', ')}`
        : 'Parent'
      : roleLabel(profile.role),
    recipientCount: normalizeEmail(profile.email) ? 1 : 0,
    disabledReason: normalizeEmail(profile.email) ? null : 'No usable email address',
  }
}

function studentSearchResult(student: StudentRow, parents: ProfileRow[]): PeopleSearchResult {
  const deliverableParents = new Map<string, ProfileRow>()
  for (const parent of parents) {
    const email = normalizeEmail(parent.email)
    if (email) deliverableParents.set(email, parent)
  }
  const recipientCount = deliverableParents.size
  const gradeContext = student.grade_level ? `Grade ${student.grade_level}` : 'Student'
  return {
    key: `student:${student.id}`,
    ref: { kind: 'student', id: student.id },
    group: 'Students',
    label: studentLabel(student),
    context: `${gradeContext} · sends to ${recipientCount} linked ${recipientCount === 1 ? 'parent' : 'parents'}`,
    recipientCount,
    disabledReason: recipientCount > 0 ? null : 'No linked parent email',
  }
}

async function loadSearchParentContext(
  admin: AdminClient,
  sender: PeopleSender,
  parents: ProfileRow[],
  scope: SenderScope
) {
  const childNamesByParent = new Map<string, string[]>()
  const parentIds = parents.map((parent) => parent.id)
  if (parentIds.length === 0) return childNamesByParent

  let linksRequest = admin
    .from('parent_students')
    .select('parent_id, student_id')
    .in('parent_id', parentIds)
  if (scope.studentIds) linksRequest = linksRequest.in('student_id', [...scope.studentIds])
  const { data: links, error: linksError } = await linksRequest
  throwOnError(linksError)
  const typedLinks = (links ?? []) as ParentStudentRow[]
  const studentIds = [...new Set(typedLinks.map((link) => link.student_id))]
  if (studentIds.length === 0) return childNamesByParent

  const { data: students, error: studentsError } = await admin
    .from('students')
    .select('id, first_name, last_name')
    .eq('school_id', sender.schoolId)
    .eq('active', true)
    .in('id', studentIds)
  throwOnError(studentsError)
  const studentById = new Map<string, StudentRow>(
    ((students ?? []) as StudentRow[]).map((student) => [student.id, student])
  )
  for (const link of typedLinks) {
    const student = studentById.get(link.student_id)
    if (!student) continue
    const names = childNamesByParent.get(link.parent_id) ?? []
    names.push(studentLabel(student))
    childNamesByParent.set(link.parent_id, names)
  }
  return childNamesByParent
}

async function loadSearchStudentParents(
  admin: AdminClient,
  sender: PeopleSender,
  students: StudentRow[]
) {
  const parentsByStudent = new Map<string, ProfileRow[]>()
  const studentIds = students.map((student) => student.id)
  if (studentIds.length === 0) return parentsByStudent

  const { data: links, error: linksError } = await admin
    .from('parent_students')
    .select('parent_id, student_id')
    .in('student_id', studentIds)
  throwOnError(linksError)
  const typedLinks = (links ?? []) as ParentStudentRow[]
  const parentIds = [...new Set(typedLinks.map((link) => link.parent_id))]
  if (parentIds.length === 0) return parentsByStudent

  const { data: parents, error: parentsError } = await admin
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('school_id', sender.schoolId)
    .eq('role', 'parent')
    .in('id', parentIds)
  throwOnError(parentsError)
  const parentById = new Map<string, ProfileRow>(
    ((parents ?? []) as ProfileRow[]).map((parent) => [parent.id, parent])
  )
  for (const link of typedLinks) {
    const parent = parentById.get(link.parent_id)
    if (!parent) continue
    const linkedParents = parentsByStudent.get(link.student_id) ?? []
    linkedParents.push(parent)
    parentsByStudent.set(link.student_id, linkedParents)
  }
  return parentsByStudent
}

export async function searchPeopleDirectory(
  sender: PeopleSender,
  query: string,
  recentRefs: PeopleRecipientRef[] = []
): Promise<PeopleSearchResult[]> {
  assertValidPeopleSender(sender)

  if (recentRefs.length > 0) {
    const resolution = await resolvePeopleDirectory(sender, recentRefs.slice(0, PEOPLE_RECENT_LIMIT))
    return resolution.preview.selections.map((selection) => ({
      key: selection.key,
      ref: selection.ref,
      group: selection.group,
      label: selection.label,
      context: selection.context,
      recipientCount: selection.recipientCount,
      disabledReason: selection.disabledReason,
    }))
  }

  const normalizedQuery = normalizePeopleQuery(query)
  if (!normalizedQuery) return []

  const admin = createAdminClient()
  const scope = await loadSenderScope(admin, sender)
  const escapedQuery = escapeSqlLikePattern(normalizedQuery)
  const pattern = `%${escapedQuery}%`
  const quotedOrPattern = quotePostgrestValue(pattern)

  const facultyRequest = admin
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('school_id', sender.schoolId)
    .in('role', FACULTY_ROLES)
    .ilike('full_name', pattern)
    .limit(PEOPLE_SEARCH_RESULT_LIMIT)

  const parentRequest = scope.parentIds !== null && scope.parentIds.size === 0
    ? null
    : (() => {
        let request = admin
          .from('profiles')
          .select('id, email, full_name, role')
          .eq('school_id', sender.schoolId)
          .eq('role', 'parent')
          .ilike('full_name', pattern)
        if (scope.parentIds) request = request.in('id', [...scope.parentIds])
        return request.limit(PEOPLE_SEARCH_RESULT_LIMIT)
      })()

  const studentRequest = scope.studentIds !== null && scope.studentIds.size === 0
    ? null
    : (() => {
        let request = admin
          .from('students')
          .select('id, first_name, last_name, grade_level')
          .eq('school_id', sender.schoolId)
          .eq('active', true)
          .or(`first_name.ilike.${quotedOrPattern},last_name.ilike.${quotedOrPattern}`)
        if (scope.studentIds) request = request.in('id', [...scope.studentIds])
        return request.limit(PEOPLE_SEARCH_RESULT_LIMIT)
      })()

  const [facultyResponse, parentResponse, studentResponse] = await Promise.all([
    facultyRequest,
    parentRequest,
    studentRequest,
  ])
  throwOnError(facultyResponse.error)
  throwOnError(parentResponse?.error)
  throwOnError(studentResponse?.error)

  const faculty = (facultyResponse.data ?? []) as ProfileRow[]
  const parents = (parentResponse?.data ?? []) as ProfileRow[]
  const students = (studentResponse?.data ?? []) as StudentRow[]
  const [childNamesByParent, parentsByStudent] = await Promise.all([
    loadSearchParentContext(admin, sender, parents, scope),
    loadSearchStudentParents(admin, sender, students),
  ])

  return [
    ...faculty.map((profile) => profileSearchResult(profile)),
    ...parents.map((profile) => profileSearchResult(profile, childNamesByParent.get(profile.id))),
    ...students.map((student) => studentSearchResult(student, parentsByStudent.get(student.id) ?? [])),
  ].slice(0, PEOPLE_SEARCH_RESULT_LIMIT)
}

function addDelivery(
  deliveries: Map<string, ResolvedPeopleDelivery>,
  profile: ProfileRow,
  sourceKey: string
) {
  const email = normalizeEmail(profile.email)
  if (!email) return
  const existing = deliveries.get(email)
  if (existing) {
    if (!existing.sourceKeys.includes(sourceKey)) existing.sourceKeys.push(sourceKey)
    return
  }
  deliveries.set(email, {
    email,
    name: profile.full_name?.trim() || null,
    role: profile.role,
    sourceKeys: [sourceKey],
  })
}

export async function resolvePeopleDirectory(
  sender: PeopleSender,
  refs: PeopleRecipientRef[]
): Promise<ResolvedPeopleDirectory> {
  assertValidPeopleSender(sender)

  if (refs.length === 0) {
    return {
      preview: { selectedCount: 0, recipientCount: 0, selections: [], unavailableCount: 0 },
      deliveries: [],
      rejectedKeys: [],
    }
  }

  const admin = createAdminClient()
  const scope = await loadSenderScope(admin, sender)
  const profileIds = [...new Set(refs.filter((ref) => ref.kind === 'profile').map((ref) => ref.id))]
  const studentIds = [...new Set(refs.filter((ref) => ref.kind === 'student').map((ref) => ref.id))]

  const profileRequest = profileIds.length === 0
    ? null
    : admin
        .from('profiles')
        .select('id, email, full_name, role, school_id')
        .eq('school_id', sender.schoolId)
        .in('id', profileIds)
  const studentRequest = studentIds.length === 0
    ? null
    : admin
        .from('students')
        .select('id, first_name, last_name, grade_level, school_id, active')
        .eq('school_id', sender.schoolId)
        .eq('active', true)
        .in('id', studentIds)

  const [profileResponse, studentResponse] = await Promise.all([profileRequest, studentRequest])
  throwOnError(profileResponse?.error)
  throwOnError(studentResponse?.error)

  const profileById = new Map<string, ProfileRow>(
    ((profileResponse?.data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile])
  )
  const studentById = new Map<string, StudentRow>(
    ((studentResponse?.data ?? []) as StudentRow[]).map((student) => [student.id, student])
  )
  const allowedProfileById = new Map<string, ProfileRow>()
  for (const profile of profileById.values()) {
    const isFaculty = FACULTY_ROLES.includes(profile.role as FacultyRole)
    const isAllowedParent = profile.role === 'parent' && (scope.parentIds === null || scope.parentIds.has(profile.id))
    if (isFaculty || isAllowedParent) allowedProfileById.set(profile.id, profile)
  }
  const allowedStudentById = new Map<string, StudentRow>()
  for (const student of studentById.values()) {
    if (scope.studentIds === null || scope.studentIds.has(student.id)) {
      allowedStudentById.set(student.id, student)
    }
  }

  const allowedStudentIds = [...allowedStudentById.keys()]
  const linksRequest = allowedStudentIds.length === 0
    ? null
    : admin
        .from('parent_students')
        .select('parent_id, student_id')
        .in('student_id', allowedStudentIds)
  const linksResponse = await linksRequest
  throwOnError(linksResponse?.error)
  const links = (linksResponse?.data ?? []) as ParentStudentRow[]
  const linkedParentIds = [...new Set(links.map((link) => link.parent_id))]
  const linkedParentsRequest = linkedParentIds.length === 0
    ? null
    : admin
        .from('profiles')
        .select('id, email, full_name, role, school_id')
        .eq('school_id', sender.schoolId)
        .eq('role', 'parent')
        .in('id', linkedParentIds)
  const linkedParentsResponse = await linkedParentsRequest
  throwOnError(linkedParentsResponse?.error)
  const linkedParentById = new Map<string, ProfileRow>(
    ((linkedParentsResponse?.data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile])
  )
  const parentsByStudent = new Map<string, ProfileRow[]>()
  for (const link of links) {
    const parent = linkedParentById.get(link.parent_id)
    if (!parent) continue
    const parents = parentsByStudent.get(link.student_id) ?? []
    parents.push(parent)
    parentsByStudent.set(link.student_id, parents)
  }

  const deliveries = new Map<string, ResolvedPeopleDelivery>()
  for (const ref of refs) {
    if (ref.kind !== 'profile') continue
    const profile = allowedProfileById.get(ref.id)
    if (profile) addDelivery(deliveries, profile, peopleRefKey(ref))
  }
  for (const ref of refs) {
    if (ref.kind !== 'student' || !allowedStudentById.has(ref.id)) continue
    for (const parent of parentsByStudent.get(ref.id) ?? []) {
      addDelivery(deliveries, parent, peopleRefKey(ref))
    }
  }

  const rejectedKeys: string[] = []
  const selections: PeopleSelectionPreview[] = []
  for (const ref of refs) {
    const key = peopleRefKey(ref)
    if (ref.kind === 'profile') {
      const profile = allowedProfileById.get(ref.id)
      if (!profile) {
        rejectedKeys.push(key)
        continue
      }
      selections.push({
        ...profileSearchResult(profile),
        recipientNames: normalizeEmail(profile.email) ? [profileLabel(profile)] : [],
      })
      continue
    }

    const student = allowedStudentById.get(ref.id)
    if (!student) {
      rejectedKeys.push(key)
      continue
    }
    const linkedParents = parentsByStudent.get(ref.id) ?? []
    const searchResult = studentSearchResult(student, linkedParents)
    const recipientNames = [...new Map(
      linkedParents.flatMap((parent) => {
        const email = normalizeEmail(parent.email)
        return email ? [[email, profileLabel(parent)] as const] : []
      })
    ).values()]
    selections.push({ ...searchResult, recipientNames })
  }

  const resolvedDeliveries = [...deliveries.values()]
  return {
    preview: {
      selectedCount: selections.length,
      recipientCount: resolvedDeliveries.length,
      selections,
      unavailableCount: selections.filter((selection) => selection.disabledReason !== null).length,
    },
    deliveries: resolvedDeliveries,
    rejectedKeys,
  }
}
