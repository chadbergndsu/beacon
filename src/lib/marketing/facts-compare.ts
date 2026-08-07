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
    'No — FACTS is a Nelnet (NYSE: NNI) commercial brand, not a Christian ministry.',
  /** Long form for FAQ / SEO */
  detail:
    'FACTS is education technology and tuition software owned by Nelnet, a publicly traded company. It markets heavily to private, Catholic, and other faith-based schools, and has folded faith-market products into the FACTS brand — but FACTS itself is not a church, denomination, or Christian organization. Beacon is stewarded by Common Cents IP as a volunteer ministry: income from other schools is directed to teacher salaries, tuition support, and principal care.',
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
    facts: 'Nelnet, Inc. (NYSE: NNI) — commercial ed-tech / tuition brand',
    beacon: 'Common Cents IP — volunteer ministry stewardship; school-owned data',
    edge: 'beacon',
  },
  {
    dimension: 'Faith identity',
    facts: 'Sells into Christian & Catholic schools; not itself a Christian ministry',
    beacon: 'Built for independent & faith-based communities; ministry-stewarded, not a public-company suite',
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
    beacon: 'Notes from school, Dinner Table Digest, logged email replies — one conversation, school-owned',
    edge: 'beacon',
  },
  {
    dimension: 'Communications',
    facts: 'Alerts and portals; delivery can feel like a black hole to the office',
    beacon: 'Family Desk: every send logged, parent replies captured, staff can reply from Comms',
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
  'Families shouldn’t need two apps and a prayer to find grades and tuition.',
  'If your office can’t prove an email landed — and a parent reply came back — you don’t have communications.',
  'Tuition can stay optional until you’re ready. Clarity for families can’t wait.',
  'Your school’s mission is Christian. Your vendor doesn’t have to be a Wall Street ticker.',
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
      'Beacon is a FACTS alternative aimed at independent and faith-based schools that want Family Desk communications, Dinner Table Digests, and school-owned academics — without pretending to out-module FACTS on financial aid and collections. Many schools keep FACTS tuition for a season and still move family communications and grades onto Beacon.',
  },
  {
    question: 'Is RenWeb the same as FACTS?',
    answer:
      'RenWeb was absorbed into the FACTS SIS product line. Schools still search “RenWeb alternative” when they want a calmer parent experience. Beacon is built as that communications-first alternative — not a clone of every RenWeb module.',
  },
  {
    question: 'Can we leave FACTS Family App without ripping out tuition?',
    answer:
      'Yes for many pilots. Start with academics and Family Desk (notes home, logged replies, Dinner Table Digest). Add school-owned pay links and QuickBooks when you’re ready. Beacon does not require a BillerGenie-style money path.',
  },
  {
    question: 'Who makes Beacon?',
    answer:
      'Beacon is created by Common Cents IP as a volunteer ministry under the leadership of Chris Cowan. Income from using Beacon for other schools is distributed to help teacher salaries, tuition support, and one annual vacation for the principal.',
  },
]
