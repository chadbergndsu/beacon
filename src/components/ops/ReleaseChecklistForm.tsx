'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleReleaseCheck } from '@/app/actions/ops'
import type { ChecklistItem } from '@/lib/ops/release-checklist'
import { cn } from '@/lib/utils'

export function ReleaseChecklistForm({
  items,
  state,
}: {
  items: ChecklistItem[]
  state: Record<string, boolean>
}) {
  const router = useRouter()
  const [pending, start] = useTransition()

  const groups: { key: ChecklistItem['group']; title: string }[] = [
    { key: 'ops', title: 'Operations' },
    { key: 'trust', title: 'Trust' },
    { key: 'launch', title: 'Launch' },
  ]

  return (
    <div className="space-y-6">
      {groups.map((g) => {
        const list = items.filter((i) => i.group === g.key)
        return (
          <section key={g.key}>
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {g.title}
            </h3>
            <ul className="mt-2 divide-y divide-border rounded-2xl border bg-card">
              {list.map((item) => {
                const checked = Boolean(state[item.id])
                return (
                  <li key={item.id} className="flex items-start gap-3 px-4 py-3.5">
                    <input
                      id={`check-${item.id}`}
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-border"
                      checked={checked}
                      disabled={pending}
                      onChange={(e) => {
                        const next = e.target.checked
                        start(async () => {
                          await toggleReleaseCheck(item.id, next)
                          router.refresh()
                        })
                      }}
                    />
                    <label htmlFor={`check-${item.id}`} className="min-w-0 cursor-pointer">
                      <p
                        className={cn(
                          'text-sm font-semibold',
                          checked && 'text-emerald-800 dark:text-emerald-300'
                        )}
                      >
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                        {item.help}
                      </p>
                    </label>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
