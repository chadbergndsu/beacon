import { describe, expect, it } from 'vitest'
import {
  nextBalanceCents,
  parseSnackTopUpSourceKey,
  snackTopUpSourceKey,
} from './ledger'

describe('LBC snack ledger math', () => {
  it('credits increase balance', () => {
    expect(nextBalanceCents({ currentCents: 1000, entryType: 'credit', amountCents: 500 })).toEqual({
      ok: true,
      balanceAfter: 1500,
    })
  })

  it('debits decrease balance', () => {
    expect(nextBalanceCents({ currentCents: 1000, entryType: 'debit', amountCents: 350 })).toEqual({
      ok: true,
      balanceAfter: 650,
    })
  })

  it('refuses overdraft', () => {
    const r = nextBalanceCents({ currentCents: 200, entryType: 'debit', amountCents: 201 })
    expect(r.ok).toBe(false)
  })

  it('rejects non-positive amounts', () => {
    expect(nextBalanceCents({ currentCents: 100, entryType: 'credit', amountCents: 0 }).ok).toBe(
      false
    )
  })

  it('parses top-up source keys', () => {
    const studentId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    const topUpId = '11111111-2222-3333-4444-555555555555'
    const key = snackTopUpSourceKey(studentId, topUpId)
    expect(parseSnackTopUpSourceKey(key)).toEqual({ studentId, topUpId })
    expect(parseSnackTopUpSourceKey('aftercare:xyz')).toBeNull()
  })
})
