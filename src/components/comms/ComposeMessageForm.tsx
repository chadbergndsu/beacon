'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  composeFamilyMessage,
  previewComposeRecipients,
} from '@/app/actions/communications'
import { DeskIntentions } from '@/components/comms/DeskIntentions'
import { deskIntentions, type DeskIntention } from '@/lib/comms/desk'
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
  schoolShortName,
}: {
  classes: ClassOption[]
  canSchoolWide: boolean
  schoolShortName: string
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [audience, setAudience] = useState('parents')
  const [classId, setClassId] = useState(canSchoolWide ? '' : classes[0]?.id || '')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [preview, setPreview] = useState<{
    count: number
    sample: string[]
    note?: string
    forKey: string
  } | null>(null)

  const intentions = deskIntentions(schoolShortName)
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

  function applyIntention(item: DeskIntention) {
    setSubject(item.subject)
    setBody(item.body)
    setAudience(item.audience)
    setError(null)
    setOk(null)
    const el = document.getElementById('desk-compose-subject')
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="space-y-5" id="desk-compose">
      <DeskIntentions intentions={intentions} onPick={applyIntention} />

      <form
        className="space-y-4 rounded-2xl border border-border/80 bg-card p-4 sm:p-5"
        onSubmit={(e) => {
          e.preventDefault()
          setError(null)
          setOk(null)
          startTransition(async () => {
            const result = await composeFamilyMessage({
              subject,
              body,
              audience,
              class_id: classId || null,
            })
            if (!result.ok) {
              setError(result.error)
              return
            }
            const parts = [
              `Queued ${result.emailed ?? 0} note(s)`,
              result.failed ? `${result.failed} failed` : null,
              result.emailNote,
            ].filter(Boolean)
            setOk(parts.join(' · '))
            setSubject('')
            setBody('')
            setAudience('parents')
            setClassId(canSchoolWide ? '' : classes[0]?.id || '')
          })
        }}
      >
        <div>
          <h3 className="text-base font-semibold tracking-tight">Write the note</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Families get branded email. You keep the outbox truth — no silent black hole.
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
          <Label htmlFor="desk-compose-subject">Subject</Label>
          <Input
            id="desk-compose-subject"
            name="subject"
            required
            maxLength={200}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Picture day reminder — Friday"
          />
        </Field>

        <Field>
          <Label htmlFor="desk-compose-body">Message</Label>
          <Textarea
            id="desk-compose-body"
            name="body"
            required
            rows={7}
            maxLength={20000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
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
              : 'Send note'}
        </Button>
      </form>
    </div>
  )
}
