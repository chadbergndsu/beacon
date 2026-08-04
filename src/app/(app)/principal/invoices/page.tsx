import { requirePrincipal } from '@/lib/principal'
import { loadBillingState } from '@/lib/billing/store'
import { InvoicesPanel } from '@/components/principal/InvoicesPanel'

export default async function PrincipalInvoicesPage() {
  const { schoolId } = await requirePrincipal()
  const state = await loadBillingState(schoolId)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-navy dark:text-sky-50">Invoices & payments</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Create family invoices and record payments. Stored in Beacon (QuickBooks live post not enabled yet).
        </p>
      </div>
      <InvoicesPanel
        products={state.products}
        invoices={state.invoices}
        payments={state.payments}
        qbConnected={state.quickbooks.status === 'connected'}
      />
    </div>
  )
}
