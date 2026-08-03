'use client'

import { useState, useTransition } from 'react'
import { Mail } from 'lucide-react'
import { emailStudentDinnerDigest } from '@/app/actions/communications'

export function EmailDigestButton({ studentId }: { studentId: string }) {
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMsg(null)
          setErr(null)
          startTransition(async () => {
            const r = await emailStudentDinnerDigest(studentId)
            if (!r.ok) {
              setErr(r.error)
              return
            }
            setMsg(
              r.emailNote ||
                `Emailed Dinner Table Digest to ${r.emailed ?? 0} parent(s).`
            )
          })
        }}
        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-sm font-semibold text-amber-950 shadow-sm hover:bg-amber-50 disabled:opacity-50 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-50 dark:hover:bg-amber-950/60"
      >
        <Mail className="h-4 w-4" aria-hidden />
        {pending ? 'Emailing…' : 'Email digest to parents'}
      </button>
      {msg && <p className="text-xs text-emerald-700 dark:text-emerald-400">{msg}</p>}
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  )
}
