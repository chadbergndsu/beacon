/** Lesson planning */
export type LessonPlan = {
  id: string
  classId: string
  title: string
  date: string // YYYY-MM-DD
  subject?: string
  unit?: string
  objectives: string
  materials: string
  activities: string
  scripture?: string
  homework?: string
  differentiation?: string
  assessment?: string
  reflection?: string
  durationMinutes?: number
  status: 'draft' | 'ready' | 'taught'
  createdBy: string
  createdAt: string
  updatedAt: string
}

/**
 * Beacon Pulse — novel whole-child signal (not just grades).
 * Teachers log a 15-second multi-dimensional check-in.
 * Parents see a living "how is my child thriving?" view.
 * Principal sees school-wide climate — unique vs Jupiter/Blackbaud.
 */
export type PulseDimension =
  | 'engagement'
  | 'character'
  | 'peer'
  | 'focus'
  | 'joy'

export type PulseLevel = 'strong' | 'steady' | 'needs_care'

export type PulseEntry = {
  id: string
  classId: string
  studentId: string
  teacherId: string
  teacherName: string
  date: string
  overall: PulseLevel
  dimensions: Partial<Record<PulseDimension, PulseLevel>>
  note: string
  celebrate?: string // what to celebrate with the family
  createdAt: string
}

/** Principal video library */
export type SchoolVideo = {
  id: string
  title: string
  description: string
  url: string
  provider: 'youtube' | 'vimeo' | 'other'
  category: 'chapel' | 'training' | 'family' | 'board' | 'other'
  featured: boolean
  createdAt: string
  createdBy: string
}

export type SchoolModulesState = {
  lessonPlans: LessonPlan[]
  pulses: PulseEntry[]
  videos: SchoolVideo[]
}

export const emptyModules = (): SchoolModulesState => ({
  lessonPlans: [],
  pulses: [],
  videos: [],
})

export const PULSE_LABELS: Record<PulseDimension, string> = {
  engagement: 'Engagement',
  character: 'Character',
  peer: 'Peers',
  focus: 'Focus',
  joy: 'Joy / spirit',
}

export const PULSE_LEVEL_LABEL: Record<PulseLevel, string> = {
  strong: 'Strong',
  steady: 'Steady',
  needs_care: 'Needs care',
}
