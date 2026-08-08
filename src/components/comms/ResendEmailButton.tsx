'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { resendFailedEmail } from '@/app/actions/communications'

export function ResendEmailButton({ outboxId }: { outboxId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const attemptKey = useRef(crypto.randomUUID())
  const clickLatch = useRef(false)

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (clickLatch.current) return
          clickLatch.current = true
          setErr(null)
          startTransition(async () => {
            try {
              const r = await resendFailedEmail(outboxId, attemptKey.current)
              if (!r.ok) {
                if (r.attemptCompleted) attemptKey.current = crypto.randomUUID()
                setErr(r.error)
                return
              }
              attemptKey.current = crypto.randomUUID()
              router.refresh()
            } catch {
              setErr('Unable to retry this email right now.')
            } finally {
              clickLatch.current = false
            }
          })
        }}
        className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
      >
        {pending ? 'Resending…' : 'Resend'}
      </button>
      {err && <span className="text-[11px] text-red-600">{err}</span>}
    </span>
  )
}
