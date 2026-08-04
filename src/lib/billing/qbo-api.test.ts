import { describe, expect, it, vi } from 'vitest'
import {
  buildPaymentBody,
  buildSalesInvoiceBody,
  createQboInvoice,
  findOrCreateCustomer,
  qboApiBase,
  refreshQuickBooksTokens,
} from './qbo-api'

describe('qbo-api', () => {
  it('api base by environment', () => {
    expect(qboApiBase('sandbox')).toContain('sandbox-quickbooks')
    expect(qboApiBase('production')).toBe('https://quickbooks.api.intuit.com')
  })

  it('buildSalesInvoiceBody amounts in dollars', () => {
    const body = buildSalesInvoiceBody({
      customerId: '58',
      description: 'K–5 Tuition',
      amountDollars: 450,
      dueDate: '2026-09-01',
    })
    expect(body.CustomerRef.value).toBe('58')
    expect(body.Line[0].Amount).toBe(450)
    expect(body.Line[0].SalesItemLineDetail.UnitPrice).toBe(450)
    expect(body.DueDate).toBe('2026-09-01')
  })

  it('buildPaymentBody links invoice', () => {
    const body = buildPaymentBody({
      customerId: '58',
      amountDollars: 100.5,
      qbInvoiceId: '130',
    })
    expect(body.TotalAmt).toBe(100.5)
    expect(body.Line[0].LinkedTxn[0]).toEqual({ TxnId: '130', TxnType: 'Invoice' })
  })

  it('refreshQuickBooksTokens parses bearer response', async () => {
    process.env.INTUIT_CLIENT_ID = 'id'
    process.env.INTUIT_CLIENT_SECRET = 'secret'
    const fetchImpl = vi.fn(async () =>
      Response.json({
        access_token: 'a1',
        refresh_token: 'r1',
        expires_in: 3600,
      })
    ) as unknown as typeof fetch
    const t = await refreshQuickBooksTokens('old-r', fetchImpl)
    expect(t.accessToken).toBe('a1')
    expect(t.refreshToken).toBe('r1')
    expect(fetchImpl).toHaveBeenCalled()
  })

  it('findOrCreateCustomer returns existing', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).includes('/query')) {
        return Response.json({
          QueryResponse: { Customer: [{ Id: '99' }] },
        })
      }
      return Response.json({})
    }) as unknown as typeof fetch
    const r = await findOrCreateCustomer(
      {
        accessToken: 't',
        realmId: 'realm',
        environment: 'sandbox',
        fetchImpl,
      },
      { displayName: 'Lee family', email: 'a@b.com' }
    )
    expect(r).toEqual({ id: '99', created: false })
  })

  it('createQboInvoice returns Id', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ Invoice: { Id: 'inv-7' } })
    ) as unknown as typeof fetch
    const r = await createQboInvoice(
      {
        accessToken: 't',
        realmId: 'realm',
        environment: 'sandbox',
        fetchImpl,
      },
      {
        customerId: '1',
        description: 'Tuition',
        amountCents: 45000,
        dueDate: null,
      }
    )
    expect(r.id).toBe('inv-7')
  })
})
