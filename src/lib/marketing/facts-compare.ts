/**
 * Honest FACTS comparison — marketing + /vs/facts SEO.
 * Prefer product truth over hype; never invent capabilities Beacon lacks.
 */

export type CompareRow = {
  dimension: string
  facts: string
  beacon: string
  edge: 'beacon' | 'facts' | 'split'
}

export const FACTS_SCALE = {
  schools: '15,000+',
  families: '2M+',
  note: 'Vendor-claimed scale (FACTS / Nelnet). Includes tuition + SIS customers.',
} as const

/**
 * FACTS is a commercial Nelnet brand that sells into faith-based schools.
 * It is not a church, denomination, or Christian ministry.
 */
export const FACTS_ORG = {
  brand: 'FACTS',
  parent: 'Nelnet, Inc.',
  ticker: 'NYSE: NNI',
  isChristianOrganization: false as const,
  /** One-line for UI */
  blunt:
    'No — FACTS is Nelnet (NYSE: NNI), a publicly traded company. Not a Christian school. Not a ministry.',
  /** Long form for FAQ / SEO */
  detail:
    'FACTS is education technology and tuition software owned by Nelnet, Inc., a publicly traded company (NYSE: NNI). It markets heavily to private, Catholic, and other faith-based schools — but FACTS itself is not a church, denomination, or Christian organization. Beacon is different: a Christian school tool built by a Christian school, stewarded by Common Cents IP as a volunteer ministry. Income from other schools goes to teacher salaries, tuition support, and principal care — not Wall Street.',
} as const

/** High-intent search phrases we want /vs/facts and the landing to own */
export const FACTS_SEO_KEYWORDS = [
  'Beacon vs FACTS',
  'FACTS alternative',
  'FACTS alternative for Christian schools',
  'FACTS SIS alternative',
  'RenWeb alternative',
  'FACTS Family App alternative',
  'leave FACTS school software',
  'Christian school management software',
  'Christian school SIS',
  'faith-based school software',
  'private school portal alternative',
  'FACTS Nelnet alternative',
  'school family communication software',
  'Dinner Table Digest',
] as const

export const COMPARE_ROWS: CompareRow[] = [
  {
    dimension: 'Who owns it',
    facts: 'Nelnet, Inc. (NYSE: NNI) — publicly traded ed-tech / tuition brand (Wall Street, not a school)',
    beacon:
      'Common Cents IP volunteer ministry — a Christian school tool built by a Christian school',
    edge: 'beacon',
  },
  {
    dimension: 'Faith identity',
    facts: 'Sells into Christian & Catholic schools; not itself a Christian ministry or church',
    beacon:
      'Built inside a Christian school for Christian & independent schools — ministry-stewarded, not a ticker',
    edge: 'beacon',
  },
  {
    dimension: 'Who it’s built for',
    facts: 'Private & faith-based schools at national scale; tuition-first heritage',
    beacon: 'Independent schools that want calm ops and families who actually open the app',
    edge: 'split',
  },
  {
    dimension: 'Family experience',
    facts: 'Family App + modules; parents often juggle SIS vs tuition portals; app store friction is common',
    beacon: 'Dinner Table Digest, transparent grades, school-owned pay links — calm for families',
    edge: 'beacon',
  },
  {
    dimension: 'Communications',
    facts: 'Alerts and portals; delivery can feel like a black hole to the office',
    beacon: 'School compose + Dinner Table Digest email — messages your office can actually stand behind',
    edge: 'beacon',
  },
  {
    dimension: 'Tuition & aid',
    facts: 'Industry default for payment plans, aid, incidental billing, collections',
    beacon: 'School-owned invoices + optional Stripe Checkout; QuickBooks push — not a third-party biller lock-in',
    edge: 'facts',
  },
  {
    dimension: 'Product honesty',
    facts: 'Suite of quoted modules; peak-season support strain is a frequent complaint',
    beacon: 'Email/payments labeled live vs log-only; auth fails closed; Go-live health you can see',
    edge: 'beacon',
  },
  {
    dimension: 'Data ownership',
    facts: 'Platform ecosystem under Nelnet; switching means migrating a large footprint',
    beacon: 'You own the Postgres schema in-repo; school_id tenancy; no BillerGenie-style money path',
    edge: 'beacon',
  },
  {
    dimension: 'Academics day-to-day',
    facts: 'Full SIS (attendance, grading, scheduling) — mature but often feels dated vs newer tools',
    beacon: 'Transparent grades, Missing Work Radar, Teacher Quick Mode, Pulse, Conference Brief',
    edge: 'split',
  },
]

export const BEACON_ATTACK_LINES = [
  'A Christian school tool built by a Christian school — not a publicly traded suite from Wall Street.',
  'Families shouldn’t need two apps and a prayer to find grades and tuition.',
  'If your office can’t prove an email landed — and a parent reply came back — you don’t have communications.',
  'Your school’s mission is Christian. Your vendor doesn’t have to be a New York ticker.',
] as const

export type FactsFaq = { question: string; answer: string }

/** FAQ copy + FAQPage JSON-LD — answer search intent head-on */
export const FACTS_FAQS: FactsFaq[] = [
  {
    question: 'Is FACTS a Christian organization?',
    answer: FACTS_ORG.detail,
  },
  {
    question: 'What is a good FACTS alternative for Christian schools?',
    answer:
      'Beacon is a FACTS alternative built by a Christian school for Christian and independent schools: Dinner Table Digests, transparent grades, and school-owned billing — without pretending to out-module FACTS on financial aid and collections. Many schools keep FACTS tuition for a season and still move family academics onto Beacon.',
  },
  {
    question: 'Is RenWeb the same as FACTS?',
    answer:
      'RenWeb was absorbed into the FACTS SIS product line. Schools still search “RenWeb alternative” when they want a calmer parent experience. Beacon is built as that communications-first alternative — not a clone of every RenWeb module.',
  },
  {
    question: 'Can we leave FACTS Family App without ripping out tuition?',
    answer:
      'Yes for many pilots. Start with academics and parent-facing digests. Add school-owned pay links and QuickBooks when you’re ready. Beacon does not require a third-party biller lock-in.',
  },
  {
    question: 'Who makes Beacon?',
    answer:
      'Beacon is a Christian school tool built by a Christian school — created by Common Cents IP as a volunteer ministry under the leadership of Chris Cowan. Income from using Beacon for other schools helps teacher salaries, tuition support, and one annual vacation for the principal. It is not a publicly traded New York ed-tech company.',
  },
]
