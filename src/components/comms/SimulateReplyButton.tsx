'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { simulateParentReply } from '@/app/actions/communications'
import { Button } from '@/components/ui/button'

export function SimulateReplyButton() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          setMsg(null)
          setErr(null)
          start(async () => {
            const r = await simulateParentReply()
            if (!r.ok) {
              setErr(r.error)
              return
            }
            setMsg(r.emailNote || 'Simulated reply logged.')
            router.refresh()
          })
        }}
      >
        {pending ? 'Simulating…' : 'Simulate parent reply'}
      </Button>
      {msg ? <p className="text-xs text-emerald-700">{msg}</p> : null}
      {err ? <p className="text-xs text-danger">{err}</p> : null}
    </div>
  )
}
