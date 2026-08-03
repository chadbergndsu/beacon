'use client'

import { useState, useTransition } from 'react'
import { sendTestEmail } from '@/app/actions/communications'

export function TestEmailButton({
  emailLive,
  toHint,
}: {
  emailLive: boolean
  toHint?: string | null
}) {
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMsg(null)
          setErr(null)
          startTransition(async () => {
            const r = await sendTestEmail()
            if (!r.ok) {
              setErr(r.error)
              return
            }
            setMsg(r.emailNote || 'Test processed — check outbox.')
          })
        }}
        className={
          emailLive
            ? 'rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50'
            : 'rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50'
        }
      >
        {pending
          ? 'Sending test…'
          : emailLive
            ? `Send live test${toHint ? ` to ${toHint}` : ''}`
            : 'Send log-only test (prove the pipeline)'}
      </button>
      {msg && <p className="text-sm text-emerald-800 dark:text-emerald-300">{msg}</p>}
      {err && <p className="text-sm text-red-700">{err}</p>}
    </div>
  )
}
