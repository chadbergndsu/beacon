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

export const COMPARE_ROWS: CompareRow[] = [
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
] as const
