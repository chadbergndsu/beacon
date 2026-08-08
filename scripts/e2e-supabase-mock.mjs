import { createServer } from 'node:http'

const port = Number(process.env.E2E_SUPABASE_MOCK_PORT || '54329')
const schoolId = '00000000-0000-4000-8000-000000000001'
const outsideSchoolId = '00000000-0000-4000-8000-000000000002'
const childId = '00000000-0000-4000-8000-000000000201'
const unassignedChildId = '00000000-0000-4000-8000-000000000202'
const outsideChildId = '00000000-0000-4000-8000-000000000203'
const parentId = '00000000-0000-4000-8000-000000000101'
const secondLinkedParentId = '00000000-0000-4000-8000-000000000105'
const unassignedParentId = '00000000-0000-4000-8000-000000000106'
const outsideParentId = '00000000-0000-4000-8000-000000000107'
const teacherClassId = '00000000-0000-4000-8000-000000000301'
const parentFeedbackConflictKey = 'school_id,parent_id,surface,week_start'

function isoWeekStart(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7))
  return start.toISOString().slice(0, 10)
}

function expectedParentFeedbackKey() {
  return {
    school_id: schoolId,
    parent_id: parentId,
    surface: 'parent_dashboard',
    week_start: isoWeekStart(),
  }
}

function hasExpectedParentFeedbackKey(value) {
  const expected = expectedParentFeedbackKey()
  return Object.entries(expected).every(([name, expectedValue]) => value?.[name] === expectedValue)
}

const actors = {
  '00000000-0000-4000-8000-000000000101': {
    email: 'pilot-parent@beacon.test',
    full_name: 'Pat Parent',
    role: 'parent',
  },
  '00000000-0000-4000-8000-000000000102': {
    email: 'pilot-teacher@beacon.test',
    full_name: 'Terry Teacher',
    role: 'teacher',
  },
  '00000000-0000-4000-8000-000000000103': {
    email: 'pilot-principal@beacon.test',
    full_name: 'Priya Principal',
    role: 'principal',
  },
  '00000000-0000-4000-8000-000000000104': {
    email: 'pilot-admin@beacon.test',
    full_name: 'Avery Admin',
    role: 'admin',
  },
}

let savedParentFeedback = null
let emailOutbox = []

const profiles = [
  ...Object.entries(actors).map(([id, actor]) => ({ id, school_id: schoolId, ...actor })),
  {
    id: secondLinkedParentId,
    school_id: schoolId,
    email: 'pilot-family@beacon.test',
    full_name: 'Chris Parent',
    role: 'parent',
  },
  {
    id: unassignedParentId,
    school_id: schoolId,
    email: 'unassigned-family@beacon.test',
    full_name: 'Unassigned Parent',
    role: 'parent',
  },
  {
    id: outsideParentId,
    school_id: outsideSchoolId,
    email: 'outside-family@beacon.test',
    full_name: 'Outside Parent',
    role: 'parent',
  },
]

profiles.find((profile) => profile.id === parentId).email = 'pilot-family@beacon.test'

const students = [
  {
    id: childId,
    school_id: schoolId,
    first_name: 'Sam',
    last_name: 'Student',
    grade_level: '5',
    active: true,
  },
  {
    id: unassignedChildId,
    school_id: schoolId,
    first_name: 'Unassigned',
    last_name: 'Student',
    grade_level: '5',
    active: true,
  },
  {
    id: outsideChildId,
    school_id: outsideSchoolId,
    first_name: 'Outside',
    last_name: 'Student',
    grade_level: '5',
    active: true,
  },
]

const parentStudentLinks = [
  { parent_id: secondLinkedParentId, student_id: childId },
  { parent_id: parentId, student_id: childId },
  { parent_id: unassignedParentId, student_id: unassignedChildId },
  { parent_id: outsideParentId, student_id: outsideChildId },
]

