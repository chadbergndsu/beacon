import { requirePrincipal } from '@/lib/principal'
import { loadBillingState } from '@/lib/billing/store'
import { BillingProductsForm } from '@/components/principal/BillingProductsForm'
import { PageHeader } from '@/components/ui/page-header'

export default async function PrincipalBillingPage() {
  const { schoolId } = await requirePrincipal()
  const state = await loadBillingState(schoolId)

  return (
    <div className="page-stack">
      <PageHeader
        title="Tuition products"
        description="Fee catalog for your school. These map to QuickBooks items when connected."
      />
      <BillingProductsForm products={state.products} />
    </div>
  )
}
