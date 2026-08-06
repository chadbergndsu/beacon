import Link from 'next/link'
import {
  BookOpen,
  GraduationCap,
  Heart,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Users,
  Box,
} from 'lucide-react'
import { SchoolSiteHeader } from '@/components/school/SchoolSiteHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { headers } from 'next/headers'
import { loadSchoolBrand, loadSchoolBrandByPublicKey, locationLine } from '@/lib/school-brand'

export default async function SchoolWebsitePage({
  searchParams,
}: {
  searchParams: Promise<{ school?: string; slug?: string }>
}) {
  const sp = await searchParams
  const h = await headers()
  const host = h.get('host') || ''
  // subdomain.example.com → first label as slug (ignore www / app hosts)
  const sub = host.split('.')[0]?.toLowerCase() || ''
  const hostSlug =
    sub && !['www', 'beacon', 'app', 'localhost', '127'].includes(sub) ? sub : null
  const key = sp.school || sp.slug || hostSlug
  const brand = key ? await loadSchoolBrandByPublicKey(key) : await loadSchoolBrand(null)
  const location = locationLine(brand)
  const craftBase = (
    process.env.NEXT_PUBLIC_BEACONCRAFT_URL?.trim() || 'http://localhost:3001'
  ).replace(/\/$/, '')
  const tourUrl = `${craftBase}/?tour=1`

  return (
    <div className="min-h-screen min-h-[100dvh] overflow-x-hidden beacon-shell text-foreground">
      <SchoolSiteHeader schoolName={brand.name} websiteUrl={brand.websiteUrl} />

      <section className="relative min-h-[70vh] overflow-hidden sm:min-h-[78vh]">
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-[#0c1a2e] to-sky-950" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgb(14_165_233/0.22),transparent_50%),radial-gradient(ellipse_at_80%_0%,rgb(2_132_199/0.18),transparent_45%)]" />
        <div className="relative mx-auto flex min-h-[70vh] max-w-6xl flex-col justify-end px-4 pb-14 pt-20 text-white sm:min-h-[78vh] sm:px-6 sm:pb-20 sm:pt-28">
          <p className="text-sm font-medium tracking-wide text-sky-200/90">
            {brand.tagline || 'A school community worth coming home to'}
          </p>
          <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight leading-[1.05] sm:text-6xl sm:leading-[1.02]">
            {brand.name}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-200/95 sm:text-lg">
            {brand.mission ||
              'Transparent academics, clear family communication, and calm operations — powered by Beacon.'}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login">
              <Button size="lg" className="shadow-lg shadow-sky-500/25">
                Sign in
              </Button>
            </Link>
            <a href={tourUrl} target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                variant="outline"
                className="border-white/25 bg-white/10 text-white hover:bg-white/15 hover:text-white"
              >
                Campus tour
              </Button>
            </a>
          </div>
          <p className="mt-8 text-sm text-sky-200/70">
            {[brand.gradesServed, location, brand.curriculumNote].filter(Boolean).join(' · ') ||
              'Private & independent schools · K–12 ready'}
          </p>
        </div>
      </section>

      <section id="about" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-3 sm:gap-8">
          {[
            {
              icon: GraduationCap,
              title: 'Academics',
              body: 'Transparent grades parents can understand — not a mysterious percentage.',
            },
            {
              icon: Users,
              title: 'Families',
              body: 'Announcements, Dinner Table Digest, and a living parent feed in one place.',
            },
            {
              icon: Sparkles,
              title: 'Operations',
              body: 'Principal office, tuition, QuickBooks-ready billing, and school climate.',
            },
          ].map((item) => (
            <div key={item.title} className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold tracking-tight">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="academics" className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">Academics</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-navy dark:text-sky-50">
              Clarity for teachers and families
            </h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Beacon gives {brand.name} a shared gradebook, attendance, lesson plans, Beacon Pulse
              whole-child check-ins, and printable conference briefs — without five different logins.
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              {[
                'Transparent grade breakdowns',
                'Teacher Quick Mode on phones',
                'Report cards & CSV export',
                'Conference Brief in one tap',
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <BookOpen className="h-4 w-4 shrink-0 text-sky-600 mt-0.5" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <Card>
            <CardContent className="pt-6 space-y-3 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">For leadership</p>
              <p>
                Principal Beacon Signal shows school climate at a glance — pastoral watch list from
                pulse, attendance, and missing work — not a 40-column district dashboard.
              </p>
              <p className="font-semibold text-foreground pt-2">For families</p>
              <p>
                Dinner Table Digest turns the week into celebrate / watch / conversation starters
                parents can actually use.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="tour" className="border-y border-border bg-card/40 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
                Virtual walkthrough
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-navy dark:text-sky-50">
                Explore campus in 3D
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Take a guided tour of {brand.name} — entrance, classrooms, chapel, gym, and yard —
                in a live digital twin. No login required for the public tour.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                {[
                  'Orbit the property or walk first-person',
                  'See how rooms map to real campus spaces',
                  'Same twin staff use for live badge presence',
                ].map((t) => (
                  <li key={t} className="flex gap-2">
                    <Box className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={tourUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/25">
                    Start virtual tour
                  </Button>
                </a>
                <a href={craftBase} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline">
                    Open campus twin
                  </Button>
                </a>
              </div>
            </div>
            <Card className="overflow-hidden border-emerald-200/80 shadow-[var(--shadow-lift)]">
              <CardContent className="pt-6 space-y-3">
                <div className="rounded-xl bg-gradient-to-br from-slate-100 via-sky-50 to-emerald-50 p-6 min-h-[180px] flex flex-col justify-end border border-slate-200/80">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    BeaconCraft
                  </p>
                  <p className="mt-1 text-lg font-bold text-navy">Live campus twin</p>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    Classroom blocks, course glow, and a step-by-step walkthrough of the property.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Opens in a new tab · works on laptop and phone · privacy-first public tour mode
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="families" className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
          <Heart className="mx-auto h-8 w-8 text-sky-600" />
          <h2 className="mt-3 text-2xl font-bold text-navy dark:text-sky-50">Built for families</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground leading-relaxed">
            Parents see only their children. Staff stay scoped to the school. Access is designed so
            your school can trust Beacon with real student data.
          </p>
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">Contact</p>
            <h2 className="mt-2 text-2xl font-bold text-navy dark:text-sky-50">{brand.name}</h2>
            <ul className="mt-5 space-y-3 text-sm">
              {location && (
                <li className="flex gap-2 items-start">
                  <MapPin className="h-4 w-4 text-sky-600 mt-0.5 shrink-0" />
                  {location}
                </li>
              )}
              {brand.email && (
                <li className="flex gap-2 items-center">
                  <Mail className="h-4 w-4 text-sky-600 shrink-0" />
                  <a className="text-sky-700 hover:underline" href={`mailto:${brand.email}`}>
                    {brand.email}
                  </a>
                </li>
              )}
              {brand.phone && (
                <li className="flex gap-2 items-center">
                  <Phone className="h-4 w-4 text-sky-600 shrink-0" />
                  <a className="text-sky-700 hover:underline" href={`tel:${brand.phone}`}>
                    {brand.phone}
                  </a>
                </li>
              )}
              {!brand.email && !brand.phone && !location && (
                <li className="text-muted-foreground">
                  School contact details appear here once leadership saves branding in Principal →
                  Go-live.
                </li>
              )}
            </ul>
          </div>
          <Card className="bg-navy text-white border-0">
            <CardContent className="pt-6 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-300">
                School suite
              </p>
              <h3 className="text-xl font-bold">Sign in to Beacon</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Teachers, staff, parents, and leadership use one platform for {brand.name}.
              </p>
              <Link href="/login">
                <Button className="bg-sky-500 hover:bg-sky-400 text-white">Open Beacon →</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground pb-safe">
        <p className="font-semibold text-foreground">{brand.name}</p>
        <p className="mt-1">
          Powered by Beacon ·{' '}
          <Link href="/about" className="text-sky-700 hover:underline">
            About the suite
          </Link>
          {brand.websiteUrl && (
            <>
              {' · '}
              <a
                href={brand.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sky-700 hover:underline"
              >
                Official website
              </a>
            </>
          )}
        </p>
        <p className="mt-2">© {new Date().getFullYear()} {brand.name}</p>
      </footer>
    </div>
  )
}
