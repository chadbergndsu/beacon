'use client'

import { useEffect, useRef, useState } from 'react'
import {
  previewPeopleRecipients,
  sendPeopleMessage,
} from '@/app/actions/people-messaging'
import { PeopleRecipientCombobox } from '@/components/comms/PeopleRecipientCombobox'
import { Button } from '@/components/ui/button'
import { Field, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  PEOPLE_DELIVERY_LIMIT,
  PEOPLE_SELECTION_LIMIT,
  type PeoplePreview,
  type PeopleSearchResult,
} from '@/lib/email/people-types'

type PreviewState = {
  forKey: string
  value: PeoplePreview
}

export function PeopleMessageForm({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) {
  const formRef = useRef<HTMLFormElement>(null)
  const latestPreviewRequest = useRef(0)
  const mounted = useRef(true)
  const submitLatch = useRef(false)
  const attemptKey = useRef(crypto.randomUUID())
  const focusNewDraft = useRef(false)
  const [selected, setSelected] = useState<PeopleSearchResult[]>([])
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendStatus, setSendStatus] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [attemptLocked, setAttemptLocked] = useState(false)

  const refsKey = selected.map((item) => item.key).join('|')
  const readyPreview = preview?.forKey === refsKey ? preview.value : null
  const previewing = selected.length > 0 && !readyPreview && !previewError
  const overDeliveryLimit = (readyPreview?.recipientCount ?? 0) > PEOPLE_DELIVERY_LIMIT
  const canSend = Boolean(
    readyPreview &&
      readyPreview.selectedCount === selected.length &&
      readyPreview.recipientCount > 0 &&
      readyPreview.unavailableCount === 0 &&
      !overDeliveryLimit &&
      selected.length <= PEOPLE_SELECTION_LIMIT &&
      subject.trim() &&
      body.trim() &&
      !sending &&
      !attemptLocked
  )

  function draftChanged() {
    attemptKey.current = crypto.randomUUID()
    setAttemptLocked(false)
  }

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      latestPreviewRequest.current += 1
    }
  }, [])

  useEffect(() => {
    if (!focusNewDraft.current || attemptLocked) return
    focusNewDraft.current = false
    formRef.current?.querySelector<HTMLInputElement>('[role="combobox"]')?.focus()
  }, [attemptLocked, selected.length])

  useEffect(() => {
    if (selected.length === 0) return
    const request = ++latestPreviewRequest.current
    const refs = selected.map((item) => item.ref)
    const timer = window.setTimeout(() => {
      void previewPeopleRecipients({ refs })
        .then((result) => {
          if (!mounted.current || request !== latestPreviewRequest.current) return
          if (!result.ok) {
            setPreviewError(result.error)
            return
          }
          setPreview({ forKey: refsKey, value: result.preview })
          setPreviewError(null)
        })
        .catch(() => {
          if (!mounted.current || request !== latestPreviewRequest.current) return
          setPreviewError('Unable to preview recipients right now.')
        })
    }, 150)
    return () => window.clearTimeout(timer)
  }, [refsKey, selected])

  function updateSelected(next: PeopleSearchResult[]) {
    if (next.length > PEOPLE_SELECTION_LIMIT) return
    latestPreviewRequest.current += 1
    draftChanged()
    setSelected(next)
    setPreview(null)
    setPreviewError(null)
    setSendError(null)
    setSendStatus(null)
    onDirtyChange?.(next.length > 0 || subject.length > 0 || body.length > 0)
  }

  function updateSubject(next: string) {
    draftChanged()
    setSubject(next)
    setSendError(null)
    setSendStatus(null)
    onDirtyChange?.(selected.length > 0 || next.length > 0 || body.length > 0)
  }

  function updateBody(next: string) {
    draftChanged()
    setBody(next)
    setSendError(null)
    setSendStatus(null)
    onDirtyChange?.(selected.length > 0 || subject.length > 0 || next.length > 0)
  }

  function startNewMessage() {
    latestPreviewRequest.current += 1
    attemptKey.current = crypto.randomUUID()
    focusNewDraft.current = true
    setSelected([])
    setSubject('')
    setBody('')
    setPreview(null)
    setPreviewError(null)
    setSendError(null)
    setSendStatus(null)
    setAttemptLocked(false)
    onDirtyChange?.(false)
  }

  async function submitMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSend || submitLatch.current) return
    submitLatch.current = true
    setSending(true)
    setSendError(null)
    setSendStatus(null)
    try {
      const result = await sendPeopleMessage({
        refs: selected.map((item) => item.ref),
        subject,
        body,
        attempt_key: attemptKey.current,
      })
      if (!mounted.current) return
      if (!result.ok) {
        setSendError(result.error)
        return
      }

      setAttemptLocked(true)

      const status = [
        `Sent ${result.sent}`,
        result.failed > 0 ? `${result.failed} failed` : null,
        result.skipped > 0 ? `${result.skipped} log-only` : null,
        result.note,
      ]
        .filter(Boolean)
        .join(' · ')
      setSendStatus(status)

    } catch {
      if (mounted.current) setSendError('Unable to send message right now.')
    } finally {
      submitLatch.current = false
      if (mounted.current) setSending(false)
    }
  }

  const unavailableSelections =
    readyPreview?.selections.filter((selection) => selection.disabledReason) ?? []
  const recipientCount = readyPreview?.recipientCount ?? 0

  return (
    <form ref={formRef} className="space-y-4" onSubmit={submitMessage}>
      <div>
        <h3 className="text-lg font-semibold tracking-tight">Message specific people</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Search faculty, parents, or students. Students expand to their linked parent emails.
        </p>
      </div>

      <div>
        <PeopleRecipientCombobox
          selected={selected}
          onChange={updateSelected}
          disabled={sending || attemptLocked}
        />
        <p className="mt-1.5 text-xs text-muted-foreground">Choose up to 50 people.</p>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 px-3.5 py-3 text-sm">
        {selected.length === 0 ? (
          <p className="text-muted-foreground">Choose people to preview email recipients.</p>
        ) : previewing ? (
          <p role="status">Resolving recipients…</p>
        ) : readyPreview ? (
          <div className="space-y-2">
            <p>
              <strong>
                {readyPreview.selectedCount} selected reference
                {readyPreview.selectedCount === 1 ? '' : 's'}
              </strong>
              {' · '}
              <span>
                {readyPreview.recipientCount} unique email recipient
                {readyPreview.recipientCount === 1 ? '' : 's'}
              </span>
            </p>
            {readyPreview.selections.map((selection) =>
              selection.ref.kind === 'student' && selection.recipientNames.length > 0 ? (
                <details key={selection.key} open className="rounded-lg border border-border px-3 py-2">
                  <summary className="cursor-pointer font-medium">
                    {selection.label} sends to {selection.recipientNames.length} linked recipient
                    {selection.recipientNames.length === 1 ? '' : 's'}
                  </summary>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selection.recipientNames.join(' and ')}
                  </p>
                </details>
              ) : null
            )}
          </div>
        ) : null}
      </div>

      {previewError ? <FieldError>{previewError}</FieldError> : null}
      {unavailableSelections.length > 0 ? (
        <FieldError>
          <p>{readyPreview?.unavailableCount} selected unavailable:</p>
          <ul className="mt-1 list-disc pl-5">
            {unavailableSelections.map((selection) => (
              <li key={selection.key}>
                {selection.label}: {selection.disabledReason}
              </li>
            ))}
          </ul>
        </FieldError>
      ) : null}
      {overDeliveryLimit ? (
        <FieldError>Use Groups or Announcements for more than 100 recipients.</FieldError>
      ) : null}

      <Field>
        <Label htmlFor="people-subject">Subject</Label>
        <Input
          id="people-subject"
          name="subject"
          required
          maxLength={200}
          value={subject}
          disabled={sending || attemptLocked}
          onChange={(event) => updateSubject(event.target.value)}
          placeholder="e.g. Field trip reminder"
        />
      </Field>

      <Field>
        <Label htmlFor="people-body">Message</Label>
        <Textarea
          id="people-body"
          name="body"
          required
          rows={6}
          maxLength={20_000}
          value={body}
          disabled={sending || attemptLocked}
          onChange={(event) => updateBody(event.target.value)}
          placeholder="Write what they need to know in plain language…"
        />
      </Field>

      {sendError ? <FieldError>{sendError}</FieldError> : null}
      {sending ? (
        <p role="status" className="text-sm text-muted-foreground">
          Sending message…
        </p>
      ) : sendStatus ? (
        <p
          role="status"
          className="rounded-xl border border-success/25 bg-success-soft px-3.5 py-2.5 text-sm text-success"
        >
          {sendStatus}
        </p>
      ) : null}

      {attemptLocked ? (
        <Button type="button" variant="outline" className="min-h-11" onClick={startNewMessage}>
          Start a new message
        </Button>
      ) : null}

      <Button
        type="submit"
        className="min-h-11"
        disabled={!canSend}
        aria-disabled={!canSend}
      >
        {readyPreview && recipientCount > 0
          ? `Send to ${recipientCount} recipient${recipientCount === 1 ? '' : 's'}`
          : 'Send message'}
      </Button>
    </form>
  )
}
