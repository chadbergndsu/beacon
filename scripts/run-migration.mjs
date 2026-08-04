/**
 * LEGACY — applies ONLY supabase/migrations/001_initial_schema.sql
 *
 * Prefer: npm run db:migrate  (scripts/apply-migrations.mjs)
 *
 *   DATABASE_URL='postgresql://…' node scripts/run-migration.mjs
 *   POSTGRES_PASSWORD='…' SUPABASE_PROJECT_REF='…' node scripts/run-migration.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

console.warn(
  '[deprecated] run-migration.mjs only applies migration 001. Use: npm run db:migrate'
)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const sqlPath = path.join(root, 'supabase/migrations/001_initial_schema.sql')

const projectRef = process.env.SUPABASE_PROJECT_REF?.trim()
const pwd = process.env.POSTGRES_PASSWORD || process.env.SUPABASE_DB_PASSWORD
const connectionString =
  process.env.DATABASE_URL ||
  (pwd && projectRef
    ? `postgresql://postgres:${encodeURIComponent(pwd)}@db.${projectRef}.supabase.co:5432/postgres`
    : null)

if (!connectionString) {
  console.error(
    'Set DATABASE_URL, or both POSTGRES_PASSWORD (or SUPABASE_DB_PASSWORD) and SUPABASE_PROJECT_REF.'
  )
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
  console.log('Migration applied successfully:', path.basename(sqlPath))
  console.warn('Remember: this was only 001. Full stack needs npm run db:migrate.')
} catch (err) {
  console.error('Migration failed:', err.message)
  process.exit(1)
} finally {
  await client.end().catch(() => {})
}
