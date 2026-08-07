import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProductLanding } from '@/components/marketing/ProductLanding'

export const metadata: Metadata = {
  title: 'Beacon · FACTS Alternative for Christian Schools',
  description:
    'Beacon is a FACTS & RenWeb alternative for Christian and independent schools — Family Desk, Dinner Table Digests, grades, and honest tuition. FACTS is Nelnet commercial software; Beacon is ministry-stewarded.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Beacon · The FACTS alternative families actually open',
    description:
      'Leave the portal black hole. Family Desk communications for faith-based schools — ministry-stewarded by Common Cents IP.',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Beacon · FACTS alternative for Christian schools',
    description: 'Family Desk, Dinner Table Digests, grades — not another Nelnet portal.',
  },
  keywords: [
    'FACTS alternative',
    'FACTS alternative for Christian schools',
    'RenWeb alternative',
    'Christian school management software',
    'Christian school SIS',
    'faith-based school software',
    'Beacon vs FACTS',
    'school family communication',
    'Dinner Table Digest',
    'private school SIS',
    'independent school software',
  ],
}

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  return <ProductLanding />
}
