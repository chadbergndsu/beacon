/**
 * Demo week modeled on MySchoolWorx-style elementary plans
 * (Bible / Elijah, Spelling 36–40, Reading Through the Seasons, etc.).
 * Dates are generated relative to the given Monday so the demo always
 * lands on the visible week.
 */

import type { LessonPlan } from '@/lib/school-modules/types'
import type { TeacherClass } from '@/lib/lessons/types'
import { isoDate, addDays, startOfWeekMonday } from './week-dates'

export type SampleClass = TeacherClass & {
  periodTime?: string
  icon?: NonNullable<TeacherClass['icon']>
}

type DayDraft = {
  topic: string
  title?: string
  objectives: string
  materials: string
  activities: string
  homework?: string
  assessment?: string
  scripture?: string
  durationMinutes?: number
}

function plan(
  classId: string,
  date: string,
  draft: DayDraft
): LessonPlan {
  const now = new Date().toISOString()
  return {
    id: `demo-${classId}-${date}`,
    classId,
    title: draft.title || draft.topic,
    date,
    unit: draft.topic,
    objectives: draft.objectives,
    materials: draft.materials,
    activities: draft.activities,
    homework: draft.homework,
    assessment: draft.assessment,
    scripture: draft.scripture,
    durationMinutes: draft.durationMinutes ?? 50,
    status: 'ready',
    createdBy: 'demo',
    createdAt: now,
    updatedAt: now,
    subject: classId,
  }
}

export const SAMPLE_TEACHER_NAME = 'Berg Jen'

export const SAMPLE_CLASSES: SampleClass[] = [
  {
    id: 'demo-bible',
    name: 'Bible',
    subject: 'Bible',
    grade_level: '3',
    periodTime: '8:15–9:05',
    icon: 'book',
  },
  {
    id: 'demo-reading',
    name: 'Reading',
    subject: 'Reading',
    grade_level: '3',
    periodTime: '10:05–10:55',
    icon: 'book',
  },
  {
    id: 'demo-arithmetic',
    name: 'Arithmetic 3',
    subject: 'Arithmetic 3',
    grade_level: '3',
    periodTime: '11:00–11:50',
    icon: 'calc',
  },
  {
    id: 'demo-science',
    name: "Exploring God's World",
    subject: "Exploring God's World",
    grade_level: '3',
    periodTime: '12:30–1:15',
    icon: 'science',
  },
  {
    id: 'demo-spelling',
    name: 'Spelling',
    subject: 'Spelling',
    grade_level: '3',
    periodTime: '1:20–2:05',
    icon: 'pencil',
  },
  {
    id: 'demo-social',
    name: 'Social Studies',
    subject: 'Social Studies',
    grade_level: '3',
    periodTime: '2:10–3:00',
    icon: 'globe',
  },
  {
    id: 'demo-language',
    name: 'Language and Phonics',
    subject: 'Language and Phonics',
    grade_level: '3',
    periodTime: '9:10–10:00',
    icon: 'pencil',
  },
  {
    id: 'demo-handwriting',
    name: 'Handwriting',
    subject: 'Handwriting',
    grade_level: '3',
    periodTime: '3:00–3:25',
    icon: 'pencil',
  },
]

const BIBLE_WEEK: DayDraft[] = [
  {
    topic: 'Elijah — Fed by Ravens',
    objectives:
      '• Retell how God provided for Elijah\n• Identify God’s care in hard times\n• Memorize 1 Kings 17:4',
    materials: 'Bible, Abeka Bible flash-a-cards, notebook',
    activities:
      '1. Prayer & review\n2. Read 1 Kings 17:1–7 together\n3. Discuss God’s provision\n4. Draw raven storyboard',
    homework: 'Read 1 Kings 17:1–7 with a parent',
    assessment: 'Oral retell of the story in pairs',
    scripture: '1 Kings 17:4',
  },
  {
    topic: 'Elijah — Widow of Zarephath',
    objectives:
      '• Explain how God provided through the widow\n• Practice generosity language',
    materials: 'Bible, flour/oil object lesson cups',
    activities:
      '1. Review ravens\n2. Read 1 Kings 17:8–16\n3. Object lesson: jar that did not empty\n4. Journal: one way God provides for my family',
    homework: 'Thank-you prayer list (3 items)',
    assessment: 'Exit ticket: one sentence about trust',
    scripture: '1 Kings 17:14',
  },
  {
    topic: 'Elijah — Mount Carmel (Part 1)',
    objectives: '• Contrast Baal worship vs. the living God\n• Define “altar” in Bible times',
    materials: 'Bible, map of Israel, altar diagram',
    activities:
      '1. Map walk to Carmel\n2. Read 1 Kings 18:17–29\n3. Discuss false vs true worship\n4. Vocabulary cards',
    homework: 'Memory verse practice',
    assessment: 'Vocabulary match quiz',
    scripture: '1 Kings 18:21',
  },
  {
    topic: 'Elijah — Mount Carmel (Part 2)',
    objectives: '• Retell fire from heaven\n• Connect God’s power to prayer',
    materials: 'Bible, watercolor paper',
    activities:
      '1. Finish 1 Kings 18:30–39\n2. Watercolor “fire on the altar”\n3. Class prayer of praise',
    homework: 'Share Carmel story at dinner',
    assessment: 'Picture caption with key verse',
    scripture: '1 Kings 18:39',
  },
  {
    topic: 'Elijah Review & Application',
    objectives: '• Sequence Elijah events\n• Apply “God provides” to school life',
    materials: 'Timeline cards, journals',
    activities:
      '1. Timeline sort in groups\n2. Write “God provides when…”\n3. Share & pray',
    homework: 'None — family night',
    assessment: 'Timeline check + journal',
    scripture: 'Psalm 37:25',
  },
]

