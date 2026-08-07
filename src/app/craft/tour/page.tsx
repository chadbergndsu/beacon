import type { Metadata } from 'next'
import { CraftTourLoader } from './CraftTourLoader'

export const metadata: Metadata = {
  title: 'Campus tour · BeaconCraft',
  description:
    'Explore a demo school campus in 3D. Public tour uses anonymized markers only — staff sign in for live badge presence.',
}

export default function CraftTourPage() {
  return <CraftTourLoader />
}
