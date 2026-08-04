'use client'

import { useState, useTransition } from 'react'
import { startFamilyPortalCheckout } from '@/app/actions/family-portal'
import { Button } from '@/components/ui/button'

export function FamilyPayClient({
  token,
  stripeEnabled,
  schoolEmail,
  schoolPhone,
}: {
  token: string
  stripeEnabled: boolean
  schoolEmail: string | null
  schoolPhone: string | null
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="space-y-3 pt-2">
      {stripeEnabled ? (
        <>
          <Button
            className="w-full"
            size="lg"
            disabled={pending}
            onClick={() => {
              setError(null)
              start(async () => {
                const r = await startFamilyPortalCheckout(token)
                if (!r.ok) {
                  setError(r.error)
                  return
                }
                window.location.href = r.url
              })
            }}
          >
            {pending ? 'Opening Stripe…' : 'Pay securely with card (Stripe)'}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            You will complete payment on Stripe&apos;s secure checkout page.
          </p>
        </>
      ) : (
        <div className="rounded-xl border border-dashed bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
          Online card pay is not enabled yet (school needs Stripe keys). Please pay the office
          directly
          {schoolEmail ? ` (${schoolEmail})` : ''}
          {schoolPhone ? ` · ${schoolPhone}` : ''}.
        </div>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
      <p className="text-[11px] text-muted-foreground">
        You can also pay by check, cash, or ACH at the school office. Office receipts are recorded
        in Beacon and can sync to QuickBooks.
      </p>
    </div>
  )
}
