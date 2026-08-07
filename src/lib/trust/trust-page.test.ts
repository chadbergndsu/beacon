import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const page = readFileSync(join(process.cwd(), 'src/app/privacy/page.tsx'), 'utf8')
const normalizedPage = page.toLowerCase().replace(/\s+/g, ' ')

describe('Trust & Data Practices page', () => {
  it('answers the core school-diligence questions', () => {
    for (const heading of [
      'Information Beacon can handle',
      'Who can access school data',
      'Public, account and token access',
      'Implemented safeguards',
      'Service providers and optional integrations',
      'School responsibilities',
      'Before production procurement',
    ]) {
      expect(page).toContain(heading)
    }
  })

  it('labels the page as factual documentation rather than a legal promise', () => {
    expect(page).toContain('factual product documentation')
    expect(page).toContain('not a legal')
    expect(page).toContain('not a contractual or complete subprocessor list')
  })

  it('distinguishes account access from limited bearer-token workflows', () => {
    expect(page).toContain('bearer-token links without')
    expect(page).toContain('A valid token limits the view or action')
    expect(page).not.toContain(
      'live student records and the school’s campus twin require authentication'
    )
  })

  it('keeps the production rate-limit requirement explicit', () => {
    expect(page).toContain('Durable rate limiting is required before')
    expect(page).toContain('only for controlled, non-public pilots')
  })

  it('names core and conditional provider categories', () => {
    for (const provider of [
      'Supabase',
      'Vercel',
      'Resend',
      'Stripe',
      'QuickBooks',
      'Twilio',
      'Slack',
      'Upstash',
      'Sentry',
    ]) {
      expect(page).toContain(provider)
    }
  })

  it('does not make unsupported compliance or assurance claims', () => {
    for (const prohibitedClaim of [
      /\bferpa[- ]?(?:compliant|ready|certified)\b/,
      /\bcoppa[- ]?(?:compliant|ready|certified)\b/,
      /\bhipaa[- ]?(?:compliant|ready|certified)\b/,
      /\bsoc\s?2(?:\s+type\s+(?:i|ii))?(?:\s+(?:certified|compliant))?\b/,
      /\b(?:all|every)\s+(?:customer\s+)?data\s+(?:is\s+)?encrypted\b/,
      /\bguaranteed\s+(?:uptime|deletion|breach notification)\b/,
      /\bnever\s+(?:shares|sells)\s+data\b/,
      /\bfully\s+compliant\b/,
    ]) {
      expect(normalizedPage).not.toMatch(prohibitedClaim)
    }
  })
})
