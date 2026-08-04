'use client'

import { badgePayload } from '@/lib/badge/codes'
import type { StudentBadge } from '@/lib/badge/types'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

/** Printable badge cards — QR payload is text code scanners can also type. */
export function BadgePrintSheet({
  badges,
  schoolSlug,
}: {
  badges: StudentBadge[]
  schoolSlug: string
}) {
  return (
    <div>
      <div className="print:hidden mb-4 flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => window.print()}>
          <Printer className="mr-1.5 h-4 w-4" />
          Print badges
        </Button>
        <p className="text-xs text-muted-foreground">
          Print on label stock or cut cards. Code is what the kiosk accepts.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
        {badges.map((b) => {
          const payload = badgePayload(schoolSlug, b.badgeCode)
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(payload)}`
          return (
            <article
              key={b.id}
              className="rounded-xl border-2 border-slate-800 bg-white p-3 text-center print:break-inside-avoid print:border-slate-600"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-sky-800">
                {b.schoolName}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {b.firstName} {b.lastName}
              </p>
              {b.gradeLevel && (
                <p className="text-xs text-slate-600">Grade {b.gradeLevel}</p>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl}
                alt={`QR ${b.badgeCode}`}
                width={140}
                height={140}
                className="mx-auto mt-2"
              />
              <p className="mt-2 font-mono text-lg font-black tracking-widest text-slate-900">
                {b.badgeCode}
              </p>
              <p className="text-[9px] text-slate-400">Beacon badge · scan IN / OUT</p>
            </article>
          )
        })}
      </div>
    </div>
  )
}
