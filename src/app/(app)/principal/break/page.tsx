import { PrincipalTetris } from '@/components/principal/PrincipalTetris'
import { PrincipalKart } from '@/components/principal/PrincipalKart'

export default function PrincipalBreakPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-navy dark:text-sky-50">Coffee break</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-xl">
          Private principal-only games — for those long budget meetings. High scores stay on this
          browser only.
        </p>
      </div>
      <PrincipalKart />
      <PrincipalTetris />
    </div>
  )
}
