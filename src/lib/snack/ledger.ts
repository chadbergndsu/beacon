/** Pure LBC Snack Shack ledger math (unit-tested). */

export type SnackEntryType = 'credit' | 'debit'

export function nextBalanceCents(opts: {
  currentCents: number
  entryType: SnackEntryType
  amountCents: number
}): { ok: true; balanceAfter: number } | { ok: false; error: string } {
  const current = Math.max(0, Math.round(opts.currentCents))
  const amount = Math.round(opts.amountCents)
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: 'Amount must be a positive number of cents.' }
  }
  if (opts.entryType === 'credit') {
    return { ok: true, balanceAfter: current + amount }
  }
  if (amount > current) {
    return { ok: false, error: 'Insufficient LBC Snack Shack balance.' }
  }
  return { ok: true, balanceAfter: current - amount }
}

/** Parse snack_topup:{studentId}:{uuid} source keys. */
export function parseSnackTopUpSourceKey(
  sourceKey: string | null | undefined
): { studentId: string; topUpId: string } | null {
  if (!sourceKey) return null
  const m = /^snack_topup:([0-9a-f-]{36}):([0-9a-f-]{36})$/i.exec(sourceKey.trim())
  if (!m) return null
  return { studentId: m[1]!, topUpId: m[2]! }
}

export function snackTopUpSourceKey(studentId: string, topUpId: string): string {
  return `snack_topup:${studentId}:${topUpId}`
}

export function snackTopUpIdempotencyKey(invoiceId: string): string {
  return `topup_invoice:${invoiceId}`
}

export const LBC_LABEL = 'LBC Snack Shack'
export const LBC_PRODUCT_CODE = 'lbc_snack_topup'

/** Preset parent load amounts (cents). */
export const LBC_TOP_UP_PRESETS_CENTS = [500, 1000, 2000, 2500, 5000] as const
