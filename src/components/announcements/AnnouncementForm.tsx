'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { createAnnouncement } from '@/app/actions/announcements'
import { previewComposeRecipients } from '@/app/actions/communications'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldHint } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

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
      className="max-w-xl space-y-4"
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
      <Field>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="e.g. Early dismissal Friday"
        />
      </Field>

      <Field>
        <Label htmlFor="body">Message</Label>
        <Textarea
          id="body"
          name="body"
          required
          rows={6}
          placeholder="Write the announcement parents/staff will see…"
        />
      </Field>

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
            <option value="all">Everyone (parents + staff)</option>
          </Select>
        </Field>

        <Field>
          <Label htmlFor="class_id">Limit to class (optional)</Label>
          <Select
            id="class_id"
            name="class_id"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          >
            <option value="">Whole school</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <label className="flex items-start gap-2.5 text-sm">
        <input
          name="send_email"
          type="checkbox"
          checked={sendEmail}
          onChange={(e) => setSendEmail(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-ring"
        />
        <span>
          <strong className="font-semibold">Email recipients</strong>
          <FieldHint className="mt-0.5">
            School-branded mail via Resend when live; always logged in Comms outbox.
            {sendEmail && recipientCount != null ? (
              <>
                {' '}
                · <strong className="text-foreground">{recipientCount}</strong> address
                {recipientCount === 1 ? '' : 'es'} will receive it
              </>
            ) : null}
          </FieldHint>
        </span>
      </label>

      <FieldError>{error}</FieldError>
      {note ? (
        <p className="rounded-xl border border-amber-200 bg-warning-soft px-3.5 py-2.5 text-sm text-warning">
          {note}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending
          ? 'Publishing…'
          : sendEmail && recipientCount != null
            ? `Publish & email ${recipientCount}`
            : 'Publish announcement'}
      </Button>
    </form>
  )
}
