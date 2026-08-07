import { requirePrincipal } from '@/lib/principal'
import { probeOpsHealth } from '@/lib/ops/health'
import { RELEASE_CHECKLIST, loadReleaseChecklistState } from '@/lib/ops/release-checklist'
import { buildLaunchSuggestions } from '@/lib/ops/next-env-steps'
import { loadSchoolBrand } from '@/lib/school-brand'
import { HealthChecksList } from '@/components/ops/HealthChecksList'
import { LaunchSuggestions } from '@/components/ops/LaunchSuggestions'
import { ReleaseChecklistForm } from '@/components/ops/ReleaseChecklistForm'
import { SchoolBrandForm } from '@/components/ops/SchoolBrandForm'
import { probeCraftReadiness } from '@/lib/craft/go-live'
import { loadCraftLayoutForSchool } from '@/lib/craft/settings'
import { loadCraftRoomMapping } from '@/lib/craft/rooms'
import { listRooms } from '@/lib/badge/store'
import { CraftSetupCard } from '@/components/craft/CraftSetupCard'
import { CraftLayoutEditor } from '@/components/craft/CraftLayoutEditor'
import { CraftRoomMapPanel } from '@/components/craft/CraftRoomMapPanel'
import { OnboardingProgress } from '@/components/ops/OnboardingProgress'
import { PilotPathCard } from '@/components/ops/PilotPathCard'
import { loadSchoolOnboarding } from '@/lib/ops/onboarding'
import { resolvePilotPath } from '@/lib/ops/pilot-path'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'

export default async function PrincipalReleasePage() {
  const { schoolId } = await requirePrincipal()
  const [health, checklist, brand, onboarding, craftReadiness, craftLayout, roomMapping, schoolRooms] =
    await Promise.all([
    probeOpsHealth(schoolId),
    loadReleaseChecklistState(schoolId),
    loadSchoolBrand(schoolId),
    loadSchoolOnboarding(schoolId),
    probeCraftReadiness(schoolId),
    loadCraftLayoutForSchool(schoolId),
    loadCraftRoomMapping(schoolId),
    listRooms(schoolId).catch(() => []),
  ])

  const done = RELEASE_CHECKLIST.filter((i) => checklist[i.id]).length
  const total = RELEASE_CHECKLIST.length
  const suggestions = buildLaunchSuggestions({
    health,
    checklist,
    brand,
    checklistItems: RELEASE_CHECKLIST,
  })

  const healthById = Object.fromEntries(health.checks.map((c) => [c.id, c.status]))
  const brandOk = onboarding.steps.find((s) => s.id === 'brand')?.done ?? false
  const hasTeacher = onboarding.steps.find((s) => s.id === 'teachers')?.done ?? false
  const hasParentLinks = onboarding.steps.find((s) => s.id === 'parents')?.done ?? false
  const pilotStatuses = resolvePilotPath({
    checklist,
    healthById,
    emailLive: health.emailLive,
    hasPrincipalOrAdmin: true, // this page requires principal/admin
    hasTeacher,
    hasParentLinks,
    brandOk,
  })
  const nextPilot = pilotStatuses.find((s) => !s.done)

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Ops & trust"
        title={`Go-live for ${brand.name}`}
        description="Finish platform health, label demo vs live integrations, set your school branding, and tick the human checklist before wider parent rollout. Beacon works for any school — this page is your launch control."
      />

      <PilotPathCard
        statuses={pilotStatuses}
        nextHref={nextPilot?.step.href ?? null}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Ready score
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {health.readyScore}
              <span className="text-base font-semibold text-muted-foreground">/100</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Checklist
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {done}
              <span className="text-base font-semibold text-muted-foreground">/{total}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Integration mode
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant={health.emailLive ? 'success' : 'warning'}>
                Email · {health.emailLive ? 'live' : 'log-only'}
              </Badge>
              <Badge variant={health.qbLiveConfigured ? 'success' : 'sky'}>
                QB · {health.qbLiveConfigured ? 'OAuth ready' : 'demo until keys'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <OnboardingProgress status={onboarding} />

      <CraftSetupCard readiness={craftReadiness} />

      <CraftLayoutEditor initialLayout={craftLayout} />

      <CraftRoomMapPanel
        layout={craftLayout}
        schoolRooms={schoolRooms}
        initialMap={roomMapping.layoutToDb}
      />

      <Card>
        <div className="border-b border-border px-5 py-4">
          <h3 className="font-medium text-foreground">School branding</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Powers login, public school site, emails, and report cards for this tenant.
          </p>
        </div>
        <CardContent className="pt-5">
          <SchoolBrandForm brand={brand} />
        </CardContent>
      </Card>

      <Card>
        <div className="border-b border-border px-5 py-4">
          <h3 className="font-medium text-foreground">Automated health</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Probed just now · {new Date(health.generatedAt).toLocaleString()}
          </p>
        </div>
        <CardContent className="pt-5">
          <HealthChecksList checks={health.checks} />
        </CardContent>
      </Card>

      <Card>
        <div className="border-b border-border px-5 py-4">
          <h3 className="font-medium text-foreground">Human checklist</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Saved on your school record — any principal/admin on this school can update.
          </p>
        </div>
        <CardContent className="pt-5">
          <ReleaseChecklistForm items={RELEASE_CHECKLIST} state={checklist} />
        </CardContent>
      </Card>

      <LaunchSuggestions items={suggestions} />
    </div>
  )
}
