'use client'

import { useState } from 'react'
import { DEMO_SCHOOL_LAYOUT } from '@/lib/craft/layout'
import { TOUR_DEMO_MARKERS } from '@/lib/craft/tour-presence'
import { CraftUiProvider } from '@/components/craft/CraftUiContext'
import { CraftTourHud } from '@/components/craft/CraftTourHud'

export function CraftTourClient() {
  const [flyMode, setFlyMode] = useState(false)

  return (
    <CraftUiProvider
      layout={DEMO_SCHOOL_LAYOUT}
      markers={TOUR_DEMO_MARKERS}
      trails={[]}
      flyMode={flyMode}
      setFlyMode={setFlyMode}
    >
      <CraftTourHud markers={TOUR_DEMO_MARKERS} />
    </CraftUiProvider>
  )
}
