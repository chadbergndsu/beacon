'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveSchoolBrand } from '@/app/actions/ops'
import type { SchoolBrand } from '@/lib/school-brand'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
        <div className="sm:col-span-2">
          <Label htmlFor="name">School name</Label>
          <Input id="name" name="name" required defaultValue={brand.name} />
        </div>
        <div>
          <Label htmlFor="shortName">Short name</Label>
          <Input id="shortName" name="shortName" defaultValue={brand.shortName} placeholder="e.g. RHS" />
        </div>
        <div>
          <Label htmlFor="tagline">Tagline</Label>
          <Input id="tagline" name="tagline" defaultValue={brand.tagline} />
        </div>
        <div>
          <Label htmlFor="websiteUrl">Website URL</Label>
          <Input
            id="websiteUrl"
            name="websiteUrl"
            type="url"
            defaultValue={brand.websiteUrl || ''}
            placeholder="https://"
          />
        </div>
        <div>
          <Label htmlFor="email">Office email</Label>
          <Input id="email" name="email" type="email" defaultValue={brand.email || ''} />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={brand.phone || ''} />
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={brand.city || ''} />
        </div>
        <div>
          <Label htmlFor="state">State</Label>
          <Input id="state" name="state" defaultValue={brand.state || ''} />
        </div>
        <div>
          <Label htmlFor="gradesServed">Grades served</Label>
          <Input
            id="gradesServed"
            name="gradesServed"
            defaultValue={brand.gradesServed || ''}
            placeholder="K4–12"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="mission">Mission / hero blurb</Label>
          <textarea
            id="mission"
            name="mission"
            rows={3}
            defaultValue={brand.mission || ''}
            className="flex w-full rounded-xl border border-border bg-card px-3.5 py-2 text-base sm:text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
          />
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      {ok && <p className="text-sm text-emerald-700">School branding saved — public site updated.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save school branding'}
      </Button>
    </form>
  )
}
