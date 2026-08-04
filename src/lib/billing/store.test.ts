import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockAdmin } from '@/lib/test/mock-supabase'

const mockAdmin = vi.hoisted(() => ({
  current: null as ReturnType<typeof createMockAdmin> | null,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => {
    if (!mockAdmin.current) throw new Error('mock admin not set')
    return mockAdmin.current
  },
}))

import {
  addInvoice,
  addPayment,
  aftercareInvoiceSourceKey,
  ensureProductByCode,
  formatMoney,
  loadBillingState,
  updateQuickBooks,
  upsertProduct,
} from './store'

const SCHOOL = '11111111-1111-4111-8111-111111111111'
const PROD = '22222222-2222-4222-8222-222222222222'
const INV = '33333333-3333-4333-8333-333333333333'
const PAY = '44444444-4444-4444-8444-444444444444'

type Row = Record<string, unknown>

function makeBillingDb(seed?: {
  products?: Row[]
  invoices?: Row[]
  payments?: Row[]
  qb?: Row | null
}) {
  const products = [...(seed?.products || [])]
  const invoices = [...(seed?.invoices || [])]
  const payments = [...(seed?.payments || [])]
  let qb: Row | null = seed?.qb ?? null

  return createMockAdmin({
    quickbooks_connections: ({ op, filters, payload }) => {
      if (op === 'select') {
        if (filters.school_id === SCHOOL) return { data: qb, error: null }
        return { data: null, error: null }
      }
      if (op === 'upsert') {
        const p = (Array.isArray(payload) ? payload[0] : payload) as Row
        qb = { ...(qb || {}), ...p, school_id: SCHOOL }
        return { data: qb, error: null }
      }
      return { data: null, error: null }
    },
    billing_products: ({ op, filters, payload }) => {
      if (op === 'select') {
        let rows = products.filter((r) => r.school_id === filters.school_id)
        if (filters.code != null) rows = rows.filter((r) => r.code === filters.code)
        if (filters.id != null) rows = rows.filter((r) => r.id === filters.id)
        if (filters.code != null || filters.id != null) {
          return { data: rows[0] || null, error: null }
        }
        return { data: rows, error: null }
      }
      if (op === 'insert') {
        const rows = (Array.isArray(payload) ? payload : [payload]) as Row[]
        for (const r of rows) products.push({ ...r })
        return { data: rows, error: null }
      }
      if (op === 'upsert') {
        const r = (Array.isArray(payload) ? payload[0] : payload) as Row
        const idx = products.findIndex((p) => p.id === r.id)
        if (idx >= 0) products[idx] = { ...products[idx], ...r }
        else products.push({ ...r })
        return { data: r, error: null }
      }
      return { data: null, error: null }
    },
    billing_invoices: ({ op, filters, payload }) => {
      if (op === 'select') {
        let rows = invoices.filter((r) => r.school_id === filters.school_id)
        if (filters.source_key != null) {
          rows = rows.filter((r) => r.source_key === filters.source_key)
          return { data: rows[0] || null, error: null }
        }
        if (filters.id != null) {
          rows = rows.filter((r) => r.id === filters.id)
          return { data: rows[0] || null, error: null }
        }
        return { data: rows, error: null }
      }
      if (op === 'insert') {
        const r = (Array.isArray(payload) ? payload[0] : payload) as Row
        if (
          r.source_key &&
          invoices.some(
            (i) => i.school_id === r.school_id && i.source_key === r.source_key
          )
        ) {
          return { data: null, error: { code: '23505', message: 'duplicate key' } }
        }
        invoices.push({ ...r })
        return { data: r, error: null }
      }
      if (op === 'update') {
        const patch = payload as Row
        const idx = invoices.findIndex((r) => {
          if (filters.id != null && r.id !== filters.id) return false
          if (filters.school_id != null && r.school_id !== filters.school_id) return false
          if (filters['neq:status'] != null && r.status === filters['neq:status']) return false
          return true
        })
        if (idx < 0) return { data: null, error: null }
        invoices[idx] = { ...invoices[idx], ...patch }
        return { data: invoices[idx], error: null }
      }
      return { data: null, error: null }
    },
    billing_payments: ({ op, filters, payload }) => {
      if (op === 'select') {
        let rows = payments.filter((r) => r.school_id === filters.school_id)
        if (filters.id != null) {
          rows = rows.filter((r) => r.id === filters.id)
          return { data: rows[0] || null, error: null }
        }
        return { data: rows, error: null }
      }
      if (op === 'insert') {
        const r = (Array.isArray(payload) ? payload[0] : payload) as Row
        payments.push({ ...r })
        return { data: r, error: null }
      }
      return { data: null, error: null }
    },
    billing_payment_plans: () => ({ data: [], error: null }),
    billing_schedules: () => ({ data: [], error: null }),
  })
}

