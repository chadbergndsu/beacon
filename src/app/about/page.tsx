import Link from 'next/link'
import { Heart, School, Shield, Sparkles, HandHeart } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { loadSchoolBrand } from '@/lib/school-brand'

export default async function AboutPage() {
  const brand = await loadSchoolBrand(null)

  return (
    <div className="min-h-screen beacon-shell">
      <header className="border-b border-border/80 bg-navy text-navy-foreground">
        <div className="mx-auto max-w-2xl px-4 py-4 flex items-center justify-between">
          <Link href="/login" className="flex items-center gap-2.5 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-sm text-white">
              B
            </span>
            Beacon
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-sky-200 hover:text-white transition"
          >
            Sign in →
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-8 animate-beacon-in px-4 py-10">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
            About Beacon
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-navy dark:text-sky-50">
            The full school suite — for any school
          </h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Not “just another gradebook.” Beacon is the operating system for schools: academics,
            family communications, principal operations, and tuition payments — Jupiter-familiar
            where teachers need speed, cleaner than Blackbaud where families need clarity.
          </p>
        </div>

        <Card className="overflow-hidden border-sky-100 dark:border-sky-900/40 shadow-[var(--shadow-lift)]">
          <div className="bg-gradient-to-r from-navy via-slate-900 to-sky-900 px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500 font-black text-lg shadow-lg shadow-sky-500/30">
                B
              </span>
              <div>
                <p className="font-bold text-lg leading-tight">Beacon</p>
                <p className="text-xs text-sky-200/90 mt-0.5">
                  Multi-school ready · Currently serving {brand.name}
                </p>
              </div>
            </div>
          </div>
          <CardContent className="pt-6 space-y-5">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-navy dark:text-sky-50">What makes it different</h2>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Dinner Table Digest, Conference Brief, Beacon Pulse, and Beacon Signal — products
                  parents and principals actually use, not another portal of tables.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <School className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold tracking-tight">Your school’s brand</h2>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  School name, mission, contact, and website come from your school record — so Beacon
                  looks like <strong className="text-foreground">{brand.name}</strong>, not a demo
                  for someone else.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-navy dark:text-sky-50">Trust & access</h2>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Parents only see linked students. Staff are scoped by school. Email and QuickBooks
                  modes are labeled (live vs log-only / sandbox) so leadership never ships a surprise.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-sky-200/80 dark:border-sky-900/50 bg-sky-50/40 dark:bg-sky-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <HandHeart className="h-5 w-5 text-sky-700 dark:text-sky-300 mt-0.5 shrink-0" />
              <div className="space-y-2 text-sm leading-relaxed">
                <h2 className="font-semibold text-navy dark:text-sky-50">Stewardship & origin</h2>
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Beacon is created by CommonCentsIP as a
                  volunteer ministry.</strong>{' '}
                  This system was developed under the leadership of Chris Cowan.
                </p>
                <p className="text-muted-foreground">
                  All income generated by using Beacon for other schools is distributed to help with
                  teacher salaries, tuition support, and for 1 annual vacation for the principal.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Heart className="h-5 w-5 text-sky-600 mt-0.5 shrink-0" />
              <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                <p>
                  <strong className="text-foreground">The full suite:</strong> teachers get fast
                  grade entry; parents get transparent calculations; the principal gets operations,
                  tuition, and QuickBooks — one Beacon, not five logins.
                </p>
                <ul className="space-y-1 pt-1 text-sm text-muted-foreground">
                  <li>Transparent grades · Dinner Table Digest · Conference Brief</li>
                  <li>Beacon Pulse · Beacon Signal · Teacher Quick Mode</li>
                  <li>School-owned tuition · QuickBooks when you connect it</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm flex flex-wrap justify-center gap-4">
          <Link href="/school" className="font-semibold text-sky-700 hover:underline">
            {brand.shortName} school site
          </Link>
          <Link href="/login" className="font-semibold text-sky-700 hover:underline">
            Sign in to Beacon →
          </Link>
        </p>
      </div>
    </div>
  )
}
