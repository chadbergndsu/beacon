/**
 * Apply 007_suite_hardening.sql when DATABASE_URL or POSTGRES_PASSWORD is set.
 *
 *   POSTGRES_PASSWORD='…' node scripts/apply-migration-007.mjs
 *   DATABASE_URL='postgresql://…' node scripts/apply-migration-007.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const sqlPath = path.join(root, 'supabase/migrations/007_suite_hardening.sql')
const projectRef = process.env.SUPABASE_PROJECT_REF || 'lqswgkjotjmltoyfnggj'
const pwd = process.env.POSTGRES_PASSWORD || process.env.SUPABASE_DB_PASSWORD
const connectionString =
  process.env.DATABASE_URL ||
  (pwd
    ? `postgresql://postgres:${encodeURIComponent(pwd)}@db.${projectRef}.supabase.co:5432/postgres`
    : null)

if (!connectionString) {
  console.error(
    'Set DATABASE_URL or POSTGRES_PASSWORD (Supabase → Settings → Database → Database password).'
  )
  console.error('Optional: SUPABASE_PROJECT_REF (default lqswgkjotjmltoyfnggj).')
  process.exit(1)
}

const sql = fs.readFileSync(sqlPath, 'utf8')
const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
})

try {
  await client.connect()
  await client.query(sql)
  console.log('Applied 007_suite_hardening.sql')
} catch (e) {
  console.error('Migration failed:', e.message)
  process.exit(1)
} finally {
  await client.end().catch(() => {})
}
