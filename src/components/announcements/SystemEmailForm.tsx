'use client'

import { useState, useTransition } from 'react'
import { sendSystemEmail } from '@/app/actions/announcements'
import { Button } from '@/components/ui/button'
import { Field, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export function SystemEmailForm() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  return (
    <form
      className="max-w-xl space-y-3"
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
      <h3 className="font-semibold tracking-tight">Send system email</h3>
      <Field>
        <Label htmlFor="to_email">To email</Label>
        <Input id="to_email" name="to_email" type="email" required />
      </Field>
      <Field>
        <Label htmlFor="to_name">To name (optional)</Label>
        <Input id="to_name" name="to_name" />
      </Field>
      <Field>
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" name="subject" required />
      </Field>
      <Field>
        <Label htmlFor="body">Body</Label>
        <Textarea id="body" name="body" required rows={4} />
      </Field>
      <FieldError>{error}</FieldError>
      {ok ? <p className="text-sm font-medium text-success">{ok}</p> : null}
      <Button type="submit" variant="navy" disabled={pending}>
        {pending ? 'Sending…' : 'Send system email'}
      </Button>
    </form>
  )
}
