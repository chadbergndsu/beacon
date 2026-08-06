'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveSchoolBrand } from '@/app/actions/ops'
import type { SchoolBrand } from '@/lib/school-brand'
import { Button } from '@/components/ui/button'
import { Field, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export function SchoolBrandForm({ brand }: { brand: SchoolBrand }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        setError(null)
        setOk(false)
        start(async () => {
          const res = await saveSchoolBrand({
            name: String(fd.get('name') || ''),
            shortName: String(fd.get('shortName') || ''),
            tagline: String(fd.get('tagline') || ''),
            websiteUrl: String(fd.get('websiteUrl') || ''),
            email: String(fd.get('email') || ''),
            phone: String(fd.get('phone') || ''),
            city: String(fd.get('city') || ''),
            state: String(fd.get('state') || ''),
            mission: String(fd.get('mission') || ''),
            gradesServed: String(fd.get('gradesServed') || ''),
          })
          if (!res.ok) {
            setError(res.error)
            return
          }
          setOk(true)
          router.refresh()
        })
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field className="sm:col-span-2">
          <Label htmlFor="name">School name</Label>
          <Input id="name" name="name" required defaultValue={brand.name} />
        </Field>
        <Field>
          <Label htmlFor="shortName">Short name</Label>
          <Input id="shortName" name="shortName" defaultValue={brand.shortName} placeholder="e.g. RHS" />
        </Field>
        <Field>
          <Label htmlFor="tagline">Tagline</Label>
          <Input id="tagline" name="tagline" defaultValue={brand.tagline} />
        </Field>
        <Field>
          <Label htmlFor="websiteUrl">Website URL</Label>
          <Input
            id="websiteUrl"
            name="websiteUrl"
            type="url"
            defaultValue={brand.websiteUrl || ''}
            placeholder="https://"
          />
        </Field>
        <Field>
          <Label htmlFor="email">Office email</Label>
          <Input id="email" name="email" type="email" defaultValue={brand.email || ''} />
        </Field>
        <Field>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={brand.phone || ''} />
        </Field>
        <Field>
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={brand.city || ''} />
        </Field>
        <Field>
          <Label htmlFor="state">State</Label>
          <Input id="state" name="state" defaultValue={brand.state || ''} />
        </Field>
        <Field>
          <Label htmlFor="gradesServed">Grades served</Label>
          <Input
            id="gradesServed"
            name="gradesServed"
            defaultValue={brand.gradesServed || ''}
            placeholder="K4–12"
          />
        </Field>
        <Field className="sm:col-span-2">
          <Label htmlFor="mission">Mission / hero blurb</Label>
          <Textarea
            id="mission"
            name="mission"
            rows={3}
            defaultValue={brand.mission || ''}
          />
        </Field>
      </div>
      <FieldError>{error}</FieldError>
      {ok ? (
        <p className="text-sm font-medium text-success">
          School branding saved — public site updated.
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save school branding'}
      </Button>
    </form>
  )
}
