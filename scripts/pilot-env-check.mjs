#!/usr/bin/env node
/**
 * Soft-pilot env readiness check (no secrets printed).
 *   node scripts/pilot-env-check.mjs
 *   npm run pilot:check
 *
 * Exit 0 = P0 env present; exit 1 = blockers remain.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function loadDotEnv() {
  for (const name of ['.env.local', '.env']) {
    const p = path.join(root, name)
    if (!fs.existsSync(p)) continue
    const text = fs.readFileSync(p, 'utf8')
    for (const line of text.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i < 1) continue
      const key = t.slice(0, i).trim()
      let val = t.slice(i + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (process.env[key] === undefined) process.env[key] = val
    }
  }
}

loadDotEnv()

function present(name) {
  const v = process.env[name]
  return Boolean(v && String(v).trim() && !String(v).includes('your-') && String(v).trim().length > 4)
}

function ok(label) {
  console.log(`  ✓ ${label}`)
}
function bad(label) {
  console.log(`  ✗ ${label}`)
}
function info(label) {
  console.log(`  · ${label}`)
}

console.log('Beacon soft-pilot env check\n')

let blockers = 0

console.log('P0 — required')
const p0 = [
  ['NEXT_PUBLIC_SUPABASE_URL', 'Supabase URL'],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Supabase anon key'],
  ['SUPABASE_SERVICE_ROLE_KEY', 'Service role key'],
]
for (const [key, label] of p0) {
  if (present(key)) ok(label)
  else {
    bad(`${label} (${key})`)
    blockers++
  }
}

const upstash =
  present('UPSTASH_REDIS_REST_URL') && present('UPSTASH_REDIS_REST_TOKEN')
const memoryBreak = process.env.RATE_LIMIT_ALLOW_MEMORY === '1'
if (upstash) ok('Upstash rate limits')
else if (memoryBreak) info('RATE_LIMIT_ALLOW_MEMORY=1 (break-glass — not for public prod)')
else {
  bad('Upstash (UPSTASH_REDIS_REST_URL + TOKEN) or RATE_LIMIT_ALLOW_MEMORY=1')
  blockers++
}

const emailLive = present('RESEND_API_KEY') || present('SMTP_HOST') || present('SMTP_URL')
const from = process.env.EMAIL_FROM || ''
const insecureFrom = /onboarding@resend\.dev/i.test(from)
if (emailLive && present('EMAIL_FROM') && !insecureFrom) ok('Email transport + EMAIL_FROM')
else if (emailLive && insecureFrom) {
  bad('EMAIL_FROM still onboarding@resend.dev — production will force log-only')
  blockers++
} else {
  bad('Live email: RESEND_API_KEY and/or SMTP_* + verified EMAIL_FROM')
  blockers++
}

if (present('NEXT_PUBLIC_APP_URL')) ok('NEXT_PUBLIC_APP_URL')
else {
  bad('NEXT_PUBLIC_APP_URL (absolute links in email)')
  blockers++
}

console.log('\nP1 — recommended before parents')
if (present('BEACON_FEEDBACK_TO') || present('BEACON_OWNER_EMAIL')) {
  ok('Pilot owner email (BEACON_FEEDBACK_TO)')
} else info('Set BEACON_FEEDBACK_TO for Suggestion button alerts')

if (present('BEACON_PRINCIPAL_EMAIL')) ok('BEACON_PRINCIPAL_EMAIL prefill/elevation')
else info('Optional BEACON_PRINCIPAL_EMAIL for Chris')

if (present('BEACON_OFFICE_ADMIN_EMAIL')) ok('BEACON_OFFICE_ADMIN_EMAIL prefill')
else info('Optional BEACON_OFFICE_ADMIN_EMAIL for Marian')

if (present('BEACON_SLACK_WEBHOOK_URL') || present('BEACON_SLACK_BOT_TOKEN')) {
  ok('Slack office channel')
} else info('Optional Slack webhook')

if (present('SENTRY_DSN') || present('NEXT_PUBLIC_SENTRY_DSN')) ok('Sentry')
else info('Optional Sentry DSN')

console.log('\nMoney (N/A unless billing in pilot)')
if (present('STRIPE_SECRET_KEY')) ok('Stripe secret')
else info('Stripe not set — OK if not taking cards')
if (present('INTUIT_CLIENT_ID')) ok('QuickBooks OAuth id')
else info('QuickBooks not set — demo mode OK')

const migrations = fs
  .readdirSync(path.join(root, 'supabase/migrations'))
  .filter((f) => f.endsWith('.sql'))
  .sort()
console.log(`\nRepo migrations on disk: ${migrations[0]} … ${migrations[migrations.length - 1]} (${migrations.length} files)`)
info('Apply with: npm run db:migrate')
info('Accounts SQL: scripts/seed-pilot-accounts.sql (after Auth users exist)')
info('Full runbook: docs/pilot-go-live.md')

console.log('')
if (blockers) {
  console.log(`Result: ${blockers} P0 blocker(s) — fix before soft pilot.`)
  process.exit(1)
}
console.log('Result: P0 env looks present. Continue Go-live UI + accounts + Comms test.')
process.exit(0)
