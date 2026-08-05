/**
 * Validate Resend API key + recommended EMAIL_FROM.
 * Usage:
 *   RESEND_API_KEY=re_… node scripts/verify-resend.mjs
 *   # or reads from .env.local / process env
 *
 * Optional: EMAIL_FROM='Beacon <hello@yourdomain.com>'
 * Optional: SEND_TEST_TO=you@example.com  (sends one test if domains ok)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const envLocal = path.join(root, '.env.local')
if (fs.existsSync(envLocal)) {
  for (const line of fs.readFileSync(envLocal, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m || process.env[m[1]]) continue
    let v = m[2]
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    process.env[m[1]] = v
  }
}

const key = process.env.RESEND_API_KEY?.trim()
const from = process.env.EMAIL_FROM?.trim() || ''
const testTo = process.env.SEND_TEST_TO?.trim()

function redactEmail(s) {
  return s.replace(/([^\s@<]{1,2})[^\s@<]*(@[^\s>]+)/g, '$1…$2')
}

if (!key) {
  console.error(`Missing RESEND_API_KEY.

1. https://resend.com/api-keys → Create API Key (Sending access)
2. Put in .env.local:  RESEND_API_KEY=re_…
3. Vercel Production: vercel env add RESEND_API_KEY production
4. Re-run: node scripts/verify-resend.mjs
`)
  process.exit(1)
}

if (!key.startsWith('re_')) {
  console.warn('WARN: Resend keys usually start with re_ — this may still work if Resend changed format.')
}

console.log('Key present:', `len=${key.length} prefix=${key.slice(0, 4)}…`)

const domainsRes = await fetch('https://api.resend.com/domains', {
  headers: { Authorization: `Bearer ${key}` },
})
const domainsBody = await domainsRes.json().catch(() => ({}))
console.log('GET /domains →', domainsRes.status, domainsBody.message || domainsBody.name || 'ok')

if (domainsRes.status === 401 || domainsRes.status === 403 || /invalid/i.test(domainsBody.message || '')) {
  console.error('API key is invalid or revoked. Create a new key at https://resend.com/api-keys')
  process.exit(2)
}

const domains = Array.isArray(domainsBody.data) ? domainsBody.data : []
if (!domains.length) {
  console.log('No domains on this Resend account yet.')
  console.log('Add one: https://resend.com/domains')
  console.log('  Recommended: commoncentsip.com (or a send subdomain)')
  console.log('  Note: commoncentsip.com currently has SPF "v=spf1 -all" which blocks all senders —')
  console.log('  you must update SPF/DKIM per Resend’s DNS instructions before production From works.')
} else {
  console.log('Domains:')
  for (const d of domains) {
    console.log(`  - ${d.name}  status=${d.status}  region=${d.region || '?'}`)
  }
}

const onboarding = /onboarding@resend\.dev/i.test(from) || !from
console.log('EMAIL_FROM:', from ? redactEmail(from) : '(unset → defaults to onboarding@resend.dev)')
if (onboarding) {
  console.log('WARN: Production forces log-only while EMAIL_FROM is onboarding@resend.dev')
  console.log("  Set: EMAIL_FROM='Beacon <hello@your-verified-domain.com>'")
}

if (testTo && domainsRes.ok && !onboarding) {
  console.log('Sending test to', redactEmail(testTo), '…')
  const sendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [testTo],
      subject: 'Beacon Resend test',
      text: 'If you got this, Resend is configured for Beacon.',
    }),
  })
  const sendBody = await sendRes.json().catch(() => ({}))
  console.log('POST /emails →', sendRes.status, sendBody.id || sendBody.message || JSON.stringify(sendBody).slice(0, 120))
  if (!sendRes.ok) process.exit(3)
} else if (testTo && onboarding) {
  console.log('Skipping SEND_TEST_TO because EMAIL_FROM is still onboarding (or unset).')
}

console.log('\nDone. If key is valid: push to Vercel Production and redeploy.')
