import Link from 'next/link'
import { Heart, School, Sparkles, Umbrella } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function AboutPage() {
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
            Built for Lighthouse — under the direction of Chris Cowan
          </h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Beacon is a modern gradebook designed for schools that want Jupiter-level simplicity,
            cleaner speed, and something Blackbaud never quite nailed: grades parents can actually
            understand.
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
                  Lighthouse Christian Academy · Gradebook
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
                <h2 className="font-semibold text-navy dark:text-sky-50">Leadership</h2>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  This app was built under the direction of{' '}
                  <strong className="text-foreground">Chris Cowan</strong> — the vision,
                  priorities, and push to make grades transparent for families and effortless for
                  teachers.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <School className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-navy dark:text-sky-50">Where the profit goes</h2>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  All profit from Beacon is used to help fund{' '}
                  <strong className="text-foreground">LBC teacher salaries</strong> and{' '}
                  <strong className="text-foreground">student tuition</strong> — so the platform
                  serves the school long after the first demo.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                <Umbrella className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-navy dark:text-sky-50">And yes — Chris</h2>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  A small portion is also set aside for{' '}
                  <strong className="text-foreground">small vacations for Chris</strong>. Leadership
                  is hard. Occasional rest is part of stewardship. (We&apos;re not sorry.)
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
                  <strong className="text-foreground">What makes Beacon different:</strong> teachers
                  get a fast, familiar gradebook; parents get a crystal-clear “how this grade was
                  calculated” view — not a black box.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="sky">Transparent grades</Badge>
                  <Badge variant="sky">Teacher-first entry</Badge>
                  <Badge variant="sky">Built for Lighthouse</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm">
          <Link href="/login" className="font-semibold text-sky-700 hover:underline">
            Sign in to Beacon →
          </Link>
        </p>
      </div>
    </div>
  )
}
