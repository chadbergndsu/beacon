import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const sessionState = vi.hoisted(() => ({ client: null as SupabaseClient | null }))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => {
    if (!sessionState.client) throw new Error('Integration session client is unavailable')
    return sessionState.client
  },
}))

import {
  resolvePeopleDirectory,
  searchPeopleDirectory,
  type PeopleSender,
} from '@/lib/email/people-directory'

type LocalStatus = {
  ANON_KEY: string
  API_URL: string
  SERVICE_ROLE_KEY: string
}
type TablePrivilege = 'SELECT' | 'INSERT' | 'DELETE'
type PrivilegeSnapshot = {
  schemaUsage: boolean
  tables: Record<string, Record<TablePrivilege, boolean>>
}
type TestIdentity = { id: string; client: SupabaseClient }

const TABLES = ['schools', 'profiles', 'students', 'parent_students'] as const
const TABLE_PRIVILEGES: TablePrivilege[] = ['SELECT', 'INSERT', 'DELETE']
const schoolId = randomUUID()
const outsideSchoolId = randomUUID()
const studentId = randomUUID()
const outsideStudentId = randomUUID()
const reservedFirstName = 'R,()"\\%_'
const createdUserIds: string[] = []
let admin: SupabaseClient | null = null
let status: LocalStatus
let principalIdentity: TestIdentity
let nullSchoolIdentity: TestIdentity
let missingProfileIdentity: TestIdentity
let anonymousClient: SupabaseClient
let principalSender: PeopleSender
let localParentId = ''
let outsideParentId = ''
let hostPrivilegeSnapshot: PrivilegeSnapshot | null = null
let priorPrivilegeSnapshot: PrivilegeSnapshot | null = null
let fixturesCleaned = false
let hostPrivilegesRestored = false

function localSupabaseStatus(): LocalStatus {
  const raw = execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const result = JSON.parse(raw) as LocalStatus
  const url = new URL(result.API_URL)
  if (!['127.0.0.1', 'localhost', '::1'].includes(url.hostname)) {
    throw new Error(`Refusing non-local Supabase integration target: ${url.hostname}`)
  }
  if (!result.ANON_KEY || !result.SERVICE_ROLE_KEY) {
    throw new Error('Local Supabase API keys are unavailable')
  }
  return result
}

