'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  composeFamilyMessage,
  previewComposeRecipients,
} from '@/app/actions/communications'
import { Button } from '@/components/ui/button'
import { Field, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

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
        <h3 className="text-lg font-semibold tracking-tight">Compose to families</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick who gets it, see the recipient count, send once. Delivery is logged in the outbox —
          no silent failures.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <Label htmlFor="audience">Audience</Label>
          <Select
            id="audience"
            name="audience"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
          >
            <option value="parents">Parents</option>
            <option value="teachers">Teachers</option>
            <option value="staff">All staff</option>
            {canSchoolWide ? <option value="all">Everyone (parents + staff)</option> : null}
          </Select>
        </Field>

        <Field>
          <Label htmlFor="class_id">Class filter</Label>
          <Select
            id="class_id"
            name="class_id"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          >
            {canSchoolWide ? <option value="">Whole school</option> : null}
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div
        className={
          preview && preview.count > 0
            ? 'rounded-xl border border-success/25 bg-success-soft/60 px-3.5 py-2.5 text-sm text-foreground'
            : 'rounded-xl border border-warning/30 bg-warning-soft/50 px-3.5 py-2.5 text-sm text-foreground'
        }
      >
        {previewing ? (
          <span>Counting recipients…</span>
        ) : preview ? (
          <>
            <strong>{preview.count}</strong> recipient{preview.count === 1 ? '' : 's'}
            {preview.sample.length > 0 ? (
              <span className="text-muted-foreground">
                {' '}
                · e.g. {preview.sample.slice(0, 3).join(', ')}
                {preview.count > 3 ? '…' : ''}
              </span>
            ) : null}
            {preview.note ? <p className="mt-1 text-xs opacity-90">{preview.note}</p> : null}
          </>
        ) : (
          <span>Could not preview recipients.</span>
        )}
      </div>

      <Field>
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          name="subject"
          required
          maxLength={200}
          placeholder="e.g. Picture day reminder — Friday"
        />
      </Field>

      <Field>
        <Label htmlFor="body">Message</Label>
        <Textarea
          id="body"
          name="body"
          required
          rows={6}
          maxLength={20000}
          placeholder="Write what families need to know in plain language…"
        />
      </Field>

      <FieldError>{error}</FieldError>
      {ok ? (
        <p className="rounded-xl border border-success/25 bg-success-soft px-3.5 py-2.5 text-sm text-success">
          {ok}
        </p>
      ) : null}

      <Button type="submit" disabled={pending || (preview?.count === 0 && !previewing)}>
        {pending
          ? 'Sending…'
          : preview?.count
            ? `Send to ${preview.count} recipient${preview.count === 1 ? '' : 's'}`
            : 'Send message'}
      </Button>
    </form>
  )
}