describe('billing store (first-class tables)', () => {
  beforeEach(() => {
    mockAdmin.current = null
  })

  it('formatMoney and aftercare source key helpers', () => {
    expect(formatMoney(45000)).toMatch(/450/)
    expect(aftercareInvoiceSourceKey('sess-1')).toBe('aftercare_session:sess-1')
  })

  it('loadBillingState seeds demo products when catalog empty', async () => {
    mockAdmin.current = makeBillingDb({ products: [] })
    const state = await loadBillingState(SCHOOL)
    expect(state.products.length).toBeGreaterThanOrEqual(3)
    expect(state.products.some((p) => p.code === 'tuition_k5')).toBe(true)
    expect(state.quickbooks.status).toBe('disconnected')
  })

  it('loadBillingState maps existing rows', async () => {
    mockAdmin.current = makeBillingDb({
      products: [
        {
          id: PROD,
          school_id: SCHOOL,
          name: 'Tuition',
          description: 'M',
          amount_cents: 1000,
          currency: 'USD',
          frequency: 'monthly',
          active: true,
          code: 'tuition_k5',
        },
      ],
      invoices: [
        {
          id: INV,
          school_id: SCHOOL,
          family_name: 'Smith',
          parent_email: 'a@b.com',
          description: 'Tuition',
          amount_cents: 1000,
          currency: 'USD',
          status: 'open',
          due_date: '2026-09-01',
          created_at: '2026-08-01T00:00:00Z',
          source_key: null,
          product_id: PROD,
          student_id: null,
        },
      ],
      payments: [],
      qb: {
        school_id: SCHOOL,
        status: 'demo',
        environment: 'sandbox',
        realm_id: 'r1',
        company_name: 'Demo Co',
        connected_at: '2026-08-01T00:00:00Z',
        last_sync_at: null,
        last_error: null,
        sync_customers: true,
        sync_invoices: true,
        sync_payments: true,
      },
    })
    const state = await loadBillingState(SCHOOL)
    expect(state.products).toHaveLength(1)
    expect(state.products[0].amountCents).toBe(1000)
    expect(state.invoices).toHaveLength(1)
    expect(state.invoices[0].familyName).toBe('Smith')
    expect(state.quickbooks.status).toBe('demo')
    expect(state.quickbooks.companyName).toBe('Demo Co')
  })

  it('addInvoice is idempotent by source_key', async () => {
    mockAdmin.current = makeBillingDb({
      products: [
        {
          id: PROD,
          school_id: SCHOOL,
          name: 'Aftercare',
          description: '',
          amount_cents: 800,
          currency: 'USD',
          frequency: 'one_time',
          active: true,
          code: 'aftercare',
        },
      ],
    })
    const key = aftercareInvoiceSourceKey('session-abc')
    const inv = {
      id: INV,
      familyName: 'Lee',
      parentEmail: 'lee@example.com',
      productId: PROD,
      description: 'Aftercare',
      amountCents: 1600,
      currency: 'USD' as const,
      status: 'open' as const,
      dueDate: '2026-08-10',
      sourceKey: key,
      createdAt: new Date().toISOString(),
    }
    await addInvoice(SCHOOL, inv)
    await addInvoice(SCHOOL, { ...inv, id: crypto.randomUUID(), amountCents: 9999 })
    const state = await loadBillingState(SCHOOL)
    expect(state.invoices.filter((i) => i.sourceKey === key)).toHaveLength(1)
    expect(state.invoices[0].amountCents).toBe(1600)
  })

  it('addPayment CAS-marks invoice paid and blocks double pay', async () => {
    mockAdmin.current = makeBillingDb({
      products: [
        {
          id: PROD,
          school_id: SCHOOL,
          name: 'Tuition',
          description: '',
          amount_cents: 100,
          currency: 'USD',
          frequency: 'monthly',
          active: true,
          code: 't',
        },
      ],
      invoices: [
        {
          id: INV,
          school_id: SCHOOL,
          family_name: 'A',
          parent_email: 'a@b.c',
          description: 'T',
          amount_cents: 100,
          currency: 'USD',
          status: 'open',
          due_date: null,
          created_at: '2026-08-01T00:00:00Z',
        },
      ],
    })

    await addPayment(SCHOOL, {
      id: PAY,
      invoiceId: INV,
      amountCents: 100,
      currency: 'USD',
      method: 'cash',
      status: 'succeeded',
      paidAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    })

    let state = await loadBillingState(SCHOOL)
    expect(state.invoices[0].status).toBe('paid')
    expect(state.payments).toHaveLength(1)

    await addPayment(SCHOOL, {
      id: crypto.randomUUID(),
      invoiceId: INV,
      amountCents: 100,
      currency: 'USD',
      method: 'cash',
      status: 'succeeded',
      paidAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    })

    state = await loadBillingState(SCHOOL)
    expect(state.payments).toHaveLength(1)
  })

  it('ensureProductByCode creates once then reuses', async () => {
    mockAdmin.current = makeBillingDb({ products: [] })
    // seed on load first
    await loadBillingState(SCHOOL)
    const p1 = await ensureProductByCode(SCHOOL, 'aftercare', {
      name: 'After school care',
      description: 'Hourly',
      amountCents: 800,
      currency: 'USD',
      frequency: 'one_time',
      active: true,
    })
    const p2 = await ensureProductByCode(SCHOOL, 'aftercare', {
      name: 'Other name',
      description: 'x',
      amountCents: 1,
      currency: 'USD',
      frequency: 'one_time',
      active: true,
    })
    expect(p1.id).toBe(p2.id)
    expect(p1.code).toBe('aftercare')
  })

  it('upsertProduct and updateQuickBooks write tables', async () => {
    mockAdmin.current = makeBillingDb({ products: [] })
    await upsertProduct(SCHOOL, {
      id: PROD,
      name: 'Camp',
      description: 'Summer',
      amountCents: 5000,
      currency: 'USD',
      frequency: 'one_time',
      active: true,
      code: 'camp',
    })
    await updateQuickBooks(SCHOOL, {
      status: 'connected',
      realmId: 'realm-9',
      companyName: 'Live Co',
      connectedAt: new Date().toISOString(),
      accessToken: 'tok',
      refreshToken: 'ref',
    })
    const state = await loadBillingState(SCHOOL)
    expect(state.products.some((p) => p.code === 'camp' && p.amountCents === 5000)).toBe(true)
    expect(state.quickbooks.status).toBe('connected')
    expect(state.quickbooks.realmId).toBe('realm-9')
  })
})
