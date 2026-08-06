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
  Users,
} from 'lucide-react'
import { applyDefaultGradeWeights } from '@/app/actions/class-setup'
import { validateCategoryWeights } from '@/lib/grades'
import { SkinPicker } from '@/components/skins/SkinPicker'
import type { SkinId } from '@/lib/skins/catalog'
import { Button, buttonClassName } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
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
  currentSkin = 'classic',
}: {
  teacherName: string
  classes: SettingsClassRow[]
  currentSkin?: SkinId
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Teacher preferences"
        title={teacherName ? `${teacherName.split(' ')[0]}'s settings` : 'Teacher settings'}
        description="Students, weighted grades, and the gradebook — same tools as Classroom, one calm place."
      />

      {msg ? (
        <p className="rounded-xl border border-success/25 bg-success-soft px-4 py-3 text-sm text-success">
          {msg}
        </p>
      ) : null}
      {err ? (
        <p className="rounded-xl border border-red-200 bg-danger-soft px-4 py-3 text-sm text-danger">
          {err}
        </p>
      ) : null}

      <div id="skins">
        <SkinPicker currentSkin={currentSkin} />
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            href: '/teacher/classroom',
            label: 'Students & classes',
            desc: 'Abeka subjects, roster, CSV',
            icon: Users,
          },
          {
            href: '/dashboard',
            label: 'Home · class list',
            desc: 'Open any gradebook',
            icon: LayoutGrid,
          },
          {
            href: '/teacher/quick',
            label: 'Quick mode',
            desc: 'Attendance · scores · pulse',
            icon: GraduationCap,
          },
          {
            href: '/teacher/printables',
            label: 'Printables',
            desc: 'Score sheets · coupons',
            icon: BookOpen,
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="card-interactive rounded-lg border border-border bg-card p-4"
          >
            <item.icon className="h-5 w-5 text-primary" />
            <p className="mt-2 font-semibold tracking-tight">{item.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
          </Link>
        ))}
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold tracking-tight">
              Gradebook &amp; weighted grades
            </h3>
          </div>
          <Link href="/teacher/classroom" className="text-xs font-semibold text-primary hover:underline">
            + Add class or students
          </Link>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Each class has a gradebook and Setup (weights ~100%). Open the class tabs or use the
          buttons below.
        </p>

        {classes.length === 0 ? (
          <EmptyState
            tone="primary"
            title="No classes yet"
            description="Create Abeka classes first, then set weights and open the gradebook."
            action={
              <Link href="/teacher/classroom" className={buttonClassName('primary', 'sm')}>
                Open classroom →
              </Link>
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Class</TH>
                <TH>Subject</TH>
                <TH className="text-right">Students</TH>
                <TH>Weights</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {classes.map((c) => {
                const weights = validateCategoryWeights(
                  c.categories.map((x) => ({ weight: x.weight }))
                )
                return (
                  <TR key={c.id}>
                    <TD className="font-medium">{c.name}</TD>
                    <TD className="text-muted-foreground">
                      {[c.subject, c.grade_level].filter(Boolean).join(' · ') || '—'}
                    </TD>
                    <TD className="text-right tabular-nums">{c.studentCount}</TD>
                    <TD>
                      <div className="flex flex-wrap gap-1">
                        {c.categories.length === 0 ? (
                          <Badge variant="warning">None</Badge>
                        ) : (
                          <>
                            {c.categories.map((cat) => (
                              <Badge key={cat.id} variant="muted">
                                {cat.name} {cat.weight}%
                              </Badge>
                            ))}
                            <Badge variant={weights.ok ? 'success' : 'warning'}>
                              {weights.ok ? 'OK' : weights.message}
                            </Badge>
                          </>
                        )}
                      </div>
                    </TD>
                    <TD className="text-right">
                      <div className="inline-flex flex-wrap justify-end gap-1.5">
                        <Link href={`/classes/${c.id}`}>
                          <Button type="button" size="sm">
                            Gradebook
                          </Button>
                        </Link>
                        <Link href={`/classes/${c.id}?tab=setup`}>
                          <Button type="button" size="sm" variant="outline">
                            Setup
                          </Button>
                        </Link>
                        {c.categories.length === 0 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={pending}
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
                            Defaults
                          </Button>
                        )}
                      </div>
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        )}
      </section>

      {/* How weights work */}
      <section className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
        <h3 className="font-semibold tracking-tight text-foreground">How weighted grades work</h3>
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
