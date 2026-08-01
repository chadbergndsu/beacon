import { requirePrincipal } from '@/lib/principal'
import { loadBillingState } from '@/lib/billing/store'
import { BillingProductsForm } from '@/components/principal/BillingProductsForm'

export default async function PrincipalBillingPage() {
  const { schoolId } = await requirePrincipal()
  const state = await loadBillingState(schoolId)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-navy dark:text-sky-50">Tuition products</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Fee catalog for your school. These map to QuickBooks items when connected.
        </p>
      </div>
      <BillingProductsForm products={state.products} />
    </div>
  )
}
