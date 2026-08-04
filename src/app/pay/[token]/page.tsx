import { notFound } from 'next/navigation'
import { loadInvoiceByPortalToken } from '@/lib/billing/store'
import { formatMoney } from '@/lib/billing/store'
import { loadSchoolBrand } from '@/lib/school-brand'
import { isStripeConfigured } from '@/lib/billing/stripe'
import { FamilyPayClient } from '@/components/billing/FamilyPayClient'

export default async function FamilyPayPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ paid?: string; cancelled?: string }>
}) {
  const { token } = await params
  const sp = await searchParams
  const found = await loadInvoiceByPortalToken(decodeURIComponent(token || ''))
  if (!found) notFound()

  const brand = await loadSchoolBrand(found.schoolId)
  const inv = found.invoice
  const stripeOn = isStripeConfigured()
  const open = inv.status === 'open' || inv.status === 'overdue'

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white text-slate-900">
      <header className="border-b bg-white/90 px-4 py-4">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-sm font-bold text-white">
            {brand.logoLetter}
          </div>
          <div>
            <p className="font-semibold leading-tight">{brand.name}</p>
            <p className="text-xs text-muted-foreground">Family billing portal</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-8 space-y-4">
        {sp.paid === '1' && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
            Payment received — thank you. The office will confirm your receipt shortly.
          </div>
        )}
        {sp.cancelled === '1' && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Checkout cancelled. You can try again when ready.
          </div>
        )}

        <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Invoice</p>
          <h1 className="text-xl font-bold tracking-tight">{inv.description}</h1>
          <p className="text-sm text-muted-foreground">{inv.familyName}</p>
          <p className="text-3xl font-bold tabular-nums">
            {formatMoney(inv.amountCents, inv.currency)}
          </p>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Status</dt>
              <dd className="font-medium capitalize">{inv.status}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Due</dt>
              <dd className="font-medium">{inv.dueDate || '—'}</dd>
            </div>
          </dl>

          {inv.status === 'paid' ? (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              Paid in full. Thank you!
            </p>
          ) : open ? (
            <FamilyPayClient
              token={token}
              stripeEnabled={stripeOn}
              schoolEmail={brand.email}
              schoolPhone={brand.phone}
            />
          ) : (
            <p className="text-sm text-muted-foreground">This invoice is not open for payment.</p>
          )}
        </div>

        <p className="text-center text-[11px] text-muted-foreground leading-relaxed">
          Secure school-owned portal (Beacon) — not a third-party biller marketplace.
          Questions? Contact the school office
          {brand.email ? ` · ${brand.email}` : ''}
          {brand.phone ? ` · ${brand.phone}` : ''}.
        </p>
      </main>
    </div>
  )
}
