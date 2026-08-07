import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProductLanding } from '@/components/marketing/ProductLanding'

export const metadata: Metadata = {
  title: 'Beacon · School suite for any school',
  description:
    'Beacon is the full school suite for independent schools — Family Desk communications, Dinner Table Digests, grades, and honest tuition. Talk with us about bringing Beacon to your school.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Beacon · The school suite families actually open',
    description:
      'Academics, family notes, and principal operations — built for schools that outgrew portal chaos.',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Beacon · School suite for any school',
    description: 'Family Desk, Dinner Table Digests, grades, and honest ops.',
  },
  keywords: [
    'school management software',
    'private school SIS',
    'family communication school',
    'school gradebook',
    'Dinner Table Digest',
    'independent school software',
    'school tuition portal',
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
