'use client'

import { useState, useTransition } from 'react'
import { sendSystemEmail } from '@/app/actions/announcements'

export function SystemEmailForm() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  return (
    <form
      className="space-y-3 max-w-xl"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        setError(null)
        setOk(null)
        startTransition(async () => {
          const result = await sendSystemEmail({
            to_email: String(fd.get('to_email') || ''),
            to_name: String(fd.get('to_name') || ''),
            subject: String(fd.get('subject') || ''),
            body: String(fd.get('body') || ''),
          })
          if (!result.ok) {
            setError(result.error)
            return
          }
          setOk(
            result.emailNote
              ? `Queued. ${result.emailNote}`
              : 'System email processed (see Email outbox).'
          )
          e.currentTarget.reset()
        })
      }}
    >
      <h3 className="font-semibold">Send system email</h3>
      <label className="block text-sm font-medium">
        To email
        <input name="to_email" type="email" required className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
      </label>
      <label className="block text-sm font-medium">
        To name (optional)
        <input name="to_name" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
      </label>
      <label className="block text-sm font-medium">
        Subject
        <input name="subject" required className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
      </label>
      <label className="block text-sm font-medium">
        Body
        <textarea name="body" required rows={4} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
      </label>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {ok && <p className="text-sm text-emerald-700">{ok}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
      >
        {pending ? 'Sending…' : 'Send system email'}
      </button>
    </form>
  )
}
