'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  composeFamilyMessage,
  previewComposeRecipients,
} from '@/app/actions/communications'

type ClassOption = { id: string; name: string }

export function ComposeMessageForm({
  classes,
  canSchoolWide,
}: {
  classes: ClassOption[]
  canSchoolWide: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [audience, setAudience] = useState('parents')
  const [classId, setClassId] = useState(canSchoolWide ? '' : classes[0]?.id || '')
  const [preview, setPreview] = useState<{
    count: number
    sample: string[]
    note?: string
    forKey: string
  } | null>(null)

  const previewKey = `${audience}|${classId}`

  useEffect(() => {
    let cancelled = false
    previewComposeRecipients({
      audience,
      class_id: classId || null,
    }).then((r) => {
      if (cancelled) return
      if (r.ok) {
        setPreview({
          count: r.count ?? 0,
          sample: r.sample ?? [],
          note: r.emailNote,
          forKey: previewKey,
        })
      } else {
        setPreview({ count: 0, sample: [], note: r.error, forKey: previewKey })
      }
    })
    return () => {
      cancelled = true
    }
  }, [audience, classId, previewKey])

  const previewReady = preview?.forKey === previewKey
  const previewing = !previewReady

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        setError(null)
        setOk(null)
        startTransition(async () => {
          const result = await composeFamilyMessage({
            subject: String(fd.get('subject') || ''),
            body: String(fd.get('body') || ''),
            audience: String(fd.get('audience') || 'parents'),
            class_id: String(fd.get('class_id') || '') || null,
          })
          if (!result.ok) {
            setError(result.error)
            return
          }
          const parts = [
            `Queued ${result.emailed ?? 0} message(s)`,
            result.failed ? `${result.failed} failed` : null,
            result.emailNote,
          ].filter(Boolean)
          setOk(parts.join(' · '))
          e.currentTarget.reset()
          setAudience('parents')
          setClassId(canSchoolWide ? '' : classes[0]?.id || '')
        })
      }}
    >
      <div>
        <h3 className="text-lg font-semibold text-navy dark:text-sky-50">
          Compose to families
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          The message schools actually need: pick who gets it, see the recipient count, send once.
          Delivery is logged in the outbox below — no silent failures.
        </p>
      </div>

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
            {canSchoolWide && <option value="all">Everyone (parents + staff)</option>}
          </select>
        </label>

        <label className="block text-sm font-medium">
          Class filter
          <select
            name="class_id"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          >
            {canSchoolWide && <option value="">Whole school</option>}
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        className={
          preview && preview.count > 0
            ? 'rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-2.5 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100'
            : 'rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2.5 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100'
        }
      >
        {previewing ? (
          <span>Counting recipients…</span>
        ) : preview ? (
          <>
            <strong>{preview.count}</strong> recipient{preview.count === 1 ? '' : 's'}
            {preview.sample.length > 0 && (
              <span className="text-muted-foreground">
                {' '}
                · e.g. {preview.sample.slice(0, 3).join(', ')}
                {preview.count > 3 ? '…' : ''}
              </span>
            )}
            {preview.note && <p className="mt-1 text-xs opacity-90">{preview.note}</p>}
          </>
        ) : (
          <span>Could not preview recipients.</span>
        )}
      </div>

      <label className="block text-sm font-medium">
        Subject
        <input
          name="subject"
          required
          maxLength={200}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          placeholder="e.g. Picture day reminder — Friday"
        />
      </label>

      <label className="block text-sm font-medium">
        Message
        <textarea
          name="body"
          required
          rows={6}
          maxLength={20000}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          placeholder="Write what families need to know in plain language…"
        />
      </label>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      {ok && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {ok}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || (preview?.count === 0 && !previewing)}
        className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-sky-700"
      >
        {pending
          ? 'Sending…'
          : preview?.count
            ? `Send to ${preview.count} recipient${preview.count === 1 ? '' : 's'}`
            : 'Send message'}
      </button>
    </form>
  )
}
