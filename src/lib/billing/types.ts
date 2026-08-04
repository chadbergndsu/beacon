export type QbConnectionStatus =
  | 'disconnected'
  | 'pending'
  | 'connected'
  | 'demo'
  | 'error'
export type QbEnvironment = 'sandbox' | 'production'

export type BillingFrequency = 'one_time' | 'monthly' | 'term' | 'annual'
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'overdue' | 'syncing'
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded' | 'syncing'
export type PaymentMethod = 'card' | 'ach' | 'check' | 'cash' | 'other' | 'quickbooks'

export type QuickBooksConnection = {
  status: QbConnectionStatus
  environment: QbEnvironment
  realmId: string | null
  companyName: string | null
  connectedAt: string | null
  lastSyncAt: string | null
  lastError: string | null
  syncCustomers: boolean
  syncInvoices: boolean
  syncPayments: boolean
  connectedByName?: string | null
}

export type BillingProduct = {
  id: string
  name: string
  description: string
  amountCents: number
  currency: string
  frequency: BillingFrequency
  active: boolean
  qbItemId?: string | null
}

export type BillingInvoice = {
  id: string
  studentId?: string | null
  familyName: string
  parentEmail: string
  productId?: string | null
  description: string
  amountCents: number
  currency: string
  status: InvoiceStatus
  dueDate: string | null
  qbInvoiceId?: string | null
  createdAt: string
}

export type BillingPayment = {
  id: string
  invoiceId: string | null
  amountCents: number
  currency: string
  method: PaymentMethod
  status: PaymentStatus
  paidAt: string | null
  qbPaymentId?: string | null
  notes?: string | null
  createdAt: string
}

export type SchoolBillingState = {
  quickbooks: QuickBooksConnection
  products: BillingProduct[]
  invoices: BillingInvoice[]
  payments: BillingPayment[]
}

export const defaultBillingState = (): SchoolBillingState => ({
  quickbooks: {
    status: 'disconnected',
    environment: 'sandbox',
    realmId: null,
    companyName: null,
    connectedAt: null,
    lastSyncAt: null,
    lastError: null,
    syncCustomers: true,
    syncInvoices: true,
    syncPayments: true,
  },
  products: [],
  invoices: [],
  payments: [],
})
