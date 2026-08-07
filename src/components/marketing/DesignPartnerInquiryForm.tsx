'use client'

import { useActionState } from 'react'
import {
  submitDesignPartnerInquiry,
  type DesignPartnerInquiryState,
} from '@/app/actions/design-partner'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldHint } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const initialState: DesignPartnerInquiryState = {}

export function DesignPartnerInquiryForm() {
  const [state, formAction, pending] = useActionState(
    submitDesignPartnerInquiry,
    initialState
  )

  if (state.ok) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-5 text-left text-emerald-950"
      >
        <p className="font-semibold">Your inquiry was delivered.</p>
        <p className="mt-1 text-sm leading-relaxed">
          Beacon will review the school, workflow and proposed pilot fit before discussing any next
          step.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="grid gap-4 text-left sm:grid-cols-2">
      <div className="pointer-events-none absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="design-partner-website">Website</label>
        <input
          id="design-partner-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <Field>
        <Label htmlFor="design-partner-name">Name</Label>
        <Input id="design-partner-name" name="name" autoComplete="name" required maxLength={80} />
      </Field>
      <Field>
        <Label htmlFor="design-partner-role">Role</Label>
        <Input
          id="design-partner-role"
          name="role"
          autoComplete="organization-title"
          required
          maxLength={80}
          placeholder="Head of school, principal, office lead…"
        />
      </Field>
      <Field>
        <Label htmlFor="design-partner-email">Work email</Label>
        <Input
          id="design-partner-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={160}
        />
      </Field>
      <Field>
        <Label htmlFor="design-partner-school">School</Label>
        <Input
          id="design-partner-school"
          name="school"
          autoComplete="organization"
          required
          maxLength={120}
        />
      </Field>
      <Field>
        <Label htmlFor="design-partner-enrollment">Approximate enrollment</Label>
        <Input
          id="design-partner-enrollment"
          name="enrollment"
          inputMode="numeric"
          maxLength={40}
          placeholder="Optional"
        />
      </Field>
      <Field>
        <Label htmlFor="design-partner-systems">Current system(s)</Label>
        <Input
          id="design-partner-systems"
          name="currentSystems"
          maxLength={240}
          placeholder="Optional"
        />
      </Field>
      <Field className="sm:col-span-2">
        <Label htmlFor="design-partner-priority">What workflow would you most like to improve?</Label>
        <Textarea
          id="design-partner-priority"
          name="priority"
          required
          minLength={10}
          maxLength={1200}
          rows={5}
          aria-describedby="design-partner-priority-hint"
        />
        <FieldHint id="design-partner-priority-hint">
          Do not include student names, records or other sensitive information.
        </FieldHint>
      </Field>
      <div className="sm:col-span-2">
        <FieldError>{state.error}</FieldError>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? 'Sending inquiry…' : 'Send design-partner inquiry'}
        </Button>
      </div>
    </form>
  )
}