function json(response, status, body, { count, head = false } = {}) {
  response.statusCode = status
  response.setHeader('content-type', 'application/json')
  response.setHeader('access-control-allow-origin', '*')
  if (typeof count === 'number') {
    response.setHeader('content-range', count === 0 ? '*/0' : `0-${count - 1}/${count}`)
    response.setHeader('range-unit', 'items')
  }
  response.end(head ? '' : JSON.stringify(body))
}

function noContent(response, status = 201) {
  response.statusCode = status
  response.setHeader('content-type', 'application/json')
  response.end('')
}

async function requestBody(request) {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  if (chunks.length === 0) return null
  const body = Buffer.concat(chunks).toString('utf8')
  return body ? JSON.parse(body) : null
}

function jwtPayload(request) {
  const authorization = request.headers.authorization || ''
  const token = authorization.replace(/^Bearer\s+/i, '')
  const payload = token.split('.')[1]
  if (!payload) return null
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

function authUserForId(actorId) {
  const actor = actors[actorId]
  if (!actor) return null
  const timestamp = new Date().toISOString()
  return {
    id: actorId,
    aud: 'authenticated',
    role: 'authenticated',
    email: actor.email,
    email_confirmed_at: timestamp,
    phone: '',
    confirmed_at: timestamp,
    last_sign_in_at: timestamp,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
    created_at: timestamp,
    updated_at: timestamp,
    is_anonymous: false,
  }
}

function authUser(request) {
  const payload = jwtPayload(request)
  return payload?.sub ? authUserForId(payload.sub) : null
}

function sessionForId(actorId) {
  const user = authUserForId(actorId)
  if (!user) return null
  const now = Math.floor(Date.now() / 1000)
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const accessToken = [
    encode({ alg: 'HS256', typ: 'JWT' }),
    encode({
      aud: 'authenticated',
      email: user.email,
      exp: now + 3600,
      iat: now,
      iss: `http://127.0.0.1:${port}/auth/v1`,
      role: 'authenticated',
      sub: actorId,
    }),
    Buffer.from('e2e-signature').toString('base64url'),
  ].join('.')

  return {
    access_token: accessToken,
    expires_at: now + 3600,
    expires_in: 3600,
    refresh_token: `e2e-refresh-${actorId}`,
    token_type: 'bearer',
    user,
  }
}

function eqFilter(url, name) {
  const value = url.searchParams.get(name)
  return value?.startsWith('eq.') ? value.slice(3) : null
}

function inFilter(url, name) {
  const value = url.searchParams.get(name)
  if (!value?.startsWith('in.(') || !value.endsWith(')')) return []
  return value
    .slice(4, -1)
    .split(',')
    .map((item) => item.replace(/^"|"$/g, ''))
}

function ilikeFilter(url, name) {
  const value = url.searchParams.get(name)
  if (!value?.startsWith('ilike.')) return null
  return value.slice(6).replace(/^"|"$/g, '').replaceAll('%', '').replaceAll('\\', '').toLowerCase()
}

function matchesIlike(row, url, name) {
  const query = ilikeFilter(url, name)
  return !query || String(row[name] ?? '').toLowerCase().includes(query)
}

function matchesEqAndIn(row, url, names) {
  return names.every((name) => {
    const eq = eqFilter(url, name)
    const included = inFilter(url, name)
    return (
      (eq === null || String(row[name]) === eq) &&
      (included.length === 0 || included.includes(String(row[name])))
    )
  })
}

function matchesStudentOr(row, url) {
  const value = url.searchParams.get('or')
  if (!value) return true
  const filters = [
    ...value.replace(/^\(|\)$/g, '').matchAll(/(?:^|,)([a-z_]+)\.ilike\."?([^",]+)"?/g),
  ]
  return filters.some(([, name, pattern]) =>
    String(row[name] ?? '')
      .toLowerCase()
      .includes(pattern.replaceAll('%', '').replaceAll('\\', '').toLowerCase())
  )
}

