import { execFileSync } from 'node:child_process'
import { createHmac, randomUUID } from 'node:crypto'
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
  JWT_SECRET: string
  SERVICE_ROLE_KEY: string
}
type CanonicalAclRow = {
  object_type: string
  object_name: string
  grantor: string
  grantee: string
  privilege_type: string
  is_grantable: boolean
}
type CanonicalMembershipRow = {
  role_name: string
  member_name: string
  grantor: string
  admin_option: boolean
  inherit_option: boolean
  set_option: boolean
}
type CanonicalAccessSnapshot = {
  acl: CanonicalAclRow[]
  memberships: CanonicalMembershipRow[]
}
type DisposableDataRole = {
  dataRole: string
  jwt: string
  loginRole: string
}
type TestIdentity = { id: string; client: SupabaseClient }

const TABLES = ['schools', 'profiles', 'students', 'parent_students'] as const
const schoolId = randomUUID()
const outsideSchoolId = randomUUID()
const studentId = randomUUID()
const outsideStudentId = randomUUID()
const reservedFirstName = 'R,()"\\%_'
const createdUserIds: string[] = []
let authAdmin: SupabaseClient | null = null
let dataAdmin: SupabaseClient | null = null
let status: LocalStatus
let principalIdentity: TestIdentity
let nullSchoolIdentity: TestIdentity
let missingProfileIdentity: TestIdentity
let anonymousClient: SupabaseClient
let principalSender: PeopleSender
let localParentId = ''
let outsideParentId = ''
let hostAccessSnapshot: CanonicalAccessSnapshot | null = null
let dataRole: DisposableDataRole | null = null
let fixturesCleaned = false
let dataRoleCleaned = false

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
  if (!result.ANON_KEY || !result.JWT_SECRET || !result.SERVICE_ROLE_KEY) {
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

function snapshotCanonicalAcl(): CanonicalAclRow[] {
  return queryLocalDatabase(`
    WITH objects AS (
      SELECT 'schema'::text AS object_type, n.nspname::text AS object_name,
        COALESCE(n.nspacl, acldefault('n', n.nspowner)) AS acl
      FROM pg_namespace n
      WHERE n.nspname = 'public'
      UNION ALL
      SELECT 'table'::text, c.relname::text,
        COALESCE(c.relacl, acldefault('r', c.relowner))
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname IN ('schools', 'profiles', 'students', 'parent_students')
    )
    SELECT object_type, object_name,
      grantor.rolname AS grantor,
      CASE WHEN expanded.grantee = 0 THEN 'PUBLIC' ELSE grantee.rolname END AS grantee,
      expanded.privilege_type, expanded.is_grantable
    FROM objects
    CROSS JOIN LATERAL aclexplode(objects.acl) expanded
    JOIN pg_roles grantor ON grantor.oid = expanded.grantor
    LEFT JOIN pg_roles grantee ON grantee.oid = expanded.grantee
    ORDER BY object_type, object_name, grantor, grantee, privilege_type, is_grantable
  `).rows as CanonicalAclRow[]
}

function snapshotCanonicalAccess(): CanonicalAccessSnapshot {
  const memberships = queryLocalDatabase(`
    SELECT role.rolname AS role_name, member.rolname AS member_name,
      grantor.rolname AS grantor, membership.admin_option,
      membership.inherit_option, membership.set_option
    FROM pg_auth_members membership
    JOIN pg_roles role ON role.oid = membership.roleid
    JOIN pg_roles member ON member.oid = membership.member
    JOIN pg_roles grantor ON grantor.oid = membership.grantor
    ORDER BY role_name, member_name, grantor, admin_option, inherit_option, set_option
  `).rows as CanonicalMembershipRow[]
  return { acl: snapshotCanonicalAcl(), memberships }
}

function createTestJwt(role: string) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const header = encode({ alg: 'HS256', typ: 'JWT' })
  const payload = encode({
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
    iss: 'supabase-demo',
    role,
  })
  const signature = createHmac('sha256', status.JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url')
  return `${header}.${payload}.${signature}`
}

function generatedRoleName(kind: 'data' | 'login') {
  return `people_${kind}_${randomUUID().replaceAll('-', '')}`
}

function cleanupDisposableDataRole(role: Partial<DisposableDataRole>) {
  if (role.loginRole) {
    runLocalDatabase(`REVOKE ${role.loginRole} FROM authenticator`)
  }
  if (role.dataRole && role.loginRole) {
    runLocalDatabase(`REVOKE ${role.dataRole} FROM ${role.loginRole}`)
  }
  if (role.dataRole) {
    runLocalDatabase(
      `REVOKE SELECT, INSERT, DELETE ON TABLE ${TABLES.map((table) => `public.${table}`).join(', ')} FROM ${role.dataRole}`
    )
  }
  if (role.loginRole) runLocalDatabase(`DROP ROLE ${role.loginRole}`)
  if (role.dataRole) runLocalDatabase(`DROP ROLE ${role.dataRole}`)
}

function setupDisposableDataRole(): DisposableDataRole {
  const role: Partial<DisposableDataRole> = {}
  try {
    const dataRoleName = generatedRoleName('data')
    runLocalDatabase(`CREATE ROLE ${dataRoleName} NOLOGIN`)
    role.dataRole = dataRoleName
    const loginRoleName = generatedRoleName('login')
    runLocalDatabase(`CREATE ROLE ${loginRoleName} NOLOGIN BYPASSRLS`)
    role.loginRole = loginRoleName
    runLocalDatabase(`GRANT ${role.dataRole} TO ${role.loginRole}`)
    runLocalDatabase(`GRANT ${role.loginRole} TO authenticator`)
    runLocalDatabase(
      `GRANT SELECT, INSERT, DELETE ON TABLE ${TABLES.map((table) => `public.${table}`).join(', ')} TO ${role.dataRole}`
    )

    const access = queryLocalDatabase(`
      SELECT has_schema_privilege('${role.loginRole}', 'public', 'USAGE') AS public_usage,
        has_table_privilege('${role.loginRole}', 'public.students', 'SELECT') AS inherited_select,
        EXISTS (
          SELECT 1
          FROM aclexplode((SELECT relacl FROM pg_class WHERE oid = 'public.students'::regclass)) acl
          JOIN pg_roles grantee ON grantee.oid = acl.grantee
          WHERE grantee.rolname = '${role.loginRole}' AND acl.privilege_type = 'SELECT'
        ) AS direct_select
    `).rows[0]
    if (access.public_usage !== true || access.inherited_select !== true || access.direct_select !== false) {
      throw new Error(
        'Local Supabase ACL setup error: disposable role lacks PUBLIC schema usage or inherited table access'
      )
    }

    return {
      dataRole: role.dataRole,
      loginRole: role.loginRole,
      jwt: createTestJwt(role.loginRole),
    }
  } catch (error) {
    cleanupDisposableDataRole(role)
    throw error
  }
}

async function withDisposableDataRole<T>(callback: (role: DisposableDataRole) => Promise<T>) {
  const role = setupDisposableDataRole()
  try {
    return await callback(role)
  } finally {
    cleanupDisposableDataRole(role)
  }
}

async function createAuthIdentity(prefix: string): Promise<TestIdentity> {
  if (!authAdmin) throw new Error('Integration Auth admin is unavailable')
  const marker = randomUUID()
  const email = `${prefix}-${marker}@local.test`
  const password = `Local-only-${randomUUID()}`
  const { data: userData, error: userError } = await authAdmin.auth.admin.createUser({
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
  if (!dataAdmin) throw new Error('Integration data admin is unavailable')
  const identity = await createAuthIdentity(opts.prefix)
  const { error: profileError } = await dataAdmin.from('profiles').insert({
    id: identity.id,
    school_id: opts.schoolId,
    role: opts.role,
    full_name: opts.fullName,
    email: `${opts.prefix}-${identity.id}@local.test`,
  })
  if (profileError) throw profileError
  return identity
}

async function cleanupFixturesAndDataRole() {
  if (fixturesCleaned) return
  let cleanupError: unknown = null
  const rememberError = (error: unknown) => {
    cleanupError ??= error
  }
  try {
    if (dataAdmin) {
      const parentLinks = await dataAdmin
        .from('parent_students')
        .delete()
        .in('student_id', [studentId, outsideStudentId])
      if (parentLinks.error) rememberError(parentLinks.error)
      const students = await dataAdmin
        .from('students')
        .delete()
        .in('id', [studentId, outsideStudentId])
      if (students.error) rememberError(students.error)
    }
    if (authAdmin) {
      for (const userId of createdUserIds) {
        const { error } = await authAdmin.auth.admin.deleteUser(userId)
        if (error) rememberError(error)
      }
    }
    if (dataAdmin) {
      const { error } = await dataAdmin.from('schools').delete().in('id', [schoolId, outsideSchoolId])
      if (error) rememberError(error)
    }
  } finally {
    if (!dataRoleCleaned && dataRole) {
      try {
        cleanupDisposableDataRole(dataRole)
        dataRoleCleaned = true
      } catch (error) {
        rememberError(error)
      }
    }
    fixturesCleaned = true
  }
  if (cleanupError) throw cleanupError
}

beforeAll(async () => {
  status = localSupabaseStatus()
  process.env.NEXT_PUBLIC_SUPABASE_URL = status.API_URL
  hostAccessSnapshot = snapshotCanonicalAccess()

  try {
    dataRole = setupDisposableDataRole()
    process.env.SUPABASE_SERVICE_ROLE_KEY = dataRole.jwt
    authAdmin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    dataAdmin = createClient(status.API_URL, dataRole.jwt, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    anonymousClient = createClient(status.API_URL, status.ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { error: schoolError } = await dataAdmin.from('schools').insert([
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

    const { error: studentError } = await dataAdmin.from('students').insert([
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

    const { error: linksError } = await dataAdmin.from('parent_students').insert([
      { student_id: studentId, parent_id: localParentId },
      // Deliberately malformed cross-tenant link. The directory must still enforce school scope.
      { student_id: studentId, parent_id: outsideParentId },
    ])
    if (linksError) throw linksError
  } catch (error) {
    try {
      await cleanupFixturesAndDataRole()
    } finally {
      expect(snapshotCanonicalAccess()).toEqual(hostAccessSnapshot)
    }
    throw error
  }
})

beforeEach(() => {
  sessionState.client = principalIdentity.client
})

afterAll(async () => {
  try {
    await cleanupFixturesAndDataRole()
  } finally {
    expect(snapshotCanonicalAccess()).toEqual(hostAccessSnapshot)
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

  it('preserves canonical ACLs and memberships even when isolated setup use throws', async () => {
    const beforeFailure = snapshotCanonicalAccess()
    await expect(
      withDisposableDataRole(async (probeRole) => {
        const probe = createClient(status.API_URL, probeRole.jwt, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
        const { error } = await probe.from('students').select('id').limit(1)
        expect(error).toBeNull()
        throw new Error('intentional disposable-role failure')
      })
    ).rejects.toThrow('intentional disposable-role failure')
    expect(snapshotCanonicalAccess()).toEqual(beforeFailure)

    await cleanupFixturesAndDataRole()
    expect(snapshotCanonicalAccess()).toEqual(hostAccessSnapshot)
  })
})
