'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Calendar, Trash2 } from 'lucide-react'
import { removeLessonPlan, saveLessonPlan } from '@/app/actions/lessons'
import type { LessonPlan } from '@/lib/school-modules/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LessonPlansPanel({
  classId,
  plans: initial,
}: {
  classId: string
  plans: LessonPlan[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(initial[0]?.id ?? null)

  return (
    <div className="space-y-6 animate-beacon-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
            Academics
          </p>
          <h2 className="text-xl font-bold text-navy dark:text-sky-50">Lesson plans</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Plan the week — objectives, scripture, activities, and homework in one place.
          </p>
        </div>
        <Badge variant="sky">
          {initial.length} plan{initial.length === 1 ? '' : 's'}
        </Badge>
      </div>

      <Card className="overflow-hidden border-sky-100/80">
        <div className="border-b border-border bg-gradient-to-r from-sky-50 to-transparent px-5 py-4 dark:from-sky-950/40">
          <h3 className="font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-sky-600" />
            New lesson plan
          </h3>
        </div>
        <CardContent className="pt-5">
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              const form = e.currentTarget
              const fd = new FormData(form)
              setError(null)
              setOk(null)
              start(async () => {
                try {
                  const res = await saveLessonPlan(classId, {
                    title: String(fd.get('title') || ''),
                    date: String(fd.get('date') || ''),
                    unit: String(fd.get('unit') || ''),
                    objectives: String(fd.get('objectives') || ''),
                    materials: String(fd.get('materials') || ''),
                    activities: String(fd.get('activities') || ''),
                    scripture: String(fd.get('scripture') || ''),
                    homework: String(fd.get('homework') || ''),
                    differentiation: String(fd.get('differentiation') || ''),
                    assessment: String(fd.get('assessment') || ''),
                    durationMinutes: Number(fd.get('duration') || 45),
                    status: String(fd.get('status') || 'ready') as LessonPlan['status'],
                  })
                  if (!res.ok) {
                    setError(res.error || 'Save failed.')
                    return
                  }
                  setOk('Lesson plan saved.')
                  try {
                    form.reset()
                  } catch {
                    /* form may unmount during refresh */
                  }
                  router.refresh()
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : 'Could not save. Stay on this page and try again.'
                  )
                }
              })
            }}
          >
            <div className="sm:col-span-2">
              <Label htmlFor="title">Lesson title</Label>
              <Input
                id="title"
                name="title"
                required
                placeholder="e.g. Fractions · equivalent values"
              />
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                name="date"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div>
              <Label htmlFor="duration">Minutes</Label>
              <Input id="duration" name="duration" type="number" min={5} defaultValue={45} />
            </div>
            <div>
              <Label htmlFor="unit">Unit / topic</Label>
              <Input id="unit" name="unit" placeholder="Chapter 4" />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                className="flex h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm"
                defaultValue="ready"
              >
                <option value="draft">Draft</option>
                <option value="ready">Ready</option>
                <option value="taught">Taught</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="scripture">Scripture / character focus</Label>
              <Input
                id="scripture"
                name="scripture"
                placeholder="e.g. Colossians 3:23 — work heartily"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="objectives">Learning objectives</Label>
              <textarea
                id="objectives"
                name="objectives"
                required
                rows={2}
                className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                placeholder="Students will be able to…"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="materials">Materials</Label>
              <textarea
                id="materials"
                name="materials"
                rows={2}
                className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="activities">Activities / sequence</Label>
              <textarea
                id="activities"
                name="activities"
                required
                rows={3}
                className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                placeholder="Hook → teach → practice → close"
              />
            </div>
            <div>
              <Label htmlFor="homework">Homework</Label>
              <Input id="homework" name="homework" />
            </div>
            <div>
              <Label htmlFor="assessment">Assessment check</Label>
              <Input id="assessment" name="assessment" placeholder="Exit ticket, oral check…" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="differentiation">Differentiation / support</Label>
              <Input
                id="differentiation"
                name="differentiation"
                placeholder="Scaffolding, enrichment…"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 sm:col-span-2" role="alert">
                {error}
              </p>
            )}
            {ok && <p className="text-sm text-emerald-700 sm:col-span-2">{ok}</p>}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={pending} size="lg">
                {pending ? 'Saving…' : 'Save lesson plan'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {initial.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No lesson plans yet — create your first above.
          </Card>
        ) : (
          initial.map((plan) => (
            <Card key={plan.id} className="overflow-hidden">
              <button
                type="button"
                className="flex w-full flex-wrap items-center justify-between gap-2 px-5 py-4 text-left hover:bg-sky-50/40 dark:hover:bg-sky-950/20"
                onClick={() => setExpanded(expanded === plan.id ? null : plan.id)}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-navy dark:text-sky-50">{plan.title}</h3>
                    <Badge
                      variant={
                        plan.status === 'taught'
                          ? 'success'
                          : plan.status === 'ready'
                            ? 'sky'
                            : 'muted'
                      }
                    >
                      {plan.status}
                    </Badge>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {plan.date}
                    {plan.unit ? ` · ${plan.unit}` : ''}
                    {plan.durationMinutes ? ` · ${plan.durationMinutes} min` : ''}
                  </p>
                </div>
              </button>
              {expanded === plan.id && (
                <div className="border-t border-border bg-muted/20 px-5 py-4 space-y-3 text-sm">
                  {plan.scripture && (
                    <p>
                      <span className="font-semibold text-sky-800 dark:text-sky-300">
                        Scripture:{' '}
                      </span>
                      {plan.scripture}
                    </p>
                  )}
                  <p>
                    <span className="font-semibold">Objectives: </span>
                    {plan.objectives}
                  </p>
                  {plan.materials && (
                    <p>
                      <span className="font-semibold">Materials: </span>
                      {plan.materials}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">
                    <span className="font-semibold">Activities: </span>
                    {plan.activities}
                  </p>
                  {plan.homework && (
                    <p>
                      <span className="font-semibold">Homework: </span>
                      {plan.homework}
                    </p>
                  )}
                  {plan.assessment && (
                    <p>
                      <span className="font-semibold">Assessment: </span>
                      {plan.assessment}
                    </p>
                  )}
                  {plan.differentiation && (
                    <p>
                      <span className="font-semibold">Differentiation: </span>
                      {plan.differentiation}
                    </p>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    className="text-red-700 border-red-200"
                    onClick={() =>
                      start(async () => {
                        if (!confirm('Delete this lesson plan?')) return
                        try {
                          const res = await removeLessonPlan(classId, plan.id)
                          if (!res.ok) {
                            setError(res.error)
                            return
                          }
                          setOk('Lesson plan deleted.')
                          router.refresh()
                        } catch (err) {
                          setError(
                            err instanceof Error ? err.message : 'Could not delete lesson plan.'
                          )
                        }
                      })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
