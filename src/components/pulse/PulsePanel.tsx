'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, Heart, Sparkles } from 'lucide-react'
import { submitPulse } from '@/app/actions/pulse'
import type { Student } from '@/lib/types'
import {
  PULSE_LABELS,
  PULSE_LEVEL_LABEL,
  type PulseDimension,
  type PulseEntry,
  type PulseLevel,
} from '@/lib/school-modules/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const DIMENSIONS: PulseDimension[] = ['engagement', 'character', 'peer', 'focus', 'joy']
const LEVELS: PulseLevel[] = ['strong', 'steady', 'needs_care']

function levelColor(level: PulseLevel) {
  if (level === 'strong') return 'bg-emerald-500'
  if (level === 'steady') return 'bg-sky-500'
  return 'bg-amber-500'
}

function levelBadge(level: PulseLevel): 'success' | 'sky' | 'warning' {
  if (level === 'strong') return 'success'
  if (level === 'steady') return 'sky'
  return 'warning'
}

export function PulsePanel({
  classId,
  students,
  pulses,
}: {
  classId: string
  students: Student[]
  pulses: PulseEntry[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [studentId, setStudentId] = useState(students[0]?.id ?? '')
  const [overall, setOverall] = useState<PulseLevel>('steady')
  const [dims, setDims] = useState<Partial<Record<PulseDimension, PulseLevel>>>({})
  const [note, setNote] = useState('')
  const [celebrate, setCelebrate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const studentMap = useMemo(() => {
    const m = new Map(students.map((s) => [s.id, s]))
    return m
  }, [students])

  return (
    <div className="space-y-6 animate-beacon-in">
      <div>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-violet-600" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700">
            Exclusive to Beacon
          </p>
        </div>
        <h2 className="mt-1 text-xl font-bold text-navy dark:text-sky-50">Beacon Pulse</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground leading-relaxed">
          A 15-second whole-child check-in — engagement, character, peers, focus, and joy — not just
          a percentage. Parents see a living pulse beyond the gradebook. No other school suite does
          this next to transparent academics.
        </p>
      </div>

      <Card className="overflow-hidden border-violet-200/70 dark:border-violet-800/50">
        <div className="border-b border-border bg-gradient-to-r from-violet-50 via-sky-50 to-transparent px-5 py-4 dark:from-violet-950/40 dark:via-sky-950/20">
          <h3 className="font-semibold flex items-center gap-2">
            <Heart className="h-4 w-4 text-violet-600" />
            Log a pulse
          </h3>
        </div>
        <CardContent className="pt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Student</Label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.last_name}, {s.first_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Overall pulse</Label>
              <div className="flex gap-2">
                {LEVELS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setOverall(l)}
                    className={cn(
                      'flex-1 rounded-xl border px-2 py-2.5 text-xs font-semibold transition',
                      overall === l
                        ? 'border-transparent text-white shadow-md'
                        : 'border-border bg-card hover:bg-muted'
                    )}
                    style={overall === l ? { background: undefined } : undefined}
                  >
                    <span
                      className={cn(
                        'block rounded-lg py-1',
                        overall === l && levelColor(l),
                        overall === l && 'text-white'
                      )}
                    >
                      {PULSE_LEVEL_LABEL[l]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <Label>Dimensions (optional taps)</Label>
            <div className="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {DIMENSIONS.map((d) => (
                <div key={d} className="rounded-xl border bg-card p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    {PULSE_LABELS[d]}
                  </p>
                  <div className="flex gap-1">
                    {LEVELS.map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setDims((prev) => ({ ...prev, [d]: l }))}
                        className={cn(
                          'h-7 flex-1 rounded-md text-[10px] font-bold transition',
                          dims[d] === l
                            ? `${levelColor(l)} text-white`
                            : 'bg-muted text-muted-foreground hover:bg-slate-200'
                        )}
                        title={PULSE_LEVEL_LABEL[l]}
                      >
                        {l === 'strong' ? '●' : l === 'steady' ? '◐' : '○'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="celebrate">Celebrate with the family (optional)</Label>
            <input
              id="celebrate"
              value={celebrate}
              onChange={(e) => setCelebrate(e.target.value)}
              className="flex h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm"
              placeholder="Helped a classmate without being asked"
            />
          </div>
          <div>
            <Label htmlFor="note">Private teacher note</Label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
              placeholder="Context for leadership / follow-up…"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {ok && <p className="text-sm text-emerald-700">{ok}</p>}

          <Button
            size="lg"
            disabled={pending || !studentId}
            className="bg-gradient-to-b from-violet-500 to-violet-700 shadow-violet-500/20"
            onClick={() => {
              setError(null)
              setOk(null)
              start(async () => {
                const res = await submitPulse(classId, {
                  studentId,
                  overall,
                  dimensions: dims,
                  note,
                  celebrate,
                })
                if (!res.ok) setError(res.error)
                else {
                  setOk('Pulse logged — family can see the whole-child signal.')
                  setNote('')
                  setCelebrate('')
                  setDims({})
                  router.refresh()
                }
              })
            }}
          >
            <Sparkles className="h-4 w-4" />
            {pending ? 'Saving…' : 'Log Beacon Pulse'}
          </Button>
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Recent class pulses
        </h3>
        {pulses.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No pulses yet — log the first whole-child signal above.
          </Card>
        ) : (
          <ul className="space-y-2">
            {pulses.slice(0, 20).map((p) => {
              const s = studentMap.get(p.studentId)
              return (
                <li key={p.id}>
                  <Card>
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                      <div>
                        <p className="font-semibold">
                          {s ? `${s.last_name}, ${s.first_name}` : 'Student'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.date} · {p.teacherName}
                          {p.celebrate ? ` · 🎉 ${p.celebrate}` : ''}
                        </p>
                        {p.note && (
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{p.note}</p>
                        )}
                      </div>
                      <Badge variant={levelBadge(p.overall)}>{PULSE_LEVEL_LABEL[p.overall]}</Badge>
                    </CardContent>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
