import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
// @ts-expect-error The pinned pg runtime is used only by this local integration gate.
import pg from 'pg'

type LocalStatus = { DB_URL: string }
const schoolId = randomUUID()
const attemptKey = randomUUID()
const createPool = (connectionString: string) => new pg.Pool({ connectionString, max: 3 })
let pool: ReturnType<typeof createPool>

function localStatus(): LocalStatus {
  const value = JSON.parse(execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
    cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  })) as LocalStatus
  const host = new URL(value.DB_URL).hostname
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) throw new Error('Refusing non-local database')
  return value
}

describe('email outbox recipient claims in local Supabase Postgres', () => {
  beforeAll(async () => {
    pool = createPool(localStatus().DB_URL)
    await pool.query('insert into public.schools (id, name, slug) values ($1, $2, $3)', [
      schoolId, 'Claim School', `claim-${schoolId}`,
    ])
  })

  afterAll(async () => {
    await pool.query('delete from public.email_outbox where school_id = $1', [schoolId])
    await pool.query('delete from public.schools where id = $1', [schoolId])
    await pool.end()
  })

  it('allows exactly one concurrent claim for recipient addresses differing only by case', async () => {
    const insert = (email: string) => pool.query(
      `insert into public.email_outbox
        (school_id, attempt_key, kind, to_email, subject, body_text, status)
       values ($1, $2, 'message', $3, 'Concurrent claim', 'Private', 'queued')`,
      [schoolId, attemptKey, email]
    )
    const results = await Promise.allSettled([
      insert('Parent@School.test'),
      insert('parent@school.test'),
    ])

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    const rejected = results.find((result) => result.status === 'rejected')
    expect(rejected?.status === 'rejected' ? rejected.reason.code : null).toBe('23505')
    const count = await pool.query(
      'select count(*)::int as count from public.email_outbox where school_id = $1 and attempt_key = $2',
      [schoolId, attemptKey]
    )
    expect(count.rows[0].count).toBe(1)
  })
})
