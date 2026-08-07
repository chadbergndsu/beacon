import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync('src/app/about/page.tsx', 'utf8')

describe('Beacon vendor page claims', () => {
  it('states the bounded offer and routes buyers to public trust information', () => {
    expect(source).toContain('Current stage · design-partner program')
    expect(source).toContain('Participation and scope are assessed school by school')
    expect(source).toContain('href={trustHref}')
    expect(source).toContain('isDesignPartnerInquiryReady')
  })

  it.each([
    /ferpa[ -]?compliant/i,
    /coppa[ -]?compliant/i,
    /soc\s*2/i,
    /guaranteed uptime/i,
    /replaces facts/i,
    /better than blackbaud/i,
    /parents love/i,
    /saves? hours/i,
    /for any school/i,
  ])('does not publish an unsupported commercial or trust claim: %s', (claim) => {
    expect(source).not.toMatch(claim)
  })
})
