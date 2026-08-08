import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

vi.mock('server-only', () => ({}))

import {
  resolvePeopleDirectory,
  searchPeopleDirectory,
  type PeopleSender,
} from '@/lib/email/people-directory'

type LocalStatus = {
  API_URL: string
  SERVICE_ROLE_KEY: string
}

const TABLES = ['schools', 'profiles', 'students', 'parent_students']
const schoolId = randomUUID()
const outsideSchoolId = randomUUID()
const studentId = randomUUID()
const outsideStudentId = randomUUID()
const reservedFirstName = 'R,()"\\%_'
const createdUserIds: string[] = []
let admin: SupabaseClient | null = null
let principalSender: PeopleSender
let localParentId = ''
let outsideParentId = ''

function localSupabaseStatus(): LocalStatus {
  const raw = execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const status = JSON.parse(raw) as LocalStatus
  const url = new URL(status.API_URL)
  if (!['127.0.0.1', 'localhost', '::1'].includes(url.hostname)) {
    throw new Error(`Refusing non-local Supabase integration target: ${url.hostname}`)
  }
  if (!status.SERVICE_ROLE_KEY) throw new Error('Local Supabase service role key is unavailable')
  return status
}

function queryLocalDatabase(sql: string) {
  for (const statement of sql.split(';').map((part) => part.trim()).filter(Boolean)) {
    execFileSync('npx', ['supabase', 'db', 'query', '--local', statement], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  }
}

async function createProfile(opts: {
  email: string
  fullName: string
  role: 'parent' | 'principal'
  schoolId: string
}) {
  if (!admin) throw new Error('Integration admin is unavailable')
  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email: opts.email,
    password: `Local-only-${randomUUID()}`,
    email_confirm: true,
  })
  if (userError || !userData.user) throw userError ?? new Error('Auth fixture creation failed')
  createdUserIds.push(userData.user.id)
  const { error: profileError } = await admin.from('profiles').insert({
    id: userData.user.id,
    school_id: opts.schoolId,
    role: opts.role,
    full_name: opts.fullName,
    email: opts.email,
  })
  if (profileError) throw profileError
  return userData.user.id
}

beforeAll(async () => {
  const status = localSupabaseStatus()
  process.env.NEXT_PUBLIC_SUPABASE_URL = status.API_URL
  process.env.SUPABASE_SERVICE_ROLE_KEY = status.SERVICE_ROLE_KEY

  queryLocalDatabase(`
    GRANT USAGE ON SCHEMA public TO service_role;
    GRANT SELECT, INSERT, DELETE ON TABLE ${TABLES.map((table) => `public.${table}`).join(', ')} TO service_role;
  `)

  admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error: schoolError } = await admin.from('schools').insert([
    { id: schoolId, name: 'People Boundary School' },
    { id: outsideSchoolId, name: 'Outside Boundary School' },
  ])
  if (schoolError) throw schoolError

  const marker = randomUUID()
  const principalId = await createProfile({
    email: `principal-${marker}@local.test`,
    fullName: 'Boundary Principal',
    role: 'principal',
    schoolId,
  })
  localParentId = await createProfile({
    email: `local-parent-${marker}@local.test`,
    fullName: 'Local Parent',
    role: 'parent',
    schoolId,
  })
  outsideParentId = await createProfile({
    email: `outside-parent-${marker}@local.test`,
    fullName: 'Outside Parent',
    role: 'parent',
    schoolId: outsideSchoolId,
  })
  principalSender = { id: principalId, schoolId, role: 'principal' }

  const { error: studentError } = await admin.from('students').insert([
    {
      id: studentId,
      school_id: schoolId,
      first_name: reservedFirstName,
      last_name: 'Boundary',
      grade_level: '5',
      active: true,
    },
    {
      id: outsideStudentId,
      school_id: outsideSchoolId,
      first_name: 'Outside',
      last_name: 'Student',
      grade_level: '6',
      active: true,
    },
  ])
  if (studentError) throw studentError

  const { error: linksError } = await admin.from('parent_students').insert([
    { student_id: studentId, parent_id: localParentId },
    // Deliberately malformed cross-tenant link. The directory must still enforce school scope.
    { student_id: studentId, parent_id: outsideParentId },
  ])
  if (linksError) throw linksError
})

afterAll(async () => {
  if (admin) {
    await admin.from('parent_students').delete().in('student_id', [studentId, outsideStudentId])
    await admin.from('students').delete().in('id', [studentId, outsideStudentId])
    for (const userId of createdUserIds) await admin.auth.admin.deleteUser(userId)
    await admin.from('schools').delete().in('id', [schoolId, outsideSchoolId])
  }
  queryLocalDatabase(`
    REVOKE SELECT, INSERT, DELETE ON TABLE ${TABLES.map((table) => `public.${table}`).join(', ')} FROM service_role;
  `)
})

describe('People directory real local PostgREST boundary', () => {
  it('rejects cross-school profile and student references', async () => {
    const resolution = await resolvePeopleDirectory(principalSender, [
      { kind: 'profile', id: outsideParentId },
      { kind: 'student', id: outsideStudentId },
    ])

    expect(resolution.deliveries).toEqual([])
    expect(resolution.rejectedKeys).toEqual([
      `profile:${outsideParentId}`,
      `student:${outsideStudentId}`,
    ])
  })

  it('ignores a malformed cross-tenant parent link during student expansion', async () => {
    const resolution = await resolvePeopleDirectory(principalSender, [
      { kind: 'student', id: studentId },
    ])

    expect(resolution.rejectedKeys).toEqual([])
    expect(resolution.deliveries).toHaveLength(1)
    expect(resolution.deliveries[0]).toMatchObject({ name: 'Local Parent', role: 'parent' })
    expect(resolution.deliveries[0].email).toContain('local-parent-')
    expect(resolution.deliveries[0].email).not.toContain('outside-parent-')
  })

  it('fails closed for an invalid runtime sender role', async () => {
    const invalidSender = { ...principalSender, role: 'parent' } as unknown as PeopleSender

    await expect(searchPeopleDirectory(invalidSender, reservedFirstName)).rejects.toThrow(
      'Invalid People sender'
    )
    await expect(
      resolvePeopleDirectory(invalidSender, [{ kind: 'student', id: studentId }])
    ).rejects.toThrow('Invalid People sender')
  })

  it('safely searches comma, parentheses, quote, backslash, percent, and underscore literals', async () => {
    const results = await searchPeopleDirectory(principalSender, reservedFirstName)

    expect(results.map((result) => result.key)).toContain(`student:${studentId}`)
    expect(results.find((result) => result.key === `student:${studentId}`)).toMatchObject({
      label: `${reservedFirstName} Boundary`,
      recipientCount: 1,
      disabledReason: null,
    })
  })
})