function runLocalDatabase(sql: string) {
  return execFileSync('npx', ['supabase', 'db', 'query', '--local', sql], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

function queryLocalDatabase(sql: string) {
  const raw = runLocalDatabase(sql)
  return JSON.parse(raw) as { rows: Record<string, unknown>[] }
}

function snapshotPrivileges(): PrivilegeSnapshot {
  const columns = [
    `has_schema_privilege('service_role', 'public', 'USAGE') AS schema_usage`,
    ...TABLES.flatMap((table) =>
      TABLE_PRIVILEGES.map(
        (privilege) =>
          `has_table_privilege('service_role', 'public.${table}', '${privilege}') AS ${table}_${privilege.toLowerCase()}`
      )
    ),
  ]
  const row = queryLocalDatabase(`SELECT ${columns.join(', ')}`).rows[0]
  return {
    schemaUsage: row.schema_usage === true,
    tables: Object.fromEntries(
      TABLES.map((table) => [
        table,
        Object.fromEntries(
          TABLE_PRIVILEGES.map((privilege) => [
            privilege,
            row[`${table}_${privilege.toLowerCase()}`] === true,
          ])
        ) as Record<TablePrivilege, boolean>,
      ])
    ),
  }
}

function setPrivilege(granted: boolean, privilege: string, target: string) {
  runLocalDatabase(`${granted ? 'GRANT' : 'REVOKE'} ${privilege} ON ${target} ${granted ? 'TO' : 'FROM'} service_role`)
}

function restorePrivileges(snapshot: PrivilegeSnapshot) {
  setPrivilege(snapshot.schemaUsage, 'USAGE', 'SCHEMA public')
  for (const table of TABLES) {
    for (const privilege of TABLE_PRIVILEGES) {
      setPrivilege(snapshot.tables[table][privilege], privilege, `TABLE public.${table}`)
    }
  }
}

function grantTemporaryPrivileges() {
  setPrivilege(true, 'USAGE', 'SCHEMA public')
  for (const table of TABLES) {
    for (const privilege of TABLE_PRIVILEGES) {
      setPrivilege(true, privilege, `TABLE public.${table}`)
    }
  }
}

async function createAuthIdentity(prefix: string): Promise<TestIdentity> {
  if (!admin) throw new Error('Integration admin is unavailable')
  const marker = randomUUID()
  const email = `${prefix}-${marker}@local.test`
  const password = `Local-only-${randomUUID()}`
  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (userError || !userData.user) throw userError ?? new Error('Auth fixture creation failed')
  createdUserIds.push(userData.user.id)

  const client = createClient(status.API_URL, status.ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error: signInError } = await client.auth.signInWithPassword({ email, password })
  if (signInError) throw signInError
  return { id: userData.user.id, client }
}

async function createProfile(opts: {
  prefix: string
  fullName: string
  role: 'parent' | 'principal'
  schoolId: string | null
}) {
  if (!admin) throw new Error('Integration admin is unavailable')
  const identity = await createAuthIdentity(opts.prefix)
  const { error: profileError } = await admin.from('profiles').insert({
    id: identity.id,
    school_id: opts.schoolId,
    role: opts.role,
    full_name: opts.fullName,
    email: `${opts.prefix}-${identity.id}@local.test`,
  })
  if (profileError) throw profileError
  return identity
}

async function cleanupFixturesAndRestorePriorPrivileges() {
  if (fixturesCleaned) return
  try {
    if (admin) {
      await admin.from('parent_students').delete().in('student_id', [studentId, outsideStudentId])
      await admin.from('students').delete().in('id', [studentId, outsideStudentId])
      for (const userId of createdUserIds) await admin.auth.admin.deleteUser(userId)
      await admin.from('schools').delete().in('id', [schoolId, outsideSchoolId])
    }
  } finally {
    if (priorPrivilegeSnapshot) restorePrivileges(priorPrivilegeSnapshot)
    fixturesCleaned = true
  }
}

function restoreHostPrivileges() {
  if (hostPrivilegesRestored || !hostPrivilegeSnapshot) return
  restorePrivileges(hostPrivilegeSnapshot)
  hostPrivilegesRestored = true
}

beforeAll(async () => {
  status = localSupabaseStatus()
  process.env.NEXT_PUBLIC_SUPABASE_URL = status.API_URL
  process.env.SUPABASE_SERVICE_ROLE_KEY = status.SERVICE_ROLE_KEY
  hostPrivilegeSnapshot = snapshotPrivileges()

  try {
    // Simulate a legitimate pre-existing grant so teardown proves it restores rather than revokes.
    setPrivilege(true, 'SELECT', 'TABLE public.students')
    priorPrivilegeSnapshot = snapshotPrivileges()
    grantTemporaryPrivileges()

    admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    anonymousClient = createClient(status.API_URL, status.ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { error: schoolError } = await admin.from('schools').insert([
      { id: schoolId, name: 'People Boundary School' },
      { id: outsideSchoolId, name: 'Outside Boundary School' },
    ])
    if (schoolError) throw schoolError

    principalIdentity = await createProfile({
      prefix: 'principal',
      fullName: 'Boundary Principal',
      role: 'principal',
      schoolId,
    })
    const localParentIdentity = await createProfile({
      prefix: 'local-parent',
      fullName: 'Local Parent',
      role: 'parent',
      schoolId,
    })
    const outsideParentIdentity = await createProfile({
      prefix: 'outside-parent',
      fullName: 'Outside Parent',
      role: 'parent',
      schoolId: outsideSchoolId,
    })
    nullSchoolIdentity = await createProfile({
      prefix: 'null-school',
      fullName: 'Null School Principal',
      role: 'principal',
      schoolId: null,
    })
    missingProfileIdentity = await createAuthIdentity('missing-profile')
    localParentId = localParentIdentity.id
    outsideParentId = outsideParentIdentity.id
    principalSender = { id: principalIdentity.id, schoolId, role: 'principal' }

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
  } catch (error) {
    try {
      await cleanupFixturesAndRestorePriorPrivileges()
    } finally {
      restoreHostPrivileges()
    }
    throw error
  }
})

beforeEach(() => {
  sessionState.client = principalIdentity.client
})

afterAll(async () => {
  try {
    await cleanupFixturesAndRestorePriorPrivileges()
  } finally {
    restoreHostPrivileges()
  }
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

  it('rejects an invalid runtime sender role', async () => {
    const sender = { ...principalSender, role: 'parent' } as unknown as PeopleSender
    await expect(searchPeopleDirectory(sender, reservedFirstName)).rejects.toThrow(
      'Invalid People sender'
    )
  })

  it.each([
    ['forged user id', () => ({ ...principalSender, id: outsideParentId })],
    ['mismatched school', () => ({ ...principalSender, schoolId: outsideSchoolId })],
    ['mismatched role', () => ({ ...principalSender, role: 'admin' as const })],
  ])('rejects a valid-role sender with %s', async (_case, makeSender) => {
    const sender = makeSender()
    await expect(searchPeopleDirectory(sender, reservedFirstName)).rejects.toThrow(
      'Invalid People sender'
    )
    await expect(
      resolvePeopleDirectory(sender, [{ kind: 'student', id: studentId }])
    ).rejects.toThrow('Invalid People sender')
  })

  it('rejects an authenticated profile with a null school', async () => {
    sessionState.client = nullSchoolIdentity.client
    await expect(searchPeopleDirectory(principalSender, reservedFirstName)).rejects.toThrow(
      'Invalid People sender'
    )
  })

  it('rejects an authenticated user without a profile', async () => {
    sessionState.client = missingProfileIdentity.client
    await expect(searchPeopleDirectory(principalSender, reservedFirstName)).rejects.toThrow(
      'Invalid People sender'
    )
  })

  it('rejects when there is no authenticated user', async () => {
    sessionState.client = anonymousClient
    await expect(searchPeopleDirectory(principalSender, reservedFirstName)).rejects.toThrow(
      'Invalid People sender'
    )
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

  it('restores pre-existing and host privilege state exactly', async () => {
    await cleanupFixturesAndRestorePriorPrivileges()
    expect(snapshotPrivileges()).toEqual(priorPrivilegeSnapshot)

    restoreHostPrivileges()
    expect(snapshotPrivileges()).toEqual(hostPrivilegeSnapshot)
  })
})
