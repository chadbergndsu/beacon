'use client'

import { useState, useTransition } from 'react'
import { submitSchoolInquiry } from '@/app/actions/school-inquiry'
import { Button } from '@/components/ui/button'
import { Field, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

export function SchoolInquiryForm({ compact }: { compact?: boolean }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  return (
    <form
      id="inquiry"
      className={compact ? 'space-y-3' : 'space-y-4'}
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        setError(null)
        setOk(null)
        start(async () => {
          const r = await submitSchoolInquiry({
            schoolName: String(fd.get('schoolName') || ''),
            contactName: String(fd.get('contactName') || ''),
            email: String(fd.get('email') || ''),
            role: String(fd.get('role') || ''),
            message: String(fd.get('message') || ''),
            phone: String(fd.get('phone') || ''),
            company: String(fd.get('company') || ''),
          })
          if (!r.ok) {
            setError(r.error)
            return
          }
          setOk(r.note)
          e.currentTarget.reset()
        })
      }}
    >
      {/* Honeypot */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
        aria-hidden
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <Label htmlFor="inq-school">School name</Label>
          <Input id="inq-school" name="schoolName" required maxLength={120} placeholder="Lighthouse Academy" />
        </Field>
        <Field>
          <Label htmlFor="inq-role">Your role</Label>
          <Select id="inq-role" name="role" defaultValue="Principal">
            <option>Principal</option>
            <option>Administrator</option>
            <option>Board / owner</option>
            <option>IT / operations</option>
            <option>Teacher leader</option>
            <option>Other</option>
          </Select>
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <Label htmlFor="inq-name">Your name</Label>
          <Input id="inq-name" name="contactName" required maxLength={80} placeholder="Chris Cowan" />
        </Field>
        <Field>
          <Label htmlFor="inq-email">Work email</Label>
          <Input
            id="inq-email"
            name="email"
            type="email"
            required
            maxLength={160}
            placeholder="you@yourschool.org"
          />
        </Field>
      </div>

      <Field>
        <Label htmlFor="inq-phone">Phone (optional)</Label>
        <Input id="inq-phone" name="phone" type="tel" maxLength={40} placeholder="(optional)" />
      </Field>

      <Field>
        <Label htmlFor="inq-message">What are you hoping Beacon can help with?</Label>
        <Textarea
          id="inq-message"
          name="message"
          required
          rows={compact ? 4 : 5}
          maxLength={4000}
          placeholder="We’re on FACTS / RenWeb — need Family Desk + grades parents open. Or tuition later…"
        />
      </Field>

      <FieldError>{error}</FieldError>
      {ok ? (
        <p className="rounded-xl border border-success/25 bg-success-soft px-3.5 py-2.5 text-sm text-success">
          {ok}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} size="lg" className="w-full sm:w-auto">
        {pending ? 'Sending…' : 'Start a conversation'}
      </Button>
    </form>
  )
}
