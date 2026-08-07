'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { markCraftSmokeAction, syncCraftRoomsAction } from '@/app/actions/craft'
import type { CraftReadiness } from '@/lib/craft/go-live'
import { Button } from '@/components/ui/button'

export function CraftSetupCard({ readiness }: { readiness: CraftReadiness }) {
  const [pending, start] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function run(action: () => Promise<{ ok: boolean; error?: string; created?: number; mapped?: number }>) {
    setMessage(null)
    setError(null)
    start(async () => {
      const result = await action()
      if (!result.ok) {
        setError(result.error || 'Action failed.')
        return
      }
      if ('created' in result) {
        setMessage(`Synced twin rooms — ${result.created ?? 0} created, ${result.mapped ?? 0} mapped.`)
      } else {
        setMessage('BeaconCraft smoke test recorded on your go-live checklist.')
      }
    })
  }

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-900 dark:bg-indigo-950/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-800 dark:text-indigo-200">
            BeaconCraft digital twin
          </p>
          <p className="mt-1 text-sm text-indigo-950 dark:text-indigo-100">{readiness.detail}</p>
          <ul className="mt-2 space-y-1 text-xs text-indigo-900/80 dark:text-indigo-200/80">
            <li>
              Rooms linked: {readiness.roomsMapped}/{readiness.roomsTotal}
            </li>
            <li>Badge activity: {readiness.hasBadgeActivity ? 'yes' : 'none yet'}</li>
            <li>Smoke test: {readiness.smokeTestDone ? 'recorded' : 'pending'}</li>
          </ul>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(syncCraftRoomsAction)}
          >
            Sync twin rooms
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={pending || readiness.smokeTestDone}
            onClick={() => run(markCraftSmokeAction)}
          >
            Mark smoke test
          </Button>
          <Link
            href="/craft"
            className="inline-flex h-8 items-center rounded-md border border-transparent bg-slate-200 px-3 text-xs font-medium text-slate-900 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-100"
          >
            Open /craft
          </Link>
        </div>
      </div>
      {message ? <p className="mt-3 text-xs font-medium text-emerald-800">{message}</p> : null}
      {error ? <p className="mt-3 text-xs font-medium text-red-700">{error}</p> : null}
    </div>
  )
}
