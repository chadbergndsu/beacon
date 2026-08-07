import { requirePrincipal } from '@/lib/principal'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadBillingState } from '@/lib/billing/store'
import { listSnackAccountsForSchool } from '@/lib/snack/store'
import { BillingProductsForm } from '@/components/principal/BillingProductsForm'
import { LbcSnackStaffPanel } from '@/components/billing/LbcSnackStaffPanel'
import { PageHeader } from '@/components/ui/page-header'

export default async function PrincipalBillingPage() {
  const { schoolId } = await requirePrincipal()
  const state = await loadBillingState(schoolId)
  const lbcAccounts = await listSnackAccountsForSchool(schoolId)

  const admin = createAdminClient()
  const { data: students } = await admin
    .from('students')
    .select('id, first_name, last_name')
    .eq('school_id', schoolId)
    .eq('active', true)
    .order('last_name')
    .limit(400)

  const studentOptions = (students ?? []).map((s) => ({
    id: String(s.id),
    name: `${s.first_name} ${s.last_name}`.trim(),
  }))

  return (
    <div className="page-stack">
      <PageHeader
        title="Tuition & LBC"
        description="Fee catalog for QuickBooks, plus the LBC Snack Shack register — parents load funds; office charges purchases."
      />
      <LbcSnackStaffPanel accounts={lbcAccounts} students={studentOptions} />
      <BillingProductsForm products={state.products} />
    </div>
  )
}