function profileRows(url) {
  return profiles
    .filter(
      (profile) =>
        matchesEqAndIn(profile, url, ['id', 'school_id', 'role']) &&
        matchesIlike(profile, url, 'full_name')
    )
    .map((profile) => ({
      id: profile.id,
      school_id: profile.school_id,
      role: profile.role,
      full_name: profile.full_name,
      email: profile.email,
      phone: null,
      preferences: {},
    }))
}

function parentFeedbackRows(url) {
  const requestedParentId = eqFilter(url, 'parent_id')
  if (requestedParentId) {
    const queryKey = {
      school_id: eqFilter(url, 'school_id'),
      parent_id: requestedParentId,
      surface: eqFilter(url, 'surface'),
      week_start: eqFilter(url, 'week_start'),
    }
    return savedParentFeedback &&
      hasExpectedParentFeedbackKey(savedParentFeedback) &&
      hasExpectedParentFeedbackKey(queryKey)
      ? [{ rating: savedParentFeedback.rating, comment: savedParentFeedback.comment }]
      : []
  }

  const createdAt = new Date().toISOString()
  return Array.from({ length: 4 }, (_, index) => ({
    id: `00000000-0000-0000-0000-00000000030${index}`,
    rating: 'helpful',
    comment: null,
    created_at: createdAt,
  }))
}

function tableRows(table, url) {
  const select = url.searchParams.get('select') || '*'

  if (table === 'profiles') return profileRows(url)
  if (table === 'classes') {
    return [
      {
        id: teacherClassId,
        school_id: schoolId,
        teacher_id: '00000000-0000-4000-8000-000000000102',
        name: 'Grade 5 Homeroom',
      },
    ].filter((row) => matchesEqAndIn(row, url, ['id', 'school_id', 'teacher_id']))
  }
  if (table === 'enrollments') {
    return [{ class_id: teacherClassId, student_id: childId }].filter((row) =>
      matchesEqAndIn(row, url, ['class_id', 'student_id'])
    )
  }
  if (table === 'parent_students') {
    return parentStudentLinks.filter((row) =>
      matchesEqAndIn(row, url, ['parent_id', 'student_id'])
    )
  }
  if (table === 'students') {
    return students.filter(
      (row) =>
        matchesEqAndIn(row, url, ['id', 'school_id', 'active']) && matchesStudentOr(row, url)
    )
  }
  if (table === 'email_outbox') {
    return emailOutbox.filter(
      (row) =>
        matchesEqAndIn(row, url, ['id', 'school_id', 'status', 'kind']) &&
        matchesIlike(row, url, 'subject')
    )
  }
  if (table === 'pilot_activity_daily') {
    if (select === 'activity_date') {
      return [{ activity_date: new Date(Date.now() - 5 * 86_400_000).toISOString().slice(0, 10) }]
    }
    const actorRole = eqFilter(url, 'actor_role')
    if (actorRole === 'teacher') {
      return [{ user_id: '00000000-0000-4000-8000-000000000102' }]
    }
    if (actorRole === 'parent') {
      return [{ user_id: '00000000-0000-4000-8000-000000000101' }]
    }
    return []
  }
  if (table === 'parent_experience_feedback') return parentFeedbackRows(url)

  return []
}

