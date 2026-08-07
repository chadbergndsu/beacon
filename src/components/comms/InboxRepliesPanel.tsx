'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { replyToInboxMessage, updateInboxStatus } from '@/app/actions/communications'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type InboxItem = {
  id: string
  from_email: string
  from_name: string | null
  subject: string
  body_text: string
  status: string
  created_at: string
  outbox_id: string | null
  provider: string | null
}

export function InboxRepliesPanel({
  items,
  canReply,
}: {
  items: InboxItem[]
  canReply: boolean
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border p-4 text-sm text-muted-foreground">
        No family replies yet. When inbound email is configured, parents reply to system
        messages and every reply lands here — correlated to the original outbox send.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <InboxReplyCard key={item.id} item={item} canReply={canReply} />
      ))}
    </ul>
  )
}

function InboxReplyCard({ item, canReply }: { item: InboxItem; canReply: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [replyOpen, setReplyOpen] = useState(false)
  const [body, setBody] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function runStatus(status: 'reviewed' | 'archived' | 'received') {
    setError(null)
    setNote(null)
    start(async () => {
      const r = await updateInboxStatus(item.id, status)
      if (!r.ok) setError(r.error)
      else {
        setNote(status === 'reviewed' ? 'Marked reviewed.' : status === 'archived' ? 'Archived.' : 'Reopened.')
        router.refresh()
      }
    })
  }

  function sendReply() {
    setError(null)
    setNote(null)
    start(async () => {
      const r = await replyToInboxMessage({ inboxId: item.id, body })
      if (!r.ok) setError(r.error)
      else {
        setNote(r.emailNote || 'Sent.')
        setBody('')
        setReplyOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <li className="rounded-xl border bg-card p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">
              {item.from_name || item.from_email}
            </p>
            <Badge variant={item.status === 'received' ? 'warning' : 'muted'}>
              {item.status}
            </Badge>
            {item.outbox_id ? (
              <span className="text-[11px] text-muted-foreground">threaded</span>
            ) : (
              <span className="text-[11px] text-amber-700">unmatched token</span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {item.from_email}
            {item.provider ? ` · ${item.provider}` : ''}
          </p>
          <p className="mt-2 font-medium">{item.subject}</p>
        </div>
        <time className="shrink-0 text-xs text-muted-foreground">
          {new Date(item.created_at).toLocaleString()}
        </time>
      </div>
      <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-foreground">
        {item.body_text}
      </pre>
      <div className="mt-3 flex flex-wrap gap-2">
        {item.status === 'received' ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => runStatus('reviewed')}
          >
            Mark reviewed
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => runStatus('received')}
          >
            Reopen
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => runStatus('archived')}
        >
          Archive
        </Button>
        {canReply ? (
          <Button
            type="button"
            size="sm"
            variant="primary"
            disabled={pending}
            onClick={() => setReplyOpen((v) => !v)}
          >
            {replyOpen ? 'Cancel reply' : 'Reply'}
          </Button>
        ) : null}
      </div>
      {replyOpen ? (
        <div className="mt-3 space-y-2 border-t pt-3">
          <textarea
            className="min-h-[100px] w-full rounded-lg border bg-background px-3 py-2 text-sm"
            placeholder="Write a reply to this family…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={8000}
          />
          <Button type="button" size="sm" disabled={pending || body.trim().length < 2} onClick={sendReply}>
            Send reply
          </Button>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
      {note ? <p className="mt-2 text-xs text-emerald-700">{note}</p> : null}
    </li>
  )
}
