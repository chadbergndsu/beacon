import { requirePrincipal } from '@/lib/principal'
import { loadBillingState } from '@/lib/billing/store'
import { getQuickBooksConfig } from '@/lib/billing/quickbooks'
import { QuickBooksConnect } from '@/components/principal/QuickBooksConnect'
import { Card, CardContent } from '@/components/ui/card'

export default async function PrincipalPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string; demo?: string }>
}) {
  await requirePrincipal()
  const { schoolId } = await requirePrincipal()
  const state = await loadBillingState(schoolId)
  const cfg = getQuickBooksConfig()
  const params = await searchParams

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-navy dark:text-sky-50">Payments & QuickBooks</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Principal-only payment office. Connect QuickBooks Online so tuition products, family
          invoices, and payments stay in sync with your books.
        </p>
      </div>

      <QuickBooksConnect
        connection={state.quickbooks}
        qbConfigured={cfg.configured}
        flash={{
          connected: params.connected === '1',
          error: params.error,
        }}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            step: '1',
            title: 'Connect QuickBooks',
            body: 'OAuth to Intuit. Sandbox for testing; production when ready.',
          },
          {
            step: '2',
            title: 'Define tuition products',
            body: 'Monthly tuition, registration, activity fees — mapped to QB items.',
          },
          {
            step: '3',
            title: 'Invoice & collect',
            body: 'Create family invoices, record payments, sync to QuickBooks.',
          },
        ].map((s) => (
          <Card key={s.step}>
            <CardContent className="pt-5">
              <p className="text-xs font-bold text-sky-600 uppercase tracking-wider">
                Step {s.step}
              </p>
              <h3 className="font-semibold mt-1 text-navy dark:text-sky-50">{s.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{s.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
