'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  GraduationCap,
  LayoutGrid,
  Loader2,
  Scale,
  Settings2,
  Users,
} from 'lucide-react'
import { applyDefaultGradeWeights } from '@/app/actions/class-setup'
import { validateCategoryWeights } from '@/lib/grades'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type SettingsClassRow = {
  id: string
  name: string
  subject: string | null
  grade_level: string | null
  studentCount: number
  categories: { id: string; name: string; weight: number; drop_lowest: number }[]
}

export function TeacherSettingsHub({
  teacherName,
  classes,
}: {
  teacherName: string
  classes: SettingsClassRow[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-sky-50 to-violet-50 p-5 dark:border-slate-800 dark:from-slate-950 dark:via-sky-950/40 dark:to-violet-950/30">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
            <Settings2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
              Teacher preferences · one place
            </p>
            <h2 className="mt-1 text-xl font-bold text-navy dark:text-sky-50">
              {teacherName ? `${teacherName.split(' ')[0]}'s settings` : 'Teacher settings'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground leading-relaxed">
              Add students and classes, set weighted grade categories, and jump into the gradebook.
              Same tools appear in My classroom and on each class page — multiple doors, one house.
            </p>
          </div>
        </div>
      </div>

      {msg && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          {msg}
        </p>
      )}
      {err && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {err}
        </p>
      )}

      {/* Quick paths */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            href: '/teacher/classroom',
            label: 'Students & classes',
            desc: 'Abeka subjects, roster, CSV',
            icon: Users,
            color: 'violet',
          },
          {
            href: '/dashboard',
            label: 'Home · class list',
            desc: 'Open any gradebook',
            icon: LayoutGrid,
            color: 'sky',
          },
          {
            href: '/teacher/quick',
            label: 'Quick mode',
            desc: 'Attendance · scores · pulse',
            icon: GraduationCap,
            color: 'emerald',
          },
          {
            href: '/teacher/printables',
            label: 'Printables',
            desc: 'Score sheets · coupons',
            icon: BookOpen,
            color: 'amber',
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)] transition hover:border-sky-300 hover:shadow-md"
          >
            <item.icon className="h-5 w-5 text-sky-600" />
            <p className="mt-2 font-semibold text-navy dark:text-sky-50">{item.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
          </Link>
        ))}
      </section>

      {/* Per-class gradebook + weights */}
      <section className="rounded-2xl border bg-card p-5 space-y-4 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-violet-600" />
            <h3 className="text-lg font-bold text-navy dark:text-sky-50">
              Gradebook &amp; weighted grades
            </h3>
          </div>
          <Link
            href="/teacher/classroom"
            className="text-xs font-semibold text-sky-700 underline"
          >
            + Add class or students
          </Link>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Each class has a gradebook (scores) and Class setup (category weights that must total
          ~100%). Use the buttons below — or open the class and use the <strong>Gradebook</strong> /{' '}
          <strong>Weights &amp; setup</strong> tabs.
        </p>

        {classes.length === 0 ? (
          <div className="rounded-xl border border-violet-200 bg-violet-50/80 p-4 text-sm">
            <p className="font-semibold text-violet-950">No classes yet</p>
            <p className="mt-1 text-xs text-violet-900/80">
              Create Abeka classes first, then set weights and open the gradebook.
            </p>
            <Link
              href="/teacher/classroom"
              className="mt-3 inline-flex rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white"
            >
              Open My classroom →
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {classes.map((c) => {
              const weights = validateCategoryWeights(
                c.categories.map((x) => ({ weight: x.weight }))
              )
              return (
                <li
                  key={c.id}
                  className="rounded-2xl border border-border/80 bg-background p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-navy dark:text-sky-50">{c.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[c.subject, c.grade_level].filter(Boolean).join(' · ') || 'Class'} ·{' '}
                        {c.studentCount} students
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {c.categories.length === 0 ? (
                          <Badge variant="warning">No weights yet</Badge>
                        ) : (
                          c.categories.map((cat) => (
                            <Badge key={cat.id} variant="sky">
                              {cat.name} {cat.weight}%
                            </Badge>
                          ))
                        )}
                        {c.categories.length > 0 && (
                          <Badge variant={weights.ok ? 'success' : 'warning'}>
                            {weights.ok ? 'Weights OK' : weights.message}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/classes/${c.id}`}>
                        <Button type="button" size="sm">
                          Gradebook
                        </Button>
                      </Link>
                      <Link href={`/classes/${c.id}?tab=setup`}>
                        <Button type="button" size="sm" variant="outline">
                          Weights &amp; setup
                        </Button>
                      </Link>
                      {c.categories.length === 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          className="border-violet-300 text-violet-800"
                          onClick={() => {
                            setMsg(null)
                            setErr(null)
                            setBusyId(c.id)
                            start(async () => {
                              const r = await applyDefaultGradeWeights(c.id)
                              setBusyId(null)
                              if (!r.ok) {
                                setErr(r.error)
                                return
                              }
                              setMsg(r.note)
                              router.refresh()
                            })
                          }}
                        >
                          {pending && busyId === c.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : null}
                          Apply Abeka-style weights
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* How weights work */}
      <section className="rounded-2xl border bg-muted/30 p-5 text-sm space-y-2">
        <h3 className="font-bold text-navy dark:text-sky-50">How weighted grades work</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground text-xs leading-relaxed">
          <li>
            Categories (Tests, Quizzes, Homework…) each get a <strong>weight %</strong> that should
            add to about 100%.
          </li>
          <li>
            Assignments sit in a category. Overall grade = weighted average of category averages
            (transparent for parents).
          </li>
          <li>
            Optional <strong>drop lowest</strong> per category (handy for homework).
          </li>
          <li>
            Edit anytime: Class page → <strong>Weights &amp; setup</strong>, or the buttons above.
          </li>
        </ul>
      </section>

      <p className={cn('text-[11px] text-muted-foreground')}>
        Tip: bookmark this Settings page, My classroom, and each class gradebook — all stay in sync.
      </p>
    </div>
  )
}
