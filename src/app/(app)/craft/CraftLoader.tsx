'use client'

import dynamic from 'next/dynamic'
import type { CraftFloorLayout } from '@/lib/craft/types'
import type { Role } from '@/lib/types'

const CraftClient = dynamic(() => import('./CraftClient').then((m) => m.CraftClient), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
      Loading BeaconCraft world…
    </div>
  ),
})

export function CraftLoader({ layout, role }: { layout: CraftFloorLayout; role: Role }) {
  return <CraftClient layout={layout} role={role} />
}
