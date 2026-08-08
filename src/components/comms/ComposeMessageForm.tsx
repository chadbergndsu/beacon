'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
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

type PreviewState = {
  count: number
  sample: string[]
  note?: string
  error?: string
  forKey: string
}

export function ComposeMessageForm({
  classes,
  canSchoolWide,
  onDirtyChange,
}: {
  classes: ClassOption[]
  canSchoolWide: boolean
  onDirtyChange?: (dirty: boolean) => void
}) {
  const latestPreviewRequest = useRef(0)
  const mounted = useRef(true)
  const submitting = useRef(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [audience, setAudience] = useState('parents')
  const [classId, setClassId] = useState(canSchoolWide ? '' : classes[0]?.id || '')
  const [alsoSlack, setAlsoSlack] = useState(false)
  const [preview, setPreview] = useState<PreviewState | null>(null)

  const previewKey = `${audience}|${classId}`

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      latestPreviewRequest.current += 1
    }
  }, [])

  useEffect(() => {
    const request = ++latestPreviewRequest.current
    void previewComposeRecipients({
      audience,
      class_id: classId || null,
    })
      .then((result) => {
        if (!mounted.current || request !== latestPreviewRequest.current) return
        if (result.ok) {
          setPreview({
            count: result.count ?? 0,
            sample: result.sample ?? [],
            note: result.emailNote,
            forKey: previewKey,
          })
          return
        }
        setPreview({
          count: 0,
          sample: [],
          error: result.error,
          forKey: previewKey,
        })
      })
      .catch(() => {
        if (!mounted.current || request !== latestPreviewRequest.current) return
        setPreview({
          count: 0,
          sample: [],
          error: 'Unable to preview recipients right now.',
          forKey: previewKey,
        })
      })
  }, [audience, classId, previewKey])

  const currentPreview = preview?.forKey === previewKey ? preview : null
  const previewing = !currentPreview
  const previewValid = Boolean(currentPreview && !currentPreview.error && currentPreview.count > 0)

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (submitting.current || !previewValid) return
        submitting.current = true
        const form = e.currentTarget
        const fd = new FormData(form)
        setError(null)
        setOk(null)
        startTransition(async () => {
          try {
            const result = await composeFamilyMessage({
              subject: String(fd.get('subject') || ''),
              body: String(fd.get('body') || ''),
              audience: String(fd.get('audience') || 'parents'),
              class_id: String(fd.get('class_id') || '') || null,
              also_slack: alsoSlack,
            })
            if (!mounted.current) return
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
            if ((result.failed ?? 0) === 0 && (result.skipped ?? 0) === 0) {
              form.reset()
              setAudience('parents')
              setClassId(canSchoolWide ? '' : classes[0]?.id || '')
              setAlsoSlack(false)
              onDirtyChange?.(false)
            }
          } catch {
            if (mounted.current) setError('Unable to send message right now.')
          } finally {
            submitting.current = false
          }
        })
      }}
    >
      <div>
        <h3 className="text-lg font-semibold tracking-tight">Compose to groups</h3>
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
            onChange={(e) => {
              latestPreviewRequest.current += 1
              setPreview(null)
              setAudience(e.target.value)
              onDirtyChange?.(true)
            }}
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
            onChange={(e) => {
              latestPreviewRequest.current += 1
              setPreview(null)
              setClassId(e.target.value)
              onDirtyChange?.(true)
            }}
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
          currentPreview && currentPreview.count > 0 && !currentPreview.error
            ? 'rounded-xl border border-success/25 bg-success-soft/60 px-3.5 py-2.5 text-sm text-foreground'
            : 'rounded-xl border border-warning/30 bg-warning-soft/50 px-3.5 py-2.5 text-sm text-foreground'
        }
      >
        {previewing ? (
          <span>Counting recipients…</span>
        ) : currentPreview && !currentPreview.error ? (
          <>
            <strong>{currentPreview.count}</strong> recipient{currentPreview.count === 1 ? '' : 's'}
            {currentPreview.sample.length > 0 ? (
              <span className="text-muted-foreground">
                {' '}· e.g. {currentPreview.sample.slice(0, 3).join(', ')}
                {currentPreview.count > 3 ? '…' : ''}
              </span>
            ) : null}
            {currentPreview.note ? <p className="mt-1 text-xs opacity-90">{currentPreview.note}</p> : null}
          </>
        ) : (
          <span>Could not preview recipients.</span>
        )}
      </div>

      <FieldError>{currentPreview?.error}</FieldError>

      <Field>
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          name="subject"
          required
          maxLength={200}
          placeholder="e.g. Picture day reminder — Friday"
          onChange={() => onDirtyChange?.(true)}
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
          onChange={() => onDirtyChange?.(true)}
        />
      </Field>

      {canSchoolWide ? (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={alsoSlack}
            onChange={(e) => {
              setAlsoSlack(e.target.checked)
              onDirtyChange?.(true)
            }}
          />
          <span>
            <span className="font-medium text-foreground">Also post to Slack</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Mirrors this message to the office Slack channel when BEACON_SLACK_WEBHOOK_URL is set.
            </span>
          </span>
        </label>
      ) : null}

      <FieldError>{error}</FieldError>
      {ok ? (
        <p className="rounded-xl border border-success/25 bg-success-soft px-3.5 py-2.5 text-sm text-success">
          {ok}
        </p>
      ) : null}

      <Button type="submit" disabled={pending || !previewValid}>
        {pending
          ? 'Sending…'
          : currentPreview?.count
            ? `Send to ${currentPreview.count} recipient${currentPreview.count === 1 ? '' : 's'}`
            : 'Send message'}
      </Button>
    </form>
  )
}
