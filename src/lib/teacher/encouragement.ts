export type TeacherEncouragement = {
  text: string
  kind: 'saying' | 'verse'
  /** Verse reference or short attribution */
  source?: string
}

/** Encouragement library for teachers — affirmations and scripture. */
export const TEACHER_ENCOURAGEMENTS: readonly TeacherEncouragement[] = [
  {
    kind: 'saying',
    text: 'What you do in a classroom echoes for decades — you are shaping lives, not just lessons.',
  },
  {
    kind: 'verse',
    text: 'Train up a child in the way he should go; even when he is old he will not depart from it.',
    source: 'Proverbs 22:6',
  },
  {
    kind: 'saying',
    text: 'A child who feels known will try harder than a child who only feels managed.',
  },
  {
    kind: 'verse',
    text: 'Whatever you do, work heartily, as for the Lord and not for men.',
    source: 'Colossians 3:23',
  },
  {
    kind: 'saying',
    text: 'Your patience today may be the memory that keeps a student believing in themselves tomorrow.',
  },
  {
    kind: 'verse',
    text: 'Let us not grow weary of doing good, for in due season we will reap, if we do not give up.',
    source: 'Galatians 6:9',
  },
  {
    kind: 'saying',
    text: 'Great teaching is love with a lesson plan.',
  },
  {
    kind: 'verse',
    text: 'She opens her mouth with wisdom, and the teaching of kindness is on her tongue.',
    source: 'Proverbs 31:26',
  },
  {
    kind: 'saying',
    text: 'You are not behind — you are with the children God placed in your room this year.',
  },
  {
    kind: 'verse',
    text: 'The Lord your God is with you wherever you go.',
    source: 'Joshua 1:9',
  },
  {
    kind: 'saying',
    text: 'Small encouragements from you become a student’s inner voice for years.',
  },
  {
    kind: 'verse',
    text: 'In all things I have shown you that by working hard in this way we must help the weak.',
    source: 'Acts 20:35',
  },
  {
    kind: 'saying',
    text: 'The hardest days still count — showing up is part of the ministry.',
  },
  {
    kind: 'verse',
    text: 'My grace is sufficient for you, for my power is made perfect in weakness.',
    source: '2 Corinthians 12:9',
  },
  {
    kind: 'saying',
    text: 'You see potential before grades ever prove it. That hope matters.',
  },
  {
    kind: 'verse',
    text: 'Commit your work to the Lord, and your plans will be established.',
    source: 'Proverbs 16:3',
  },
  {
    kind: 'saying',
    text: 'Every corrected paper, every hallway hello, every second chance — it all adds up.',
  },
  {
    kind: 'verse',
    text: 'God is not unjust so as to overlook your work and the love that you have shown.',
    source: 'Hebrews 6:10',
  },
  {
    kind: 'saying',
    text: 'You are irreplaceable in the story of this school — no one else teaches like you.',
  },
  {
    kind: 'verse',
    text: 'Let the word of Christ dwell in you richly, teaching and admonishing one another in all wisdom.',
    source: 'Colossians 3:16',
  },
  {
    kind: 'saying',
    text: 'Rest is not quitting — it is how you return with a full heart for Monday.',
  },
  {
    kind: 'verse',
    text: 'Come to me, all who labor and are heavy laden, and I will give you rest.',
    source: 'Matthew 11:28',
  },
  {
    kind: 'saying',
    text: 'When a student finally “gets it,” that moment is yours forever.',
  },
  {
    kind: 'verse',
    text: 'The Lord is my shepherd; I shall not want. He makes me lie down in green pastures.',
    source: 'Psalm 23:1–2',
  },
  {
    kind: 'saying',
    text: 'You teach content, but families remember how you made their child feel.',
  },
  {
    kind: 'verse',
    text: 'And let us consider how to stir up one another to love and good works.',
    source: 'Hebrews 10:24',
  },
  {
    kind: 'saying',
    text: 'Your work is holy ground — ordinary days, extraordinary calling.',
  },
  {
    kind: 'verse',
    text: 'Well done, good and faithful servant.',
    source: 'Matthew 25:21',
  },
  {
    kind: 'saying',
    text: 'The school runs because teachers like you keep showing up with care.',
  },
  {
    kind: 'verse',
    text: 'I can do all things through him who strengthens me.',
    source: 'Philippians 4:13',
  },
]

function hashSeed(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0
  }
  return h
}

export function teacherEncouragementAt(index: number): TeacherEncouragement {
  const len = TEACHER_ENCOURAGEMENTS.length
  const safe = ((index % len) + len) % len
  return TEACHER_ENCOURAGEMENTS[safe]!
}

/** Stable first quote for a teacher on a given calendar day. */
export function teacherEncouragementForDay(
  userId: string,
  date: Date = new Date()
): { item: TeacherEncouragement; index: number } {
  const dayKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`
  const index = hashSeed(`${userId}:${dayKey}`) % TEACHER_ENCOURAGEMENTS.length
  return { item: teacherEncouragementAt(index), index }
}

/** Random quote, optionally avoiding the current index. */
export function randomTeacherEncouragement(excludeIndex?: number): {
  item: TeacherEncouragement
  index: number
} {
  const len = TEACHER_ENCOURAGEMENTS.length
  if (len <= 1) return { item: TEACHER_ENCOURAGEMENTS[0]!, index: 0 }

  let index = Math.floor(Math.random() * len)
  if (excludeIndex !== undefined && len > 1) {
    let attempts = 0
    while (index === excludeIndex && attempts < 8) {
      index = Math.floor(Math.random() * len)
      attempts++
    }
    if (index === excludeIndex) {
      index = (excludeIndex + 1) % len
    }
  }

  return { item: teacherEncouragementAt(index), index }
}
