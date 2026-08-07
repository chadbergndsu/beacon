import type { BlogPost } from './types.draft'
import { h2, p, quote, ul } from './types.draft'

/**
 * DRAFT — not wired to the app. See docs/marketing-plan.md.
 * Add posts here — keep honest; never invent Beacon capabilities.
 */
export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'corporate-america-christian-schools-facts',
    title: 'Corporate America Is Taking Advantage of Christian Schools. That’s the FACTS.',
    description:
      'FACTS is Nelnet (NYSE: NNI) — not a ministry. How public-company ed-tech sells into Christian schools, and what a ministry-stewarded alternative looks like.',
    publishedAt: '2026-08-01',
    keywords: [
      'FACTS Christian schools',
      'Nelnet FACTS',
      'corporate edtech Christian schools',
      'FACTS alternative',
      'Christian school software',
    ],
    tags: ['FACTS', 'Christian schools', 'stewardship'],
    excerpt:
      'Your school’s mission is Kingdom work. Your SIS vendor may be a Wall Street ticker. Here’s the blunt version — and a better path.',
    body: [
      p(
        'Yes, the pun is intentional. The pattern is not funny: Christian schools pour tuition dollars, staff time, and parent goodwill into platforms owned by corporate America — then wonder why families still feel lost in a portal.'
      ),
      p(
        'FACTS is a Nelnet company (NYSE: NNI). It markets hard into private and faith-based schools. That is a business model, not a calling. Selling into the Church is not the same as being of the Church.'
      ),
      h2('What “taking advantage” looks like in practice'),
      ul([
        'Tuition and SIS sold as inseparable — switching feels like ripping out the plumbing',
        'Family apps and portals that parents open less every year',
        'Office staff who cannot prove a message landed or a parent replied',
        'Peak-season support strain when your school’s calendar is already on fire',
        'A product roadmap optimized for national scale, not your 180 families',
      ]),
      p(
        'None of that requires conspiracy. Public companies optimize for scale and revenue. Christian schools optimize for discipleship, academics, and trust. When those incentives diverge, the school usually loses quietly — one ignored notification at a time.'
      ),
      h2('Beacon’s stance'),
      p(
        'Beacon is stewarded by Common Cents IP as a volunteer ministry. We are not pretending to out-module FACTS on financial aid and collections. We are going after the wound schools feel every week: families do not open the portal, and the office cannot prove communications landed.'
      ),
      quote(
        'Your school’s mission is Christian. Your vendor doesn’t have to be a Wall Street ticker.'
      ),
      p(
        'Read the honest side-by-side at Beacon vs FACTS, then tell us if you’re ready for a calmer family layer — even if tuition stays on FACTS for a season.'
      ),
    ],
  },
  {
    slug: 'is-facts-a-christian-organization',
    title: 'Is FACTS a Christian Organization? (Short Answer: No)',
    description:
      'Is FACTS Christian? No. FACTS is Nelnet commercial software that sells into faith-based schools. What that means for Christian school buyers.',
    publishedAt: '2026-08-02',
    keywords: [
      'Is FACTS a Christian organization',
      'Is FACTS Christian',
      'FACTS Nelnet Christian',
      'faith-based school software',
    ],
    tags: ['FACTS', 'FAQ'],
    excerpt:
      'Parents and boards ask this constantly. Here is the clear answer — and why it matters for stewardship.',
    body: [
      p(
        'Short answer: no. FACTS is not a church, denomination, or Christian ministry. It is education technology and tuition software under Nelnet, Inc., a publicly traded company (NYSE: NNI).'
      ),
      h2('Then why does it feel “Christian”?'),
      p(
        'Because the customer base is. Catholic schools, Protestant independents, and other faith-based communities are core markets. FACTS has also folded faith-market products into its brand umbrella. Marketing to Christians is not the same as being a Christian organization.'
      ),
      h2('Why the distinction matters'),
      p(
        'Boards approve contracts with spiritual language in the pitch deck. Families assume the vendor “gets” them. Meanwhile product decisions still answer to commercial scale. If your school’s values include transparency, human communication, and stewardship of tuition dollars, evaluate the vendor on those outcomes — not on how many Christian schools are on the logo wall.'
      ),
      p(
        'Beacon is ministry-stewarded. Income from other schools is directed toward teacher salaries, tuition support, and principal care. Compare us on Family Desk and honesty labels (live vs log-only) — not on who has more national webinars.'
      ),
    ],
  },
  {
    slug: 'renweb-alternative-christian-schools',
    title: 'Looking for a RenWeb Alternative? RenWeb Became FACTS SIS',
    description:
      'RenWeb alternative for Christian schools: RenWeb was absorbed into FACTS SIS (Nelnet). What to look for if parents still hate the portal.',
    publishedAt: '2026-08-02',
    keywords: [
      'RenWeb alternative',
      'RenWeb alternative Christian school',
      'replace RenWeb',
      'FACTS SIS alternative',
    ],
    tags: ['RenWeb', 'FACTS'],
    excerpt:
      'If you’re still googling RenWeb, you’re usually already on FACTS — with the same family fatigue.',
    body: [
      p(
        'RenWeb did not vanish into history. It was absorbed into the FACTS SIS product line. Schools still search “RenWeb alternative” because the parent experience never stopped hurting.'
      ),
      h2('What Christian schools usually want next'),
      ul([
        'One calm place for grades and notes — not two portals and a prayer',
        'Messages that log delivery and capture parent replies',
        'Something parents will actually open at the dinner table',
        'Permission to keep FACTS tuition while fixing communications',
      ]),
      p(
        'Beacon is built as that communications-first RenWeb / FACTS alternative. Academics and Family Desk first. School-owned pay links when you’re ready. See our RenWeb alternative page and the full Beacon vs FACTS compare.'
      ),
    ],
  },
  {
    slug: 'facts-family-app-portal-black-hole',
    title: 'The FACTS Family App Problem: When the Portal Becomes a Black Hole',
    description:
      'FACTS Family App friction is real for many schools. Why offices can’t prove messages landed — and how Family Desk fixes the black hole.',
    publishedAt: '2026-08-03',
    keywords: [
      'FACTS Family App',
      'FACTS Family App alternative',
      'school portal parents don’t open',
      'school parent communication',
    ],
    tags: ['Family App', 'communications'],
    excerpt:
      'If your office can’t prove an email landed — and a reply came back — you don’t have communications. You have hope.',
    body: [
      p(
        'App-store friction. Dual portals. Alerts that feel like noise. Christian school offices know the pattern: you sent it, somehow, and still get “we never heard.”'
      ),
      h2('Black hole symptoms'),
      ul([
        'Parents ask in the car line about something you already emailed',
        'Replies land in a personal inbox and never become a school record',
        'Teachers invent side channels (GroupMe, texts) that leadership can’t see',
        'You can’t tell live delivery from “we logged that we tried”',
      ]),
      p(
        'Beacon’s Family Desk treats school→family notes as a conversation: logged outbound, captured inbound replies, staff reply from Comms. Dinner Table Digest turns the week into a 60-second story parents can talk about at supper — not another table of scores.'
      ),
      quote('If your office can’t prove an email landed — and a parent reply came back — you don’t have communications.'),
    ],
  },
  {
    slug: 'keep-facts-tuition-leave-family-portal',
    title: 'Keep FACTS Tuition for a Season — Fix the Family Layer Now',
    description:
      'You don’t have to rip out FACTS tuition to improve parent experience. How Christian schools pilot Beacon academics + Family Desk alongside FACTS.',
    publishedAt: '2026-08-03',
    keywords: [
      'leave FACTS Family App',
      'FACTS tuition keep',
      'FACTS alternative communications',
      'Christian school pilot software',
    ],
    tags: ['migration', 'FACTS'],
    excerpt:
      'Rip-and-replace is how vendors win. Layered pilots are how schools stay sane.',
    body: [
      p(
        'FACTS still wins on payment plans, aid, and collections depth for many schools. Pretending otherwise helps nobody. The mistake is assuming family communications must stay trapped in the same suite.'
      ),
      h2('A sane pilot sequence'),
      ul([
        'Move grades + Missing Work Radar + teacher Quick Mode onto Beacon',
        'Turn on Family Desk notes and parent reply capture',
        'Ship Dinner Table Digests so parents open something weekly',
        'Add school-owned pay links / QuickBooks when leadership is ready',
      ]),
      p(
        'Corporate suites love all-or-nothing contracts. Christian stewardship often looks like phased obedience to reality: fix trust with families first, renegotiate money rails when the board has bandwidth.'
      ),
    ],
  },
  {
    slug: 'nelnet-facts-christian-school-stewardship',
    title: 'Nelnet, FACTS, and Christian School Stewardship',
    description:
      'What NYSE:NNI ownership means when your Christian school buys FACTS. Stewardship questions boards should ask before renewing.',
    publishedAt: '2026-08-04',
    keywords: [
      'Nelnet FACTS Christian school',
      'FACTS stewardship',
      'Christian school board software',
      'FACTS contract renewal',
    ],
    tags: ['stewardship', 'boards'],
    excerpt:
      'Boards don’t need a vendor sermon. They need clearer questions before another three-year renewal.',
    body: [
      p(
        'Nelnet is a public company. FACTS is its K–12 brand. Your school is a ministry with a budget. Those are different accountability structures — and that is fine, as long as you stop confusing a sales motion with shared mission.'
      ),
      h2('Questions for the next renewal'),
      ul([
        'Do parents open the family app weekly without bribery?',
        'Can we audit message delivery and replies without exporting CSV archaeology?',
        'What breaks if we move communications off-suite while tuition stays?',
        'Are we paying for modules nobody uses because “it’s included”?',
        'Does live vs sandbox/log-only status show up where leadership can see it?',
      ]),
      p(
        'Beacon publishes go-live honesty on email and payments. We would rather lose a deal than ship a surprise. That is a stewardship choice — and it is how we compete with corporate America without mirroring it.'
      ),
    ],
  },
  {
    slug: 'dinner-table-digest-vs-school-portals',
    title: 'Dinner Table Digest vs Portals of Tables',
    description:
      'Why Christian school parents ignore portals — and how Dinner Table Digest turns grades into a conversation families will have.',
    publishedAt: '2026-08-04',
    keywords: [
      'Dinner Table Digest',
      'school portal alternative',
      'parent engagement Christian school',
      'family communication grades',
    ],
    tags: ['Dinner Table Digest', 'parents'],
    excerpt:
      'Portals report. Digests invite. Only one belongs at supper.',
    body: [
      p(
        'Corporate SIS products got very good at tables: scores, standards, attendance grids. Families got very good at ignoring them. Christian homes already fight for attention at dinner. Another login is not discipleship.'
      ),
      h2('What a digest does differently'),
      p(
        'Beacon’s Dinner Table Digest is a short, plain-English story of the week — conversation starters parents can use without decoding a gradebook. Pair it with Family Desk notes and you stop treating “we posted it in the portal” as pastoral care.'
      ),
      p(
        'This is the product wedge against FACTS-scale portals: not more modules — more moments families actually open.'
      ),
    ],
  },
  {
    slug: 'christian-school-sis-lock-in',
    title: 'SIS Lock-In at Christian Schools: How It Happens Quietly',
    description:
      'How Christian schools get locked into FACTS/RenWeb-style suites — tuition, SIS, and family app — and how to unwind without a crisis.',
    publishedAt: '2026-08-05',
    keywords: [
      'school software lock-in',
      'FACTS lock-in',
      'Christian school SIS',
      'leave FACTS school',
    ],
    tags: ['lock-in', 'FACTS'],
    excerpt:
      'Lock-in rarely arrives as a villain speech. It arrives as “everything is already connected.”',
    body: [
      p(
        'First you buy tuition management. Then attendance. Then the family app “so parents have one place.” Five years later, leaving feels like relocating the building.'
      ),
      h2('How to loosen the grip'),
      ul([
        'Name the jobs: money rails vs academics vs family conversation',
        'Refuse the myth that all three must share one vendor forever',
        'Pilot the conversation layer (Desk + digest) where pain is highest',
        'Own your data model — Beacon keeps schema and migrations in-repo',
      ]),
      p(
        'Corporate America loves suite gravity. Christian schools can choose portable stacks and ministry-aligned stewards. Start with the honest compare at /vs/facts.'
      ),
    ],
  },
  {
    slug: 'how-to-evaluate-facts-alternative',
    title: 'How to Evaluate a FACTS Alternative (Without Getting Sold a Fantasy)',
    description:
      'Checklist for Christian schools evaluating a FACTS alternative: communications, tuition depth, honesty labels, and stewardship.',
    publishedAt: '2026-08-05',
    keywords: [
      'evaluate FACTS alternative',
      'FACTS alternative checklist',
      'Christian school software comparison',
      'Beacon vs FACTS',
    ],
    tags: ['buying guide', 'FACTS'],
    excerpt:
      'If a demo can’t show message proof and parent replies, keep walking.',
    body: [
      h2('Must-haves for family trust'),
      ul([
        'Logged outbound family messages',
        'Inbound parent replies captured into school records',
        'A digest or narrative parents will open weekly',
        'Clear live vs log-only labeling for email and payments',
      ]),
      h2('Where FACTS may still win'),
      p(
        'Aid workflows, collections muscle, and mature incidental billing. If that is your bottleneck, say so out loud. Beacon does not claim to dunk on Nelnet’s entire money stack overnight.'
      ),
      h2('Stewardship filter'),
      p(
        'Ask who owns the company, where renewal pressure comes from, and whether income from other schools aligns with your mission. Beacon’s answer is public on the About page: volunteer ministry stewardship via Common Cents IP.'
      ),
    ],
  },
  {
    slug: 'parent-replies-christian-school-email',
    title: 'When Parents Reply to School Email — and Nobody Can Find It',
    description:
      'Christian school parent email replies often vanish into personal inboxes. Why logged Family Desk threads beat portal messaging theater.',
    publishedAt: '2026-08-06',
    keywords: [
      'school parent email replies',
      'Christian school communication',
      'Family Desk Beacon',
      'school email black hole',
    ],
    tags: ['Family Desk', 'email'],
    excerpt:
      'Reply-To that becomes a school record is not a nice-to-have. It is how trust works.',
    body: [
      p(
        'You send from the school. Mom replies from her phone. The thread dies in someone’s Gmail. Teacher never sees it. Principal hears about it at pickup. Classic.'
      ),
      p(
        'Beacon routes parent replies into email inbox records tied to the outbox — Family Desk, not folklore. Staff can reply from Comms. Parents see Notes from school in one place.'
      ),
      p(
        'Corporate portals often optimize for notifications. We optimize for conversations you can audit. That is the fight with FACTS-shaped fatigue.'
      ),
    ],
  },
  {
    slug: 'faith-based-schools-deserve-honest-software',
    title: 'Faith-Based Schools Deserve Honest Software Labels',
    description:
      'Live vs log-only email and payments — why Christian schools should demand honesty labels from vendors, including FACTS-era suites and Beacon.',
    publishedAt: '2026-08-06',
    keywords: [
      'honest school software',
      'school email log-only',
      'Christian school ops',
      'Beacon go-live',
    ],
    tags: ['honesty', 'ops'],
    excerpt:
      'If leadership can’t see whether email is live, you are flying ministry ops on vibes.',
    body: [
      p(
        'Christian witness includes truthfulness in operations. Shipping “we emailed families” when you only logged intent is not clever — it is a stewardship failure waiting for a board meeting.'
      ),
      p(
        'Beacon labels email and payment modes (live vs log-only / sandbox) so principals are not surprised. Go-live health is visible. Auth fails closed without Supabase config. That is boring on purpose.'
      ),
      p(
        'Demand the same clarity from whoever holds your tuition and SIS contracts. Corporate America will not volunteer it.'
      ),
    ],
  },
  {
    slug: 'beacon-ministry-vs-public-company-sis',
    title: 'Ministry-Stewarded School Software vs a Public-Company SIS',
    description:
      'Beacon (Common Cents IP ministry stewardship) vs FACTS/Nelnet public-company SIS — different incentives for Christian schools.',
    publishedAt: '2026-08-07',
    keywords: [
      'ministry school software',
      'Common Cents IP Beacon',
      'FACTS vs ministry software',
      'Christian school SIS alternative',
    ],
    tags: ['Beacon', 'ministry'],
    excerpt:
      'Different owners. Different incentives. Same families waiting for clarity.',
    body: [
      p(
        'FACTS answers to a public-company structure. Beacon is created by Common Cents IP as a volunteer ministry under the leadership of Chris Cowan. Income from other schools supports teacher salaries, tuition help, and principal care.'
      ),
      p(
        'That does not make Beacon “more holy” as a product by default. It does change what we optimize: Family Desk, Dinner Table Digests, and honest ops for independent schools — not national module theater.'
      ),
      quote(
        'Corporate America is taking advantage of Christian schools — that’s the FACTS. Beacon is how we stop shrugging about it.'
      ),
      p(
        'Read /vs/facts, skim the blog index, and start a conversation from the home page inquiry form. No sales theater.'
      ),
    ],
  },
]
