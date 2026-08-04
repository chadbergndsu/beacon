/**
 * Apply all SQL migrations in supabase/migrations/ in order.
 * Preferred entrypoint: npm run db:migrate
 *
 *   DATABASE_URL='postgresql://…' node scripts/apply-migrations.mjs
 *   POSTGRES_PASSWORD='…' SUPABASE_PROJECT_REF='your-ref' node scripts/apply-migrations.mjs
 *   node scripts/apply-migrations.mjs 017   # only one file prefix
 *
 * Source of truth: supabase/migrations/ (not scripts/pending-*.sql).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const migrationsDir = path.join(root, 'supabase/migrations')
const projectRef = process.env.SUPABASE_PROJECT_REF?.trim()
const pwd = process.env.POSTGRES_PASSWORD || process.env.SUPABASE_DB_PASSWORD
const connectionString =
  process.env.DATABASE_URL ||
  (pwd && projectRef
    ? `postgresql://postgres:${encodeURIComponent(pwd)}@db.${projectRef}.supabase.co:5432/postgres`
    : null)

if (!connectionString) {
  console.error(
    'Set DATABASE_URL, or both POSTGRES_PASSWORD (or SUPABASE_DB_PASSWORD) and SUPABASE_PROJECT_REF.\n' +
      'No default project ref — prevents applying SQL to the wrong Supabase project.'
  )
  process.exit(1)
}

const only = process.argv[2] // optional e.g. "007"
const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .filter((f) => (only ? f.startsWith(only) : true))
  .sort()

if (!files.length) {
  console.error('No migration files matched.')
  process.exit(1)
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
})

await client.connect()
console.log(`Applying ${files.length} migration(s)…`)

// Track applied files if schema_migrations exists; create if not
await client.query(`
  CREATE TABLE IF NOT EXISTS beacon_schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW()
  );
`)

for (const file of files) {
  const { rows } = await client.query(
    'SELECT 1 FROM beacon_schema_migrations WHERE filename = $1',
    [file]
  )
  if (rows.length) {
    console.log(`  skip (already applied): ${file}`)
    continue
  }
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
  try {
    await client.query('BEGIN')
    await client.query(sql)
    await client.query('INSERT INTO beacon_schema_migrations (filename) VALUES ($1)', [file])
    await client.query('COMMIT')
    console.log(`  applied: ${file}`)
  } catch (e) {
    await client.query('ROLLBACK')
    console.error(`  FAILED: ${file}`)
    console.error(e.message)
    await client.end().catch(() => {})
    process.exit(1)
  }
}

await client.end()
console.log('Done.')
