'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { createAnnouncement } from '@/app/actions/announcements'
import { previewComposeRecipients } from '@/app/actions/communications'

type ClassOption = { id: string; name: string }

export function AnnouncementForm({ classes }: { classes: ClassOption[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [audience, setAudience] = useState('parents')
  const [classId, setClassId] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [recipientCount, setRecipientCount] = useState<number | null>(null)

  useEffect(() => {
    if (!sendEmail) return
    let cancelled = false
    previewComposeRecipients({ audience, class_id: classId || null }).then((r) => {
      if (cancelled) return
      if (r.ok) setRecipientCount(r.count ?? 0)
      else setRecipientCount(null)
    })
    return () => {
      cancelled = true
    }
  }, [audience, classId, sendEmail])

  return (
    <form
      className="space-y-4 max-w-xl"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        setError(null)
        setNote(null)
        startTransition(async () => {
          const result = await createAnnouncement({
            title: String(fd.get('title') || ''),
            body: String(fd.get('body') || ''),
            audience: String(fd.get('audience') || 'parents'),
            class_id: String(fd.get('class_id') || '') || null,
            send_email: fd.get('send_email') === 'on',
          })
          if (!result.ok) {
            setError(result.error)
            return
          }
          if (result.emailNote) setNote(result.emailNote)
          else if (result.emailed) setNote(`Emailed ${result.emailed} recipient(s).`)
          router.push('/announcements')
          router.refresh()
        })
      }}
    >
      <label className="block text-sm font-medium">
        Title
        <input
          name="title"
          required
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          placeholder="e.g. Early dismissal Friday"
        />
      </label>

      <label className="block text-sm font-medium">
        Message
        <textarea
          name="body"
          required
          rows={6}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          placeholder="Write the announcement parents/staff will see…"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Audience
          <select
            name="audience"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="parents">Parents</option>
            <option value="teachers">Teachers</option>
            <option value="staff">All staff</option>
            <option value="all">Everyone (parents + staff)</option>
          </select>
        </label>

        <label className="block text-sm font-medium">
          Limit to class (optional)
          <select
            name="class_id"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">Whole school</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          name="send_email"
          type="checkbox"
          checked={sendEmail}
          onChange={(e) => setSendEmail(e.target.checked)}
          className="mt-1 h-4 w-4"
        />
        <span>
          <strong>Email recipients</strong>
          <span className="block text-muted-foreground text-xs mt-0.5">
            School-branded mail via Resend when live; always logged in Comms outbox.
            {sendEmail && recipientCount != null && (
              <> · <strong>{recipientCount}</strong> address{recipientCount === 1 ? '' : 'es'} will receive it</>
            )}
          </span>
        </span>
      </label>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}
      {note && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {note}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-sky-600 text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
      >
        {pending
          ? 'Publishing…'
          : sendEmail && recipientCount != null
            ? `Publish & email ${recipientCount}`
            : 'Publish announcement'}
      </button>
    </form>
  )
}
