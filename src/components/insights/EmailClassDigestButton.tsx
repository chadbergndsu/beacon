'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { emailClassDinnerDigests } from '@/app/actions/communications'

export function EmailClassDigestButton({ classId }: { classId: string }) {
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [warn, setWarn] = useState(false)

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (
            !window.confirm(
              'Email Dinner Table Digest to parents of every student in this class?'
            )
          ) {
            return
          }
          setMsg(null)
          setErr(null)
          setWarn(false)
          startTransition(() => {
            void (async () => {
              try {
                const r = await emailClassDinnerDigests(classId)
                if (!r.ok) {
                  setErr(r.error)
                  return
                }
                const note =
                  r.emailNote || `Emailed digests (${r.emailed ?? 0} messages).`
                const logOnly =
                  (r.skipped ?? 0) > 0 && (r.emailed ?? 0) === 0
                setWarn(logOnly)
                setMsg(note)
              } catch (e) {
                setErr(e instanceof Error ? e.message : 'Email failed — try again.')
              }
            })()
          })
        }}
        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-sm font-semibold text-amber-950 shadow-sm hover:bg-amber-50 disabled:opacity-50 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-50 dark:hover:bg-amber-950/60"
      >
        <Mail className="h-4 w-4" aria-hidden />
        {pending ? 'Emailing class…' : 'Email digests to class parents'}
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
