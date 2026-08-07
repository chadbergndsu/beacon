import { PrincipalTetris } from '@/components/principal/PrincipalTetris'
import { PrincipalKart } from '@/components/principal/PrincipalKart'
import { PageHeader } from '@/components/ui/page-header'

export default function PrincipalBreakPage() {
  return (
    <div className="page-stack">
      <PageHeader
        title="Coffee break"
        description="Private principal-only games — for those long budget meetings. High scores stay on this browser only."
      />
      <PrincipalKart />
      <PrincipalTetris />
    </div>
  )
}
