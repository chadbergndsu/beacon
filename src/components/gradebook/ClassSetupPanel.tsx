'use client'

import { useState, useTransition } from 'react'
import {
  applyDefaultGradeWeights,
  createAssignment,
  createCategory,
  deleteAssignment,
  deleteCategory,
  enrollStudent,
  updateCategory,
} from '@/app/actions/class-setup'
import { validateCategoryWeights } from '@/lib/grades'
import type { Assignment, GradeCategory, Student } from '@/lib/types'
import Link from 'next/link'

export function ClassSetupPanel({
  classId,
  categories,
  assignments,
  students,
}: {
  classId: string
  categories: GradeCategory[]
  assignments: Assignment[]
  students: Student[]
}) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const weights = validateCategoryWeights(categories)

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>, okMsg: string) {
    setMessage(null)
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        setError(result.error)
        return
      }
      setMessage(okMsg)
    })
  }

  return (
    <div className="space-y-8">
      <div
        className={`rounded-xl border px-4 py-3 text-sm ${
          weights.ok
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
            : 'border-amber-200 bg-amber-50 text-amber-950'
        }`}
      >
        <strong>Category weights:</strong> {weights.message}
      </div>

      {message && (
        <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href={`/classes/${classId}`}
          className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white"
        >
          ← Back to gradebook
        </Link>
        <Link
          href="/teacher/settings"
          className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
        >
          Teacher settings
        </Link>
        <Link
          href="/teacher/classroom"
          className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
        >
          Students &amp; classes
        </Link>
      </div>

      {/* Categories */}
      <section className="rounded-xl border bg-background p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Grade categories (weights)</h2>
          {categories.length === 0 && (
            <button
              type="button"
              disabled={pending}
              className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-900"
              onClick={() =>
                run(() => applyDefaultGradeWeights(classId), 'Abeka-style weights applied (100%).')
              }
            >
              Apply Abeka-style weights (100%)
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Weights should total about 100%. Parents see the same math on transparent grades.
        </p>
        <ul className="space-y-3">
          {categories.map((cat) => (
            <li key={cat.id} className="grid gap-2 sm:grid-cols-[1fr_90px_90px_auto] items-end border rounded-lg p-3">
              <label className="text-xs font-medium text-muted-foreground">
                Name
                <input
                  id={`cat-name-${cat.id}`}
                  defaultValue={cat.name}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Weight %
                <input
                  id={`cat-weight-${cat.id}`}
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  defaultValue={cat.weight}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Drop lowest
                <input
                  id={`cat-drop-${cat.id}`}
                  type="number"
                  min={0}
                  defaultValue={cat.drop_lowest}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pending}
                  className="rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-medium disabled:opacity-50"
                  onClick={() => {
                    const name = (document.getElementById(`cat-name-${cat.id}`) as HTMLInputElement)
                      .value
                    const weight = Number(
                      (document.getElementById(`cat-weight-${cat.id}`) as HTMLInputElement).value
                    )
                    const drop_lowest = Number(
                      (document.getElementById(`cat-drop-${cat.id}`) as HTMLInputElement).value
                    )
                    run(
                      () => updateCategory(classId, cat.id, { name, weight, drop_lowest }),
                      `Updated ${name}`
                    )
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className="rounded-lg border border-red-200 text-red-700 px-3 py-2 text-sm font-medium disabled:opacity-50"
                  onClick={() => {
                    if (!confirm(`Delete category “${cat.name}”?`)) return
                    run(() => deleteCategory(classId, cat.id), `Deleted ${cat.name}`)
                  }}
                >
                  Del
                </button>
              </div>
            </li>
          ))}
        </ul>

        <form
          className="grid gap-2 sm:grid-cols-[1fr_90px_90px_auto] items-end border-t pt-4"
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            run(
              () =>
                createCategory(classId, {
                  name: String(fd.get('name') || ''),
                  weight: Number(fd.get('weight') || 0),
                  drop_lowest: Number(fd.get('drop_lowest') || 0),
                }),
              'Category added'
            )
            e.currentTarget.reset()
          }}
        >
          <label className="text-xs font-medium text-muted-foreground">
            New category
            <input
              name="name"
              required
              placeholder="e.g. Projects"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Weight %
            <input
              name="weight"
              type="number"
              min={0}
              max={100}
              step={0.5}
              defaultValue={10}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Drop lowest
            <input
              name="drop_lowest"
              type="number"
              min={0}
              defaultValue={0}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-sky-600 text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </section>

      {/* Assignments */}
      <section className="rounded-xl border bg-background p-4 space-y-4">
        <h2 className="text-lg font-semibold">Assignments</h2>
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assignments yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {assignments.map((a) => {
              const cat = categories.find((c) => c.id === a.category_id)
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {cat?.name || 'Uncategorized'} · {a.max_points} pts
                      {a.due_date ? ` · due ${a.due_date}` : ''}
                      {a.is_extra_credit ? ' · extra credit' : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={pending}
                    className="rounded-lg border border-red-200 text-red-700 px-3 py-1.5 text-xs font-medium"
                    onClick={() => {
                      if (!confirm(`Delete “${a.title}”? Grades for it will be removed.`)) return
                      run(() => deleteAssignment(classId, a.id), `Deleted ${a.title}`)
                    }}
                  >
                    Delete
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <form
          className="grid gap-3 sm:grid-cols-2 border-t pt-4"
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            run(
              () =>
                createAssignment(classId, {
                  title: String(fd.get('title') || ''),
                  category_id: String(fd.get('category_id') || '') || null,
                  max_points: Number(fd.get('max_points') || 100),
                  due_date: String(fd.get('due_date') || '') || null,
                  is_extra_credit: fd.get('is_extra_credit') === 'on',
                }),
              'Assignment added'
            )
            e.currentTarget.reset()
          }}
        >
          <label className="text-xs font-medium text-muted-foreground sm:col-span-2">
            Title
            <input
              name="title"
              required
              placeholder="e.g. Chapter 4 Quiz"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Category
            <select name="category_id" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Max points
            <input
              name="max_points"
              type="number"
              min={1}
              step={0.5}
              defaultValue={100}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Due date
            <input name="due_date" type="date" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
          </label>
          <label className="flex items-center gap-2 text-sm mt-6">
            <input name="is_extra_credit" type="checkbox" className="h-4 w-4" />
            Extra credit
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-sky-600 text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Add assignment
            </button>
          </div>
        </form>
      </section>

      {/* Enroll student */}
      <section className="rounded-xl border bg-background p-4 space-y-4">
        <h2 className="text-lg font-semibold">Roster ({students.length})</h2>
        <ul className="text-sm space-y-1 mb-3">
          {students.map((s) => (
            <li key={s.id} className="text-muted-foreground">
              {s.last_name}, {s.first_name}
              {s.grade_level ? ` · ${s.grade_level}` : ''}
            </li>
          ))}
        </ul>
        <form
          className="grid gap-3 sm:grid-cols-4 items-end"
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            run(
              () =>
                enrollStudent(classId, {
                  first_name: String(fd.get('first_name') || ''),
                  last_name: String(fd.get('last_name') || ''),
                  grade_level: String(fd.get('grade_level') || ''),
                }),
              'Student enrolled'
            )
            e.currentTarget.reset()
          }}
        >
          <label className="text-xs font-medium text-muted-foreground">
            First name
            <input name="first_name" required className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Last name
            <input name="last_name" required className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Grade level
            <input name="grade_level" placeholder="5" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-sky-600 text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Enroll student
          </button>
        </form>
      </section>
    </div>
  )
}
