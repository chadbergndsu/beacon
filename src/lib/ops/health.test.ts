import { describe, expect, it } from 'vitest'
import { scoreHealthChecks, type HealthCheck } from './health'

const check = (
  id: string,
  status: HealthCheck['status'],
  optional = false
): HealthCheck => ({
  id,
  status,
  label: id,
  detail: id,
  category: 'platform',
  optional,
})

describe('scoreHealthChecks', () => {
  it('does not lower platform health for informational optional modules', () => {
    expect(scoreHealthChecks([check('database', 'ok')])).toBe(100)
    expect(
      scoreHealthChecks([check('database', 'ok'), check('craft_twin', 'info')])
    ).toBe(100)
  })

  it('does not inflate platform health when an optional module is healthy', () => {
    const requiredOnly = [check('database', 'warn')]

    expect(scoreHealthChecks(requiredOnly)).toBe(50)
    expect(scoreHealthChecks([...requiredOnly, check('craft_twin', 'ok', true)])).toBe(50)
  })

  it('scores warnings and failures in enabled optional workflows', () => {
    const requiredOnly = [check('database', 'ok')]

    expect(scoreHealthChecks([...requiredOnly, check('stripe', 'warn', true)])).toBe(75)
    expect(scoreHealthChecks([...requiredOnly, check('stripe', 'fail', true)])).toBe(50)
  })

  it('still scores required warnings and failures', () => {
    expect(
      scoreHealthChecks([
        check('database', 'ok'),
        check('rate_limits', 'warn'),
        check('auth', 'fail'),
      ])
    ).toBe(50)
  })
})
