'use client'

import { useState, useTransition } from 'react'
import { sendTestSlack } from '@/app/actions/communications'

export function TestSlackButton({
  slackConfigured,
  modeHint,
}: {
  slackConfigured: boolean
  modeHint?: string | null
}) {
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending || !slackConfigured}
        onClick={() => {
          setMsg(null)
          setErr(null)
          startTransition(async () => {
            const r = await sendTestSlack()
            if (!r.ok) {
              setErr(r.error)
              return
            }
            setMsg(r.emailNote || 'Posted to Slack.')
          })
        }}
        className={
          slackConfigured
            ? 'rounded-lg bg-[#4A154B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3b113c] disabled:opacity-50'
            : 'rounded-lg bg-slate-400 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60'
        }
      >
        {pending
          ? 'Posting to Slack…'
          : slackConfigured
            ? `Send Slack test${modeHint ? ` (${modeHint})` : ''}`
            : 'Slack not configured'}
      </button>
      {msg && <p className="text-sm text-emerald-800 dark:text-emerald-300">{msg}</p>}
      {err && <p className="text-sm text-red-700">{err}</p>}
    </div>
  )
}
