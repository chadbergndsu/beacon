import Link from 'next/link'
import {
  Award,
  BookOpen,
  Calendar,
  Church,
  ExternalLink,
  GraduationCap,
  Heart,
  Mail,
  MapPin,
  Music,
  Phone,
  Sparkles,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const CALENDLY = 'https://calendly.com/kristin-txy/30min'
const CALENDLY_ALT = 'https://calendly.com/lcadawsonville/'
const OFFICIAL = 'https://lcadawsonville.com'
const CALENDAR_PDF =
  'https://lcadawsonville.com/wp-content/uploads/2025/07/2025-2026.pdf'
const ELEM_SUPPLY =
  'https://lcadawsonville.com/wp-content/uploads/2024/07/Elementary_SchoolSupply_24-25_LCA.pdf'
const HS_SUPPLY =
  'https://lcadawsonville.com/wp-content/uploads/2024/07/JR-HS_SchoolSupply_24-25_LCA.pdf'

const extracurricular = [
  'Sports',
  'Media',
  'Foreign language',
  'Music',
  'Drama',
  'Yearbook',
  'Newspaper',
  'Home economics',
  'Field trips',
  'Senior trip',
  'Dual enrollment',
  'Mission opportunities',
]

export default function SchoolWebsitePage() {
  return (
    <div className="min-h-screen beacon-shell text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-navy/95 text-navy-foreground backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-sm font-black text-white shadow-lg shadow-sky-500/25">
              L
            </span>
            <div>
              <p className="font-bold tracking-tight text-[15px] leading-none">
                Lighthouse Christian Academy
              </p>
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-sky-300/90 mt-1">
                Dawsonville, Georgia · K4–12
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <a href="#about" className="rounded-lg px-3 py-2 text-slate-200 hover:bg-white/10">
              About
            </a>
            <a href="#tuition" className="rounded-lg px-3 py-2 text-slate-200 hover:bg-white/10">
              Tuition
            </a>
            <a href="#enroll" className="rounded-lg px-3 py-2 text-slate-200 hover:bg-white/10">
              Enroll
            </a>
            <a href="#contact" className="rounded-lg px-3 py-2 text-slate-200 hover:bg-white/10">
              Contact
            </a>
            <a
              href={OFFICIAL}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg px-3 py-2 text-slate-200 hover:bg-white/10 inline-flex items-center gap-1"
            >
              Official site <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <Link
              href="/login"
              className="rounded-xl bg-sky-500 px-3.5 py-2 font-semibold text-white hover:bg-sky-400"
            >
              Beacon portal
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-slate-900 to-sky-900" />
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-sky-600/15 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24 text-white">
          <Badge className="bg-sky-500/20 text-sky-100 border-sky-400/30 mb-4">
            Ministry of Lighthouse Baptist Church
          </Badge>
          <h1 className="max-w-3xl text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1]">
            Lighthouse Christian Academy
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-200 leading-relaxed">
            Our mission is to train and influence the next generation to strive for excellence,
            never settle for mediocrity, and shake the world with the Gospel of Jesus Christ.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={CALENDLY} target="_blank" rel="noreferrer">
              <Button size="lg" className="shadow-lg shadow-sky-500/30">
                Schedule a tour
              </Button>
            </a>
            <a href="#enroll">
              <Button
                size="lg"
                variant="outline"
                className="border-white/25 bg-white/10 text-white hover:bg-white/15 hover:text-white"
              >
                Now enrolling 2025–2026
              </Button>
            </a>
          </div>
          <p className="mt-6 text-sm text-sky-200/80">
            Private Christian school · Dawsonville, GA · Grades K4–12 · Abeka curriculum
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 -mt-10 relative z-10">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="shadow-[var(--shadow-lift)]">
            <CardContent className="pt-6 flex gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Best of Dawson
                </p>
                <p className="font-bold text-navy dark:text-sky-50 text-lg leading-tight">
                  Five years in a row
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Voted Best Private School of Dawson County
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-[var(--shadow-lift)]">
            <CardContent className="pt-6 flex gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Student : Teacher
                </p>
                <p className="font-bold text-navy dark:text-sky-50 text-lg leading-tight">
                  Nine : One
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Personal, encouraging classrooms
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-[var(--shadow-lift)]">
            <CardContent className="pt-6 flex gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Tuition
                </p>
                <p className="font-bold text-navy dark:text-sky-50 text-lg leading-tight">
                  $6,795 / year
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Multi-student &amp; church member discounts
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Best of Dawson + ratio detail */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 grid gap-8 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-6 space-y-3">
            <Badge variant="warning">Community honor</Badge>
            <h2 className="text-2xl font-bold text-navy dark:text-sky-50">
              Best of Dawson — five years in a row
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We have been honored to be voted Best Private School of Dawson County for the last
              five years. Our wonderful staff and incredibly supportive parents have created a
              culture that is welcoming and facilitates growth in so many areas.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 space-y-3">
            <Badge variant="sky">NINE : ONE</Badge>
            <h2 className="text-2xl font-bold text-navy dark:text-sky-50">
              Student-to-teacher ratio
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              At LCA, we strive to make sure our student-to-teacher ratio is optimal to help our
              students in a personal and encouraging way while encouraging each student to excel
              within the classroom with purposeful and practical methods.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Welcome */}
      <section id="about" className="bg-card border-y border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
              Welcome to LCA
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-navy dark:text-sky-50">
              Christ-centered education, K4 through 12th grade
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed text-lg">
              Lighthouse Christian Academy, a private school and a ministry of Lighthouse Baptist
              Church in Dawsonville, Georgia, serves grades K4–12. We use Abeka Christian School
              materials in traditional classroom settings. Our elementary, middle, and high school
              teachers hold qualified degrees, have strong Christian character, and a passion to
              guide students to realize their God-given potential.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: Church,
                title: 'Church ministry',
                body: 'A ministry of Lighthouse Baptist Church, Dawsonville, GA.',
              },
              {
                icon: BookOpen,
                title: 'Abeka curriculum',
                body: 'Traditional classrooms with proven Christian school materials.',
              },
              {
                icon: Heart,
                title: 'Called teachers',
                body: 'Qualified degrees, Christian character, passion for every student.',
              },
            ].map((item) => (
              <Card key={item.title} className="bg-background">
                <CardContent className="pt-5">
                  <item.icon className="h-5 w-5 text-sky-600 mb-2" />
                  <h3 className="font-semibold text-navy dark:text-sky-50">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{item.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Tuition */}
      <section id="tuition" className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
        <div className="grid gap-8 lg:grid-cols-2 items-start">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
              Tuition
            </p>
            <h2 className="mt-2 text-3xl font-bold text-navy dark:text-sky-50">
              Competitive, family-friendly pricing
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              We are offering an extremely competitive tuition rate of{' '}
              <strong className="text-foreground">$6,795 per year</strong>. We have a{' '}
              <strong className="text-foreground">multi-student discount</strong> available for all
              families with multiple students as well as a{' '}
              <strong className="text-foreground">church member discount</strong> for Lighthouse
              Baptist Church member families.
            </p>
          </div>
          <Card className="border-sky-100 shadow-[var(--shadow-lift)]">
            <CardContent className="pt-6">
              <p className="text-sm font-semibold text-muted-foreground">Annual tuition</p>
              <p className="text-4xl font-black tabular-nums text-navy dark:text-sky-50 mt-1">
                $6,795
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <Sparkles className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                  Multi-student family discount
                </li>
                <li className="flex gap-2">
                  <Sparkles className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                  Lighthouse Baptist Church member discount
                </li>
              </ul>
              <a href={CALENDLY} target="_blank" rel="noreferrer" className="mt-6 inline-block">
                <Button>Talk with us about enrollment</Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Enroll */}
      <section id="enroll" className="bg-navy text-navy-foreground">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
          <div className="max-w-2xl">
            <Badge className="bg-sky-500/20 text-sky-100 border-sky-400/30">
              Now enrolling
            </Badge>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">2025–2026 school year</h2>
            <p className="mt-3 text-slate-300 leading-relaxed">
              Enrollment for the 2025–2026 school year is open. Schedule a school tour or meeting
              with our principal to learn more.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={CALENDLY} target="_blank" rel="noreferrer">
              <Button size="lg">Schedule appointment</Button>
            </a>
            <a href={CALENDAR_PDF} target="_blank" rel="noreferrer">
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
              >
                <Calendar className="h-4 w-4" />
                2025–2026 Calendar
              </Button>
            </a>
            <a href={ELEM_SUPPLY} target="_blank" rel="noreferrer">
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
              >
                Elementary supply list
              </Button>
            </a>
            <a href={HS_SUPPLY} target="_blank" rel="noreferrer">
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
              >
                JH / HS supply list
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Extracurricular */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
        <div className="flex items-center gap-2 mb-2">
          <Music className="h-5 w-5 text-sky-600" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
            Extracurricular
          </p>
        </div>
        <h2 className="text-3xl font-bold text-navy dark:text-sky-50">
          Activities &amp; electives
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Activities and electives will include sports, media, foreign language, music, drama,
          yearbook, newspaper, home economics, field trips, senior trip, dual enrollment, potential
          mission opportunities and more.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {extracurricular.map((item) => (
            <Badge key={item} variant="sky" className="px-3 py-1 text-sm font-medium">
              {item}
            </Badge>
          ))}
        </div>
      </section>

      {/* Tour CTA */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-8">
        <Card className="overflow-hidden border-sky-100 shadow-[var(--shadow-lift)]">
          <div className="grid lg:grid-cols-2">
            <div className="bg-gradient-to-br from-sky-600 to-navy p-8 sm:p-10 text-white">
              <h2 className="text-2xl font-bold">Schedule a tour</h2>
              <p className="mt-3 text-sky-100 leading-relaxed">
                School tours are open. Walk our halls, meet our team, and see if LCA is the right
                fit for your family.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <a href={CALENDLY} target="_blank" rel="noreferrer">
                  <Button className="bg-white text-navy hover:bg-sky-50">
                    Schedule walk-through
                  </Button>
                </a>
                <a href={CALENDLY_ALT} target="_blank" rel="noreferrer">
                  <Button
                    variant="outline"
                    className="border-white/30 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                  >
                    Principal meeting
                  </Button>
                </a>
              </div>
            </div>
            <div id="contact" className="p-8 sm:p-10 bg-card">
              <h3 className="font-bold text-navy dark:text-sky-50 text-lg">Contact</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Office hours: <strong className="text-foreground">8:00 am – 3:00 pm</strong>, Monday
                through Friday. Reach us by phone, email, or Facebook Messenger.
              </p>
              <ul className="mt-5 space-y-3 text-sm">
                <li>
                  <a
                    href="tel:7067054459"
                    className="inline-flex items-center gap-2 font-medium text-sky-800 hover:underline dark:text-sky-300"
                  >
                    <Phone className="h-4 w-4" />
                    (706) 705-4459
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:office@lcadawsonville.com"
                    className="inline-flex items-center gap-2 font-medium text-sky-800 hover:underline dark:text-sky-300"
                  >
                    <Mail className="h-4 w-4" />
                    office@lcadawsonville.com
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.facebook.com/LCADawsonville"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 font-medium text-sky-800 hover:underline dark:text-sky-300"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Facebook · LCA Dawsonville
                  </a>
                </li>
                <li className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-sky-600" />
                  Dawsonville, Georgia · Ministry of Lighthouse Baptist Church
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 flex flex-col sm:flex-row flex-wrap gap-6 justify-between">
          <div>
            <p className="font-bold text-navy dark:text-sky-50">Lighthouse Christian Academy</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Modern site preview powered by Beacon. Same information as the official school
              website — clearer layout for families.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <a
              href={OFFICIAL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-semibold text-sky-700 hover:underline"
            >
              Official website · lcadawsonville.com
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <Link href="/login" className="font-medium text-muted-foreground hover:text-sky-700">
              Beacon school suite portal →
            </Link>
            <Link href="/about" className="font-medium text-muted-foreground hover:text-sky-700">
              About Beacon
            </Link>
          </div>
        </div>
        <div className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Lighthouse Christian Academy · Dawsonville, GA · Content
          from{' '}
          <a href={OFFICIAL} className="underline hover:text-sky-700" target="_blank" rel="noreferrer">
            lcadawsonville.com
          </a>
        </div>
      </footer>
    </div>
  )
}