const SPELLING_WEEK: DayDraft[] = [
  {
    topic: 'Lesson 36 — List words',
    objectives: '• Introduce list 36\n• Sort by vowel patterns',
    materials: 'Spelling workbook, whiteboards',
    activities: '1. Pretest\n2. Pattern sort\n3. Partner quiz',
    homework: 'Write each word 1×',
    assessment: 'Pretest score',
  },
  {
    topic: 'Lesson 37 — Word meanings',
    objectives: '• Match definitions\n• Use 5 words in sentences',
    materials: 'Workbook pp. 74–75',
    activities: '1. Definition match\n2. Sentence writing\n3. Oral share',
    homework: 'Sentences 1–5',
    assessment: 'Sentence check',
  },
  {
    topic: 'Lesson 38 — Dictation practice',
    objectives: '• Spell list words in context sentences',
    materials: 'Dictation booklet',
    activities: '1. Warm-up review\n2. Dictation round\n3. Self-check',
    homework: 'Study missed words',
    assessment: 'Dictation accuracy',
  },
  {
    topic: 'Lesson 39 — Review games',
    objectives: '• Review lessons 36–38\n• Collaborate in teams',
    materials: 'Spelling bee cards',
    activities: '1. Team bee\n2. Whiteboard relay\n3. Mistake clinic',
    homework: 'Study for Friday test',
    assessment: 'Informal observation',
  },
  {
    topic: 'Lesson 40 — Weekly test',
    objectives: '• Demonstrate mastery of list 36–39',
    materials: 'Test forms',
    activities: '1. Quiet test\n2. Trade & grade\n3. Record scores',
    homework: 'None',
    assessment: 'Weekly spelling test',
  },
]

const READING_WEEK: DayDraft[] = [
  {
    topic: 'Through the Seasons — Autumn',
    objectives: '• Identify seasonal clues in text\n• Find main idea',
    materials: 'Reader pp. 12–18',
    activities: '1. Picture walk\n2. Read aloud\n3. Main-idea sticky notes',
    homework: 'Reread pp. 12–15',
    assessment: 'Main-idea sticky',
  },
  {
    topic: 'Through the Seasons — Winter',
    objectives: '• Compare autumn vs winter details\n• Vocabulary in context',
    materials: 'Reader pp. 19–25, vocab cards',
    activities: '1. Vocab warm-up\n2. Paired reading\n3. Compare chart',
    homework: 'Vocab cards 1–6',
    assessment: 'Compare chart',
  },
  {
    topic: 'Through the Seasons — Spring',
    objectives: '• Infer character feelings\n• Cite text evidence',
    materials: 'Reader pp. 26–32',
    activities: '1. Inference stems\n2. Guided reading\n3. Evidence hunt',
    homework: 'One evidence sentence',
    assessment: 'Evidence hunt exit',
  },
  {
    topic: 'Through the Seasons — Summer',
    objectives: '• Summarize seasonal cycle\n• Oral fluency practice',
    materials: 'Reader pp. 33–38',
    activities: '1. Fluency pairs\n2. Summary frames\n3. Class share',
    homework: 'Practice fluency page',
    assessment: '30-second fluency',
  },
  {
    topic: 'Through the Seasons — Wrap-up',
    objectives: '• Retell the seasonal journey\n• Personal connection paragraph',
    materials: 'Journals, crayons',
    activities: '1. Retell circle\n2. Favorite season paragraph\n3. Illustrate',
    homework: 'Share paragraph at home',
    assessment: 'Paragraph rubric',
  },
]

function fiveDayPlans(
  classId: string,
  monday: Date,
  days: DayDraft[]
): LessonPlan[] {
  return days.map((draft, i) => plan(classId, isoDate(addDays(monday, i)), draft))
}

