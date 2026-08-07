/** Leadership quotes for the Principal office lobby — Chris Cowan, Head of School voice. */
export const CHRIS_COWAN_LEADERSHIP_QUOTES: readonly string[] = [
  'Lead with calm clarity — families feel chaos before they read a spreadsheet.',
  'Every system we build should protect teaching time, not compete with it.',
  'Trust is earned in the hallway, the car line, and the follow-up email — not the slogan.',
  'We measure success by whether a child is known, not merely counted.',
  'Excellence without warmth is performance; warmth without excellence is neglect.',
  'When in doubt, choose the path that keeps parents informed and teachers supported.',
  'Culture is what we tolerate on an ordinary Tuesday.',
  'A school that runs well on paper but strains at the door is not ready to grow.',
  'Pray first, plan second, then pick up the phone.',
  'Small consistent habits beat heroic one-week sprints.',
  'Protect the margin — burned-out leaders make burned-out campuses.',
  'Badge scans, grades, and tuition should tell one coherent story to families.',
  'Hire for character, train for skill, and never confuse the two.',
  'The campus twin is a mirror — fix the room mapping before you fix the graphics.',
  'Celebrate wins publicly; correct privately; document wisely.',
  'A parent who feels heard will partner with you through hard news.',
  'Go-live is not a date on the calendar — it is a checklist with owners.',
  'We are forming souls, not just transmitting content.',
  'If the office is calm, the classrooms can breathe.',
  'Finish strong today — tomorrow’s teachers are watching how we close.',
  'Integrity in billing and attendance is ministry to families under stress.',
  'Never ship a process you would not explain to a grandmother at pickup.',
  'The best technology disappears into the background of real relationships.',
  'Room by room, child by child — that is how schools change.',
  'Leadership is stewardship: the school, the staff, and the story we tell together.',
  'When the data disagrees with the hallway, walk the hallway.',
  'Prepare the environment so good people can do great work.',
  'Grace and accountability belong in the same sentence.',
  'A clear no protects a thousand future yeses.',
  'End every week asking: who did we make feel seen?',
  'The twin campus, the gradebook, and the chapel all serve the same mission.',
]

export type LeadershipQuote = {
  text: string
  author: string
  label: string
}

/** Stable quote for a calendar day (rotates through the library). */
export function leadershipQuoteForDate(date: Date = new Date()): LeadershipQuote {
  const utcDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000
  const index = ((utcDay % CHRIS_COWAN_LEADERSHIP_QUOTES.length) + CHRIS_COWAN_LEADERSHIP_QUOTES.length) % CHRIS_COWAN_LEADERSHIP_QUOTES.length
  return {
    text: CHRIS_COWAN_LEADERSHIP_QUOTES[index]!,
    author: 'Chris Cowan',
    label: 'Leadership quote of the day',
  }
}
