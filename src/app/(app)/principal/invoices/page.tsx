import { requirePrincipal } from '@/lib/principal'
import { loadBillingState } from '@/lib/billing/store'
import { isStripeConfigured } from '@/lib/billing/stripe'
import { InvoicesPanel } from '@/components/principal/InvoicesPanel'
import { PageHeader } from '@/components/ui/page-header'

export default async function PrincipalInvoicesPage() {
  const { schoolId } = await requirePrincipal()
  const state = await loadBillingState(schoolId)

  return (
    <div className="page-stack">
      <PageHeader
        title="Family billing"
        description="Invoices, pay portals, payment plans, recurring tuition, reminders — owned by your school in Beacon (not a third-party biller)."
      />
      <InvoicesPanel
        products={state.products}
        invoices={state.invoices}
        payments={state.payments}
        plans={state.plans}
        schedules={state.schedules}
        qbConnected={state.quickbooks.status === 'connected'}
        stripeConfigured={isStripeConfigured()}
      />
    </div>
  )
}
