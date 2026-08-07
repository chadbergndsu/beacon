'use client'

import dynamic from 'next/dynamic'

const CraftTourClient = dynamic(() => import('./CraftTourClient').then((m) => m.CraftTourClient), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 text-sm text-slate-300">
      Loading campus tour…
    </div>
  ),
})

export function CraftTourLoader() {
  return <CraftTourClient />
}