async function handleRest(request, response, url) {
  const table = decodeURIComponent(url.pathname.slice('/rest/v1/'.length))
  const select = url.searchParams.get('select') || '*'

  if (table === 'attendance' && request.method === 'GET' && select === 'date') {
    json(response, 500, {
      code: 'E2E_ATTENDANCE_UNAVAILABLE',
      details: null,
      hint: null,
      message: 'The deterministic pilot fixture marks attendance unavailable.',
    })
    return
  }

  if (table === 'parent_experience_feedback' && request.method === 'POST') {
    const raw = await requestBody(request)
    const row = Array.isArray(raw) ? raw[0] : raw
    if (
      url.searchParams.get('on_conflict') !== parentFeedbackConflictKey ||
      !hasExpectedParentFeedbackKey(row)
    ) {
      json(response, 400, {
        code: 'E2E_PARENT_FEEDBACK_KEY_REQUIRED',
        message: 'The parent feedback fixture requires its complete current-week identity key.',
      })
      return
    }
    savedParentFeedback = {
      ...expectedParentFeedbackKey(),
      rating: row?.rating === 'not_yet' ? 'not_yet' : 'helpful',
      comment: typeof row?.comment === 'string' ? row.comment : null,
    }
    noContent(response)
    return
  }

  if (table === 'parent_experience_feedback' && request.method === 'GET') {
    const parentRead =
      select.replaceAll(' ', '') === 'rating,comment' ||
      ['parent_id', 'surface', 'week_start'].some((name) => url.searchParams.has(name))
    const queryKey = {
      school_id: eqFilter(url, 'school_id'),
      parent_id: eqFilter(url, 'parent_id'),
      surface: eqFilter(url, 'surface'),
      week_start: eqFilter(url, 'week_start'),
    }
    if (parentRead && !hasExpectedParentFeedbackKey(queryKey)) {
      json(response, 400, {
        code: 'E2E_PARENT_FEEDBACK_KEY_REQUIRED',
        message: 'The parent feedback fixture requires its complete current-week identity key.',
      })
      return
    }
  }

  if (table === 'email_outbox' && request.method === 'POST') {
    const raw = await requestBody(request)
    const inserted = (Array.isArray(raw) ? raw : [raw]).filter(Boolean).map((row, index) => {
      const outboxRow = {
        ...row,
        id: `00000000-0000-0000-0000-${String(emailOutbox.length + index + 1).padStart(12, '0')}`,
        created_at: new Date().toISOString(),
      }
      return outboxRow
    })
    emailOutbox = [...inserted, ...emailOutbox]
    json(
      response,
      201,
      inserted.map((row) => ({ id: row.id, status: row.status }))
    )
    return
  }

  if (request.method === 'POST' || request.method === 'PATCH' || request.method === 'DELETE') {
    await requestBody(request)
    noContent(response)
    return
  }

  const rows = tableRows(table, url)
  const wantsCount = request.headers.prefer?.includes('count=')
  json(response, 200, rows, {
    count: wantsCount ? rows.length : undefined,
    head: request.method === 'HEAD',
  })
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://127.0.0.1:${port}`)

  try {
    if (request.method === 'OPTIONS') {
      response.statusCode = 204
      response.end()
      return
    }
    if (url.pathname === '/health') {
      json(response, 200, { ok: true })
      return
    }
    if (url.pathname === '/auth/v1/user') {
      const user = authUser(request)
      if (!user) {
        json(response, 401, { code: 401, message: 'Invalid E2E session' })
        return
      }
      json(response, 200, user)
      return
    }
    if (
      request.method === 'POST' &&
      url.pathname === '/auth/v1/token' &&
      url.searchParams.get('grant_type') === 'password'
    ) {
      const body = await requestBody(request)
      const actorEntry = Object.entries(actors).find(([, actor]) => actor.email === body?.email)
      const session = actorEntry ? sessionForId(actorEntry[0]) : null
      if (!session) {
        json(response, 400, { code: 400, message: 'Invalid login credentials' })
        return
      }
      json(response, 200, session)
      return
    }
    if (
      request.method === 'POST' &&
      url.pathname === '/rest/v1/rpc/public_inquiry_rate_limit_ready'
    ) {
      response.setHeader('content-type', 'application/json')
      response.end('true')
      return
    }
    if (url.pathname.startsWith('/rest/v1/')) {
      await handleRest(request, response, url)
      return
    }

    json(response, 404, { message: 'not found' })
  } catch (error) {
    json(response, 500, {
      code: 'E2E_MOCK_ERROR',
      message: error instanceof Error ? error.message : 'E2E mock failure',
    })
  }
})

server.listen(port, '127.0.0.1')
