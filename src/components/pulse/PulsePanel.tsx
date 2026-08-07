'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Sparkles } from 'lucide-react'
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
import { EmptyState } from '@/components/ui/empty-state'
import { Field, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const DIMENSIONS: PulseDimension[] = ['engagement', 'character', 'peer', 'focus', 'joy']
const LEVELS: PulseLevel[] = ['strong', 'steady', 'needs_care']

function levelColor(level: PulseLevel) {
  if (level === 'strong') return 'bg-success'
  if (level === 'steady') return 'bg-primary'
  return 'bg-warning'
}

function levelBadge(level: PulseLevel): 'success' | 'default' | 'warning' {
  if (level === 'strong') return 'success'
  if (level === 'steady') return 'default'
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
    <div className="page-stack animate-beacon-in">
      <div>
        <h2 className="text-lg font-medium tracking-tight text-foreground">Beacon Pulse</h2>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
          Whole-child check-in — engagement, character, peers, focus, and joy — alongside transparent
          academics.
        </p>
      </div>

      <Card className="overflow-hidden border-border/80">
        <div className="border-b border-border/80 bg-muted/30 px-5 py-4">
          <h3 className="flex items-center gap-2 font-semibold tracking-tight">
            <Heart className="h-4 w-4 text-primary" />
            Log a pulse
          </h3>
        </div>
        <CardContent className="space-y-4 pt-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <Label htmlFor="pulse-student">Student</Label>
              <Select
                id="pulse-student"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.last_name}, {s.first_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
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
                        ? cn('border-transparent text-white shadow-sm', levelColor(l))
                        : 'border-border bg-card hover:bg-muted'
                    )}
                  >
                    {PULSE_LEVEL_LABEL[l]}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <Field>
            <Label>Dimensions (optional taps)</Label>
            <div className="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {DIMENSIONS.map((d) => (
                <div key={d} className="rounded-xl border border-border/80 bg-card p-3">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">
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
                            ? cn(levelColor(l), 'text-white')
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
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
          </Field>

          <Field>
            <Label htmlFor="celebrate">Celebrate with the family (optional)</Label>
            <Input
              id="celebrate"
              value={celebrate}
              onChange={(e) => setCelebrate(e.target.value)}
              placeholder="Helped a classmate without being asked"
            />
          </Field>
          <Field>
            <Label htmlFor="note">Private teacher note</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Context for leadership / follow-up…"
            />
          </Field>

          {error ? <FieldError>{error}</FieldError> : null}
          {ok ? (
            <p className="rounded-xl border border-success/25 bg-success-soft px-3.5 py-2.5 text-sm text-success">
              {ok}
            </p>
          ) : null}

          <Button size="lg" disabled={pending || !studentId} onClick={() => {
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
            }}>
            <Sparkles className="h-4 w-4" />
            {pending ? 'Saving…' : 'Log Beacon Pulse'}
          </Button>
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Recent class pulses
        </h3>
        {pulses.length === 0 ? (
          <EmptyState
            title="No pulses yet"
            description="Log the first whole-child signal above."
          />
        ) : (
          <ul className="space-y-2">
            {pulses.slice(0, 20).map((p) => {
              const s = studentMap.get(p.studentId)
              return (
                <li key={p.id}>
                  <Card className="border-border/80">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                      <div>
                        <p className="font-semibold">
                          {s ? `${s.last_name}, ${s.first_name}` : 'Student'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.date} · {p.teacherName}
                          {p.celebrate ? ` · ${p.celebrate}` : ''}
                        </p>
                        {p.note && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.note}</p>
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
