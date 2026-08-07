import { createServer } from 'node:http'

const port = Number(process.env.E2E_SUPABASE_MOCK_PORT || '54329')
const schoolId = '00000000-0000-0000-0000-000000000001'
const childId = '00000000-0000-0000-0000-000000000201'

const actors = {
  '00000000-0000-0000-0000-000000000101': {
    email: 'pilot-parent@beacon.test',
    full_name: 'Pat Parent',
    role: 'parent',
  },
  '00000000-0000-0000-0000-000000000102': {
    email: 'pilot-teacher@beacon.test',
    full_name: 'Terry Teacher',
    role: 'teacher',
  },
  '00000000-0000-0000-0000-000000000103': {
    email: 'pilot-principal@beacon.test',
    full_name: 'Priya Principal',
    role: 'principal',
  },
  '00000000-0000-0000-0000-000000000104': {
    email: 'pilot-admin@beacon.test',
    full_name: 'Avery Admin',
    role: 'admin',
  },
}

let savedParentFeedback = null

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

function profileRows(url) {
  const id = eqFilter(url, 'id')
  const ids = inFilter(url, 'id')
  const role = eqFilter(url, 'role')
  return Object.entries(actors)
    .filter(([actorId, actor]) => (!id || actorId === id) && (!ids.length || ids.includes(actorId)) && (!role || actor.role === role))
    .map(([actorId, actor]) => ({
      id: actorId,
      school_id: schoolId,
      role: actor.role,
      full_name: actor.full_name,
      email: actor.email,
      phone: null,
      preferences: {},
    }))
}

function parentFeedbackRows(url) {
  const parentId = eqFilter(url, 'parent_id')
  if (parentId) {
    return savedParentFeedback && parentId === '00000000-0000-0000-0000-000000000101'
      ? [savedParentFeedback]
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
  if (table === 'parent_students') {
    return [{ parent_id: '00000000-0000-0000-0000-000000000101', student_id: childId }]
  }
  if (table === 'students') {
    return [
      {
        id: childId,
        school_id: schoolId,
        first_name: 'Sam',
        last_name: 'Student',
        grade_level: '5',
        active: true,
      },
    ]
  }
  if (table === 'pilot_activity_daily') {
    if (select === 'activity_date') {
      return [{ activity_date: new Date(Date.now() - 5 * 86_400_000).toISOString().slice(0, 10) }]
    }
    const actorRole = eqFilter(url, 'actor_role')
    if (actorRole === 'teacher') {
      return [{ user_id: '00000000-0000-0000-0000-000000000102' }]
    }
    if (actorRole === 'parent') {
      return [{ user_id: '00000000-0000-0000-0000-000000000101' }]
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
    savedParentFeedback = {
      rating: row?.rating === 'not_yet' ? 'not_yet' : 'helpful',
      comment: typeof row?.comment === 'string' ? row.comment : null,
    }
    noContent(response)
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
