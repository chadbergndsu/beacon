import { getProfile } from '@/lib/auth'
import { loadCraftLayoutForSchool } from '@/lib/craft/settings'
import { CraftLoader } from './CraftLoader'

export default async function CraftPage() {
  const { profile } = await getProfile()

  if (!profile?.school_id) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <h1 className="text-xl font-bold">BeaconCraft unavailable</h1>
        <p className="mt-2 text-sm">Your profile needs a school assignment before opening the digital twin.</p>
      </div>
    )
  }

  const layout = await loadCraftLayoutForSchool(profile.school_id)

  return (
    <div>
      <CraftLoader layout={layout} role={profile.role} />
    </div>
  )
}
