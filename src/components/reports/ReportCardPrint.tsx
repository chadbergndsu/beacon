'use client'

import { Button } from '@/components/ui/button'

export function ReportCardPrint() {
  return (
    <Button
      type="button"
      size="lg"
      onClick={() => {
        window.print()
      }}
    >
      Print / Save PDF
    </Button>
  )
}
