'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { resendFailedEmail } from '@/app/actions/communications'

export function ResendEmailButton({ outboxId }: { outboxId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setErr(null)
          startTransition(async () => {
            const r = await resendFailedEmail(outboxId)
            if (!r.ok) {
              setErr(r.error)
              return
            }
            router.refresh()
          })
        }}
        className="text-xs font-semibold text-sky-700 hover:underline disabled:opacity-50"
      >
        {pending ? 'Resending…' : 'Resend'}
      </button>
      {err && <span className="text-[11px] text-red-600">{err}</span>}
    </span>
  )
}
