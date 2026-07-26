/**
 * Apply supabase/migrations/001_initial_schema.sql to the remote DB.
 *
 * Usage:
 *   POSTGRES_PASSWORD='your-db-password' node scripts/run-migration.mjs
 *   # or
 *   DATABASE_URL='postgresql://postgres:...@db.xxx.supabase.co:5432/postgres' node scripts/run-migration.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const sqlPath = path.join(root, 'supabase/migrations/001_initial_schema.sql')

const projectRef = 'lqswgkjotjmltoyfnggj'
const pwd = process.env.POSTGRES_PASSWORD || process.env.SUPABASE_DB_PASSWORD
const connectionString =
  process.env.DATABASE_URL ||
  (pwd
    ? `postgresql://postgres:${encodeURIComponent(pwd)}@db.${projectRef}.supabase.co:5432/postgres`
    : null)

if (!connectionString) {
  console.error(
    'Set POSTGRES_PASSWORD (database password from project create) or DATABASE_URL.'
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
} catch (err) {
  console.error('Migration failed:', err.message)
  process.exit(1)
} finally {
  await client.end().catch(() => {})
}
