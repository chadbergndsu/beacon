'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  billAftercareAction,
  ensureBadgesAction,
  getKioskLinkAction,
  saveRoomAction,
} from '@/app/actions/badge'
import { BadgePrintSheet } from '@/components/badge/BadgePrintSheet'
import type { AftercareSession, BadgeScan, SchoolRoom, StudentBadge } from '@/lib/badge/types'
import type { RoomKind } from '@/lib/badge/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

export function BadgesAdmin({
  schoolName,
  schoolSlug,
  initialBadges,
  initialRooms,
  initialScans,
  initialOpenAftercare,
  initialKioskPath,
}: {
  schoolName: string
  schoolSlug: string
  initialBadges: StudentBadge[]
  initialRooms: SchoolRoom[]
  initialScans: (BadgeScan & { studentName?: string; roomName?: string })[]
  initialOpenAftercare: (AftercareSession & { studentName?: string; roomName?: string })[]
  initialKioskPath: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [kioskPath, setKioskPath] = useState(initialKioskPath)
  const [roomName, setRoomName] = useState('')
  const [roomKind, setRoomKind] = useState<RoomKind>('classroom')
  const [rate, setRate] = useState('8')

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://beacon.commoncentsip.com'

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-violet-200 bg-violet-50/80 p-4 text-sm text-violet-950 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-100">
        <p className="font-semibold">Badge system for Chris&apos;s rooms</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed">
          <li>
            <strong>Assign codes</strong> to students → print badges
          </li>
          <li>
            Add <strong>rooms</strong> (classroom vs aftercare with hourly rate)
          </li>
          <li>
            Open <strong>kiosk</strong> on a tablet → kids scan IN/OUT
          </li>
          <li>
            Classroom IN marks <strong>attendance present</strong>; aftercare tracks time →{' '}
            <strong>bill for payments</strong>
          </li>
        </ol>
        <p className="mt-2 text-[11px] opacity-80">
          First time: run SQL script <code>pending-011-badge-kiosk.sql</code> in Supabase if tables
          are missing.
        </p>
      </div>

      {msg && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          {msg}
        </p>
      )}
      {err && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {err}
        </p>
      )}

      <section className="rounded-2xl border bg-card p-5 space-y-3">
        <h2 className="font-bold text-navy dark:text-sky-50">Kiosk link (tablet)</h2>
        <p className="text-xs text-muted-foreground">
          Full-screen room scanner. Bookmark on classroom / aftercare iPad. No staff login on the
          tablet.
        </p>
        <code className="block break-all rounded-lg bg-muted px-3 py-2 text-xs">
          {origin}
          {kioskPath}
        </code>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setMsg(null)
              setErr(null)
              start(async () => {
                const r = await getKioskLinkAction()
                if (!r.ok) {
                  setErr(r.error)
                  return
                }
                setKioskPath(r.path)
                setMsg('Kiosk link ready.')
              })
            }}
          >
            Refresh kiosk link
          </Button>
          <Link href={kioskPath} target="_blank" className="inline-flex">
            <Button type="button" size="sm" variant="outline">
              Open kiosk
            </Button>
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5 space-y-3">
        <h2 className="font-bold text-navy dark:text-sky-50">Student badges</h2>
        <p className="text-xs text-muted-foreground">
          {initialBadges.length} students with codes. Assign missing codes, then print.
        </p>
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => {
            setMsg(null)
            setErr(null)
            start(async () => {
              const r = await ensureBadgesAction()
              if (!r.ok) {
                setErr(r.error)
                return
              }
              setMsg(
                r.assigned
                  ? `Assigned ${r.assigned} new badge code(s).`
                  : 'All active students already have codes.'
              )
              router.refresh()
            })
          }}
        >
          Assign badge codes
        </Button>
        {initialBadges.length > 0 && (
          <BadgePrintSheet badges={initialBadges} schoolSlug={schoolSlug} />
        )}
      </section>

      <section className="rounded-2xl border bg-card p-5 space-y-3">
        <h2 className="font-bold text-navy dark:text-sky-50">Rooms</h2>
        <ul className="space-y-2 text-sm">
          {initialRooms.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2"
            >
              <span>
                <strong>{r.name}</strong>
                <span className="ml-2 text-xs text-muted-foreground">{r.kind}</span>
              </span>
              {r.billable && (
                <Badge variant="sky">${(r.rateCentsPerHour / 100).toFixed(2)}/hr</Badge>
              )}
            </li>
          ))}
        </ul>
        <div className="grid gap-2 sm:grid-cols-4 border-t pt-3">
          <div className="sm:col-span-2">
            <Label>New room name</Label>
            <Input
              className="mt-1"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Room 12 / Aftercare A"
            />
          </div>
          <div>
            <Label>Kind</Label>
            <select
              className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
              value={roomKind}
              onChange={(e) => setRoomKind(e.target.value as RoomKind)}
            >
              <option value="classroom">Classroom (attendance)</option>
              <option value="aftercare">Aftercare (payments)</option>
              <option value="gym">Gym</option>
              <option value="office">Office</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <Label>$ / hour (aftercare)</Label>
            <Input
              className="mt-1"
              type="number"
              min={0}
              step={0.5}
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending || !roomName.trim()}
          onClick={() => {
            setMsg(null)
            setErr(null)
            const dollars = Number(rate) || 0
            start(async () => {
              const r = await saveRoomAction({
                name: roomName,
                kind: roomKind,
                billable: roomKind === 'aftercare',
                rateCentsPerHour: Math.round(dollars * 100),
              })
              if (!r.ok) {
                setErr(r.error)
                return
              }
              setRoomName('')
              setMsg('Room saved.')
              router.refresh()
            })
          }}
        >
          Add room
        </Button>
      </section>

      <section className="rounded-2xl border bg-card p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold text-navy dark:text-sky-50">Open aftercare (on campus now)</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => {
              setMsg(null)
              setErr(null)
              start(async () => {
                const r = await billAftercareAction()
                if (!r.ok) {
                  setErr(r.error)
                  return
                }
                setMsg(
                  r.billed
                    ? `Created ${r.billed} invoice(s) · $${(r.totalCents / 100).toFixed(2)}. See Principal → Invoices.`
                    : 'No closed billable sessions waiting.'
                )
                if (r.errors.length) setErr(r.errors.slice(0, 3).join(' · '))
                router.refresh()
              })
            }}
          >
            Bill closed aftercare sessions
          </Button>
        </div>
        {initialOpenAftercare.length === 0 ? (
          <p className="text-sm text-muted-foreground">No students currently checked into aftercare.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {initialOpenAftercare.map((s) => (
              <li key={s.id} className="rounded-lg border px-3 py-2">
                <strong>{s.studentName}</strong>
                <span className="text-muted-foreground">
                  {' '}
                  · {s.roomName} · in since{' '}
                  {new Date(s.checkInAt).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border bg-card p-5 space-y-3">
        <h2 className="font-bold text-navy dark:text-sky-50">Recent scans</h2>
        {initialScans.length === 0 ? (
          <p className="text-sm text-muted-foreground">No scans yet.</p>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
            {initialScans.map((s) => (
              <li key={s.id} className="border-b border-border/60 py-1.5 last:border-0">
                <span className="font-medium">{s.studentName}</span>{' '}
                <Badge variant={s.direction === 'in' ? 'success' : 'warning'} className="ml-1">
                  {s.direction}
                </Badge>
                <span className="text-muted-foreground">
                  {' '}
                  · {s.roomName} · {s.purpose} ·{' '}
                  {new Date(s.scannedAt).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        School: {schoolName}. Payments for billed aftercare appear under{' '}
        <Link href="/principal/invoices" className="text-sky-700 underline">
          Invoices
        </Link>
        .
      </p>
    </div>
  )
}
