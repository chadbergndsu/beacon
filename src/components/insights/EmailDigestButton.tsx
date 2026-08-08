'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { emailStudentDinnerDigest } from '@/app/actions/communications'

export function EmailDigestButton({
  studentId,
  variant = 'header',
}: {
  studentId: string
  /** header = compact in PageHeader; card = full-width on Dinner Table card */
  variant?: 'header' | 'card'
}) {
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [warn, setWarn] = useState(false)

  function run() {
    setMsg(null)
    setErr(null)
    setWarn(false)
    startTransition(() => {
      void (async () => {
        try {
          const r = await emailStudentDinnerDigest(studentId)
          if (!r.ok) {
            setErr(r.error)
            return
          }
          const note =
            r.emailNote ||
            `Emailed Dinner Table Digest to ${r.emailed ?? 0} parent(s).`
          const logOnly =
            (r.skipped ?? 0) > 0 && (r.emailed ?? 0) === 0
          setWarn(logOnly)
          setMsg(note)
        } catch (e) {
          setErr(e instanceof Error ? e.message : 'Email failed — try again.')
        }
      })()
    })
  }

  const btnClass =
    variant === 'card'
      ? 'inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-950 shadow-sm hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-50 dark:hover:bg-amber-950/70 sm:w-auto'
      : 'inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-sm font-semibold text-amber-950 shadow-sm hover:bg-amber-50 disabled:opacity-50 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-50 dark:hover:bg-amber-950/60'

  return (
    <div className={variant === 'card' ? 'space-y-2' : 'space-y-1'}>
      <button type="button" disabled={pending} onClick={run} className={btnClass}>
        <Mail className="h-4 w-4" aria-hidden />
        {pending ? 'Emailing…' : 'Email digest to parents'}
      </button>
      {msg && (
        <p
          className={
            warn
              ? 'text-xs text-amber-800 dark:text-amber-200'
              : 'text-xs text-emerald-700 dark:text-emerald-400'
          }
        >
          {msg}{' '}
          {warn ? (
            <Link href="/admin/emails" className="font-semibold underline underline-offset-2">
              Open Email outbox
            </Link>
          ) : null}
        </p>
      )}
      {err && <p className="text-xs text-red-600 dark:text-red-400">{err}</p>}
    </div>
  )
}
