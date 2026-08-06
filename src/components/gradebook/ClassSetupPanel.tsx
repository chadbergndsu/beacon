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
import { Button, buttonClassName } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Field, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
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
            ? 'border-success/25 bg-success-soft text-success'
            : 'border-warning/30 bg-warning-soft text-warning'
        }`}
      >
        <strong>Category weights:</strong> {weights.message}
      </div>

      {message ? (
        <p className="rounded-xl border border-success/25 bg-success-soft px-3.5 py-2.5 text-sm text-success">
          {message}
        </p>
      ) : null}
      <FieldError>{error}</FieldError>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href={`/classes/${classId}`} className={buttonClassName('primary', 'sm')}>
          ← Back to gradebook
        </Link>
        <Link href="/teacher/settings" className={buttonClassName('outline', 'sm')}>
          Teacher settings
        </Link>
        <Link href="/teacher/classroom" className={buttonClassName('outline', 'sm')}>
          Students &amp; classes
        </Link>
      </div>

      {/* Categories */}
      <section className="rounded-xl border bg-background p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Grade categories (weights)</h2>
          {categories.length === 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(() => applyDefaultGradeWeights(classId), 'Abeka-style weights applied (100%).')
              }
            >
              Apply Abeka-style weights (100%)
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Weights should total about 100%. Parents see the same math on transparent grades.
        </p>
        <ul className="space-y-3">
          {categories.map((cat) => (
            <li key={cat.id} className="grid gap-2 sm:grid-cols-[1fr_90px_90px_auto] items-end border rounded-lg p-3">
              <Field>
                <Label htmlFor={`cat-name-${cat.id}`}>Name</Label>
                <Input id={`cat-name-${cat.id}`} defaultValue={cat.name} />
              </Field>
              <Field>
                <Label htmlFor={`cat-weight-${cat.id}`}>Weight %</Label>
                <Input
                  id={`cat-weight-${cat.id}`}
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  defaultValue={cat.weight}
                />
              </Field>
              <Field>
                <Label htmlFor={`cat-drop-${cat.id}`}>Drop lowest</Label>
                <Input
                  id={`cat-drop-${cat.id}`}
                  type="number"
                  min={0}
                  defaultValue={cat.drop_lowest}
                />
              </Field>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
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
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(`Delete category “${cat.name}”?`)) return
                    run(() => deleteCategory(classId, cat.id), `Deleted ${cat.name}`)
                  }}
                >
                  Del
                </Button>
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
          <Field>
            <Label htmlFor="new-cat-name">New category</Label>
            <Input id="new-cat-name" name="name" required placeholder="e.g. Projects" />
          </Field>
          <Field>
            <Label htmlFor="new-cat-weight">Weight %</Label>
            <Input
              id="new-cat-weight"
              name="weight"
              type="number"
              min={0}
              max={100}
              step={0.5}
              defaultValue={10}
            />
          </Field>
          <Field>
            <Label htmlFor="new-cat-drop">Drop lowest</Label>
            <Input
              id="new-cat-drop"
              name="drop_lowest"
              type="number"
              min={0}
              defaultValue={0}
            />
          </Field>
          <Button type="submit" size="sm" disabled={pending}>
            Add
          </Button>
        </form>
      </section>

      {/* Assignments */}
      <section className="rounded-xl border bg-background p-4 space-y-4">
        <h2 className="text-lg font-semibold">Assignments</h2>
        {assignments.length === 0 ? (
          <EmptyState title="No assignments yet." />
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
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    disabled={pending}
                    onClick={() => {
                      if (!confirm(`Delete “${a.title}”? Grades for it will be removed.`)) return
                      run(() => deleteAssignment(classId, a.id), `Deleted ${a.title}`)
                    }}
                  >
                    Delete
                  </Button>
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
          <Field className="sm:col-span-2">
            <Label htmlFor="assignment-title">Title</Label>
            <Input
              id="assignment-title"
              name="title"
              required
              placeholder="e.g. Chapter 4 Quiz"
            />
          </Field>
          <Field>
            <Label htmlFor="assignment-category">Category</Label>
            <Select id="assignment-category" name="category_id">
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label htmlFor="assignment-max-points">Max points</Label>
            <Input
              id="assignment-max-points"
              name="max_points"
              type="number"
              min={1}
              step={0.5}
              defaultValue={100}
            />
          </Field>
          <Field>
            <Label htmlFor="assignment-due-date">Due date</Label>
            <Input id="assignment-due-date" name="due_date" type="date" />
          </Field>
          <label className="flex items-center gap-2 text-sm mt-6">
            <input name="is_extra_credit" type="checkbox" className="h-4 w-4" />
            Extra credit
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              Add assignment
            </Button>
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
          <Field>
            <Label htmlFor="enroll-first-name">First name</Label>
            <Input id="enroll-first-name" name="first_name" required />
          </Field>
          <Field>
            <Label htmlFor="enroll-last-name">Last name</Label>
            <Input id="enroll-last-name" name="last_name" required />
          </Field>
          <Field>
            <Label htmlFor="enroll-grade-level">Grade level</Label>
            <Input id="enroll-grade-level" name="grade_level" placeholder="5" />
          </Field>
          <Button type="submit" disabled={pending}>
            Enroll student
          </Button>
        </form>
      </section>
    </div>
  )
}
