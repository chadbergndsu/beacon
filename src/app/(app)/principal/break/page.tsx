import { PrincipalTetris } from '@/components/principal/PrincipalTetris'

export default function PrincipalBreakPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-navy dark:text-sky-50">Coffee break</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-xl">
          A private principal-only Tetris board — for those long budget meetings. High score is saved
          on this browser only.
        </p>
      </div>
      <PrincipalTetris />
    </div>
  )
}
