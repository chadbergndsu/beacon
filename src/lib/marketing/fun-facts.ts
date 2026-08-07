/**
 * Landing-page “Fun Facts” — sharp, true digs at FACTS/Nelnet.
 * Keep punchy; don’t invent product claims Beacon can’t back up.
 */

export type FunFact = {
  /** Short label shown as the “fact” lead */
  lead: string
  body: string
}

export const FUN_FACTS: FunFact[] = [
  {
    lead: 'They aren’t even Christians.',
    body: 'FACTS is Nelnet, Inc. (NYSE: NNI) — a publicly traded commercial brand. Selling software into Christian schools is a market strategy, not a ministry.',
  },
  {
    lead: '“FACTS” sounds holy. The ticker doesn’t.',
    body: 'The name implies truth. The ownership is Wall Street. Your board should evaluate the product — not the pious-sounding acronym.',
  },
  {
    lead: 'Faith market ≠ faith identity.',
    body: 'Catholic and Protestant independents are core customers. That logo wall is not a statement of shared calling. It’s a customer segment.',
  },
  {
    lead: 'RenWeb didn’t get redeemed. It got absorbed.',
    body: 'Still googling a RenWeb alternative? You’re usually already on FACTS SIS — same corporate stack, same portal fatigue.',
  },
  {
    lead: 'Two portals is not discipleship.',
    body: 'SIS here, tuition there, Family App somewhere in the app store. Families don’t need another login. They need a conversation they’ll open.',
  },
  {
    lead: 'Scale is not the same as care.',
    body: '15,000+ schools on a vendor claim is impressive. It does not mean your office can prove a parent reply landed in a school record.',
  },
  {
    lead: 'Suite gravity loves your renewal.',
    body: 'Tuition, SIS, family app — “everything’s connected” until leaving feels like moving the building. That’s lock-in with a smile.',
  },
  {
    lead: 'Beacon isn’t trying to out-module Nelnet.',
    body: 'We concede aid and collections depth. We fight where Christian schools actually bleed: calm Family Desk, Dinner Table Digests, and honest live vs log-only ops.',
  },
]