function arithmeticWeek(): DayDraft[] {
  return [0, 1, 2, 3, 4].map((i) => ({
    topic: `Arithmetic — Lesson ${42 + i}`,
    objectives: `• Practice fact family ${i + 1}\n• Solve word problems with regrouping`,
    materials: 'Abeka Arithmetic 3, counters',
    activities: `1. Speed drill\n2. Teach new concept\n3. Seatwork pp. ${80 + i}–${81 + i}`,
    homework: `pp. ${82 + i} odds`,
    assessment: 'Speed drill + seatwork check',
    durationMinutes: 50,
  }))
}

function scienceWeek(): DayDraft[] {
  return [
    {
      topic: 'Weather watchers',
      objectives: '• Define weather vs climate\n• Observe sky conditions',
      materials: "Exploring God's World, thermometer",
      activities: '1. Read pages\n2. Outdoor observation\n3. Log temperature',
      homework: '3-day weather log start',
      assessment: 'Observation notes',
    },
    {
      topic: 'Cloud types',
      objectives: '• Name cumulus, stratus, cirrus\n• Match photos to types',
      materials: 'Cloud chart, chalk',
      activities: '1. Chart walk\n2. Sidewalk chalk clouds\n3. Quiz match',
      homework: 'Find one cloud type tonight',
      assessment: 'Photo match',
    },
    {
      topic: 'Water cycle',
      objectives: '• Sequence evaporation → precipitation\n• Label diagram',
      materials: 'Diagram worksheet, kettle demo (safe)',
      activities: '1. Demo steam\n2. Label cycle\n3. Song review',
      homework: 'Color water-cycle sheet',
      assessment: 'Labeled diagram',
    },
    {
      topic: 'Storm safety',
      objectives: '• List safe actions in storms\n• Discuss God’s power in creation',
      materials: 'Safety poster paper',
      activities: '1. Read safety tips\n2. Poster groups\n3. Present',
      homework: 'Family safety talk',
      assessment: 'Poster rubric',
    },
    {
      topic: 'Weather review lab',
      objectives: '• Apply week vocabulary\n• Build simple wind vane',
      materials: 'Straws, paper, pins',
      activities: '1. Vocab race\n2. Build vane\n3. Test outdoors',
      homework: 'None',
      assessment: 'Vocab race + vane',
    },
  ]
}

function socialWeek(): DayDraft[] {
  return [0, 1, 2, 3, 4].map((i) => ({
    topic: ['Our community helpers', 'Maps & symbols', 'Local history', 'Citizenship', 'Community project'][i]!,
    objectives: '• Identify community roles\n• Use map keys\n• Practice respectful citizenship',
    materials: 'Social studies text, map pencils',
    activities: '1. Read\n2. Map or discussion activity\n3. Exit ticket',
    homework: i === 4 ? 'None' : 'Short reading',
    assessment: 'Exit ticket',
  }))
}

function languageWeek(): DayDraft[] {
  return [0, 1, 2, 3, 4].map((i) => ({
    topic: `Phonics & Language — Day ${i + 1}`,
    objectives: '• Review phonograms\n• Practice sentence punctuation',
    materials: 'Language workbook, phonogram cards',
    activities: '1. Phonogram drill\n2. Grammar lesson\n3. Seatwork',
    homework: 'Workbook practice set',
    assessment: 'Drill accuracy',
  }))
}

function handwritingWeek(): DayDraft[] {
  return [0, 1, 2, 3, 4].map((i) => ({
    topic: `Cursive — Letter set ${String.fromCharCode(65 + i)}`,
    objectives: '• Form letters with correct slant\n• Copy a sentence neatly',
    materials: 'Handwriting tablet, pencils',
    activities: '1. Warm-up strokes\n2. Letter practice\n3. Sentence copy',
    homework: 'One practice line',
    assessment: 'Neatness check',
    durationMinutes: 25,
  }))
}

/** Build sample classes + Mon–Fri plans for the week containing `around`. */
export function buildSampleWeek(around: Date = new Date()): {
  teacherName: string
  classes: SampleClass[]
  plans: LessonPlan[]
  weekMonday: Date
} {
  const monday = startOfWeekMonday(around)

  const plans: LessonPlan[] = [
    ...fiveDayPlans('demo-bible', monday, BIBLE_WEEK),
    ...fiveDayPlans('demo-spelling', monday, SPELLING_WEEK),
    ...fiveDayPlans('demo-reading', monday, READING_WEEK),
    ...fiveDayPlans('demo-arithmetic', monday, arithmeticWeek()),
    ...fiveDayPlans('demo-science', monday, scienceWeek()),
    ...fiveDayPlans('demo-social', monday, socialWeek()),
    ...fiveDayPlans('demo-language', monday, languageWeek()),
    ...fiveDayPlans('demo-handwriting', monday, handwritingWeek()),
  ]

  return {
    teacherName: SAMPLE_TEACHER_NAME,
    classes: SAMPLE_CLASSES,
    plans,
    weekMonday: monday,
  }
}
