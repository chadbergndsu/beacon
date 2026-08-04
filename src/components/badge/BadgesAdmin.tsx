'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  billAftercareAction,
  ensureBadgesAction,
  getKioskLinkAction,
  rotateDeviceTokenAction,
  rotateKioskTokenAction,
  saveRoomAction,
  setAftercareNotifyAction,
  setStudentRfidAction,
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
  initialDeviceToken = '',
  initialKioskExpiresAt = null,
  initialDeviceExpiresAt = null,
  initialNotifyParents = true,
  emailLive = false,
  smsConfigured = false,
}: {
  schoolName: string
  schoolSlug: string
  initialBadges: StudentBadge[]
  initialRooms: SchoolRoom[]
  initialScans: (BadgeScan & { studentName?: string; roomName?: string })[]
  initialOpenAftercare: (AftercareSession & { studentName?: string; roomName?: string })[]
  initialKioskPath: string
  initialDeviceToken?: string
  /** ISO timestamp — tokens fail closed after this (migration 018) */
  initialKioskExpiresAt?: string | null
  initialDeviceExpiresAt?: string | null
  initialNotifyParents?: boolean
  emailLive?: boolean
  smsConfigured?: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [kioskPath, setKioskPath] = useState(initialKioskPath)
  const [deviceToken, setDeviceToken] = useState(initialDeviceToken)
  const [notifyParents, setNotifyParents] = useState(initialNotifyParents)
  const [roomName, setRoomName] = useState('')
  const [roomKind, setRoomKind] = useState<RoomKind>('classroom')
  const [rate, setRate] = useState('8')
  const [rfidStudentId, setRfidStudentId] = useState(initialBadges[0]?.id || '')
  const [rfidUid, setRfidUid] = useState('')

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
            Open <strong>kiosk</strong> on a tablet → USB scan, camera QR, or name search
          </li>
          <li>
            Classroom IN marks <strong>attendance present</strong>; aftercare tracks time →{' '}
            <strong>bill for payments</strong>
          </li>
          <li>
            Teachers can also use nav <strong>Scan</strong> from a laptop
          </li>
          <li>
            Aftercare IN/OUT emails parents (optional SMS via Twilio); RFID/USB readers work too
          </li>
        </ol>
        <p className="mt-2 text-[11px] opacity-80">
          First time: apply migrations 011–012 via <code>npm run db:migrate</code> if tables or
          RFID columns are missing.
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
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => {
              setMsg(null)
              setErr(null)
              start(async () => {
                const r = await rotateKioskTokenAction()
                if (!r.ok) {
                  setErr(r.error)
                  return
                }
                setKioskPath(r.path)
                setMsg('Kiosk token rotated — old tablet links stop working. Re-open kiosk.')
              })
            }}
          >
            Rotate kiosk token
          </Button>
          <Link href={kioskPath} target="_blank" className="inline-flex">
            <Button type="button" size="sm" variant="outline">
              Open kiosk
            </Button>
          </Link>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Tokens are stored in a service-only table (not visible to parents). Vault = migration 015;
          expiry = migration 018 (default 90 days; rotate anytime).
          {initialKioskExpiresAt && (
            <>
              {' '}
              Kiosk expires{' '}
              <strong>{new Date(initialKioskExpiresAt).toLocaleString()}</strong>.
            </>
          )}
        </p>
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
        <h2 className="font-bold text-navy dark:text-sky-50">Parent notify (aftercare)</h2>
        <p className="text-xs text-muted-foreground">
          When a student checks in or out of an aftercare room, linked parents get an email. SMS is
          sent too if Twilio is configured and the parent profile has a phone number.
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant={emailLive ? 'success' : 'warning'}>
            Email {emailLive ? 'live' : 'not live'}
          </Badge>
          <Badge variant={smsConfigured ? 'success' : 'warning'}>
            SMS {smsConfigured ? 'Twilio ready' : 'optional (set TWILIO_*)'}
          </Badge>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={notifyParents}
            disabled={pending}
            onChange={(e) => {
              const next = e.target.checked
              setNotifyParents(next)
              setMsg(null)
              setErr(null)
              start(async () => {
                const r = await setAftercareNotifyAction(next)
                if (!r.ok) {
                  setNotifyParents(!next)
                  setErr(r.error)
                  return
                }
                setMsg(next ? 'Parent aftercare alerts ON.' : 'Parent aftercare alerts OFF.')
              })
            }}
          />
          Email / SMS parents on aftercare IN and OUT
        </label>
        <p className="text-[11px] text-muted-foreground">
          Link parents on Roster first. SMS needs{' '}
          <code className="rounded bg-muted px-1">TWILIO_ACCOUNT_SID</code>,{' '}
          <code className="rounded bg-muted px-1">TWILIO_AUTH_TOKEN</code>,{' '}
          <code className="rounded bg-muted px-1">TWILIO_FROM</code> on Vercel.
        </p>
      </section>

      <section className="rounded-2xl border bg-card p-5 space-y-3">
        <h2 className="font-bold text-navy dark:text-sky-50">RFID / hardware readers</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>USB scanners</strong> (QR or RFID keyboard-wedge) already work on the kiosk —
          they type the code and press Enter. For <strong>ESP32 / wall readers</strong>, POST to
          the device API with the school device token.
        </p>
        <div>
          <Label className="text-xs">Device token (keep secret)</Label>
          <code className="mt-1 block break-all rounded-lg bg-muted px-3 py-2 text-xs">
            {deviceToken || '— generate by refreshing —'}
          </code>
          {initialDeviceExpiresAt && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Expires <strong>{new Date(initialDeviceExpiresAt).toLocaleString()}</strong> — rotate
              or re-open Principal → Badges after expiry (expired tokens are rejected).
            </p>
          )}
        </div>
        <div>
          <Label className="text-xs">API endpoint</Label>
          <code className="mt-1 block break-all rounded-lg bg-muted px-3 py-2 text-[11px]">
            POST {origin}/api/kiosk/device-scan
          </code>
        </div>
        <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-[11px] text-slate-100">
{`{
  "deviceToken": "${deviceToken || 'dev_…'}",
  "code": "A1B2C3D4",
  "roomId": "${initialRooms[0]?.id || 'ROOM_UUID'}",
  "direction": "auto",
  "deviceLabel": "Hall RFID"
}`}
        </pre>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => {
              setMsg(null)
              setErr(null)
              start(async () => {
                const r = await rotateDeviceTokenAction()
                if (!r.ok) {
                  setErr(r.error)
                  return
                }
                setDeviceToken(r.deviceToken)
                setMsg('Device token rotated. Update ESP32 firmware/config.')
              })
            }}
          >
            Rotate device token
          </Button>
        </div>

        <div className="border-t pt-3 space-y-2">
          <h3 className="text-sm font-semibold">Assign RFID / NFC UID to student</h3>
          <p className="text-[11px] text-muted-foreground">
            Tap a blank card on a reader that types the UID, paste it here. Same code works on
            kiosk USB scanners. Requires SQL{' '}
            <code className="rounded bg-muted px-1">migration 012 (RFID)</code>.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <Label className="text-xs">Student</Label>
              <select
                className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                value={rfidStudentId}
                onChange={(e) => setRfidStudentId(e.target.value)}
              >
                {initialBadges.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.lastName}, {b.firstName}
                    {b.rfidUid ? ` · RFID ${b.rfidUid}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-1">
              <Label className="text-xs">RFID / NFC UID</Label>
              <Input
                className="mt-1 font-mono text-sm"
                value={rfidUid}
                onChange={(e) => setRfidUid(e.target.value)}
                placeholder="A1:B2:C3:D4 or DEADBEEF"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                size="sm"
                disabled={pending || !rfidStudentId || !rfidUid.trim()}
                onClick={() => {
                  setMsg(null)
                  setErr(null)
                  start(async () => {
                    const r = await setStudentRfidAction({
                      studentId: rfidStudentId,
                      rfidUid,
                    })
                    if (!r.ok) {
                      setErr(r.error)
                      return
                    }
                    setRfidUid('')
                    setMsg('RFID UID saved for student.')
                    router.refresh()
                  })
                }}
              >
                Save RFID UID
              </Button>
            </div>
          </div>
        </div>
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
