'use client'

import { useMemo, useState } from 'react'
import { Gift, Printer, Scissors } from 'lucide-react'
import { BIRTHDAY_COUPONS } from '@/lib/printables/birthday-coupons'
import { printScopedSection } from '@/lib/printables/print-section'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function BirthdayCouponBook({
  defaultTeacherName = '',
  schoolName = 'Our School',
}: {
  defaultTeacherName?: string
  schoolName?: string
}) {
  const [studentName, setStudentName] = useState('')
  const [teacherName, setTeacherName] = useState(defaultTeacherName)
  const [gradeLabel, setGradeLabel] = useState('4th / 5th')
  const [yearLabel, setYearLabel] = useState(() =>
    String(new Date().getFullYear())
  )

  const displayStudent = studentName.trim() || 'Birthday Superstar'
  const displayTeacher = teacherName.trim() || 'Your teacher'
  const today = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
    []
  )

  return (
    <div className="space-y-8">
      {/* Screen-only controls */}
      <div className="print:hidden space-y-4 rounded-lg border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Gift className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-[13px] font-medium text-foreground">
              Birthday Coupon Book
            </h1>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Printable little coupons for 4th/5th graders — low-prep birthday gift from the
              teacher. Fill in names, print or Save as PDF, then cut on the dashed lines.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="student">Student name</Label>
            <Input
              id="student"
              className="mt-1"
              placeholder="e.g. Ava"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="teacher">From (teacher)</Label>
            <Input
              id="teacher"
              className="mt-1"
              placeholder="Your name"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="grade">Grade band</Label>
            <Input
              id="grade"
              className="mt-1"
              value={gradeLabel}
              onChange={(e) => setGradeLabel(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="year">School year / year</Label>
            <Input
              id="year"
              className="mt-1"
              value={yearLabel}
              onChange={(e) => setYearLabel(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            className="mt-3"
            onClick={() => printScopedSection('birthday-coupons')}
          >
            <Printer className="mr-1.5 h-4 w-4" />
            Print / Save PDF
          </Button>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Scissors className="h-3.5 w-3.5" aria-hidden />
            Tip: print double-sided off; cut on dashes; staple left edge for a mini book.
          </p>
        </div>
      </div>

      {/* Printable surface */}
      <div className="birthday-print space-y-6 print:space-y-4">
        {/* Cover */}
        <section className="rounded-2xl border-2 border-dashed border-amber-400/80 bg-white p-6 text-center shadow-sm print:break-inside-avoid print:border-amber-600 print:shadow-none">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700">
            {schoolName} · Classroom printable
          </p>
          <p className="mt-3 text-4xl" aria-hidden>
            🎂
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            Birthday Coupon Book
          </h2>
          <p className="mt-2 text-lg font-semibold text-slate-800">for {displayStudent}</p>
          <p className="mt-1 text-sm text-slate-600">
            Grade {gradeLabel} · {yearLabel}
          </p>
          <p className="mt-4 text-sm text-slate-700">
            From <strong>{displayTeacher}</strong>
          </p>
          <p className="mt-1 text-xs text-slate-500">Made with Beacon · {today}</p>
          <p className="mt-4 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Redeem one coupon at a time. Hand to your teacher when you want to use it. Happy
            birthday — you make our class brighter!
          </p>
        </section>

        {/* Coupons grid */}
        <div className="grid gap-3 sm:grid-cols-2 print:grid-cols-2">
          {BIRTHDAY_COUPONS.map((c) => (
            <article
              key={c.id}
              className="relative rounded-xl border border-dashed border-slate-300 bg-white p-4 shadow-sm print:break-inside-avoid print:border-slate-500 print:shadow-none"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-2xl" aria-hidden>
                  {c.emoji}
                </span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                  Birthday coupon
                </span>
              </div>
              <h3 className="mt-2 text-base font-bold text-slate-900">{c.title}</h3>
              <p className="mt-1 text-sm leading-snug text-slate-600">{c.blurb}</p>
              <div className="mt-3 border-t border-dotted border-slate-200 pt-2 text-xs text-slate-500">
                <p>
                  For: <strong className="text-slate-800">{displayStudent}</strong>
                </p>
                <p>
                  From: <strong className="text-slate-800">{displayTeacher}</strong>
                </p>
                <p className="mt-1">Teacher initials: ________ · Date used: ________</p>
              </div>
            </article>
          ))}
        </div>

        <p className="print:block hidden text-center text-[10px] text-slate-400">
          Beacon school suite · Birthday Coupon Book · Teacher printable
        </p>
      </div>
    </div>
  )
}
