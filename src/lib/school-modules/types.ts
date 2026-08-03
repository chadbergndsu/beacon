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

/**
 * Campus cameras — browser-safe stream registry.
 * Proven stack: go2rtc (RTSP → HLS/WebRTC) + hls.js in the browser.
 * https://github.com/AlexxIT/go2rtc
 */
/** hls/mjpeg/iframe/snapshot = real streams; simulator = EasyCamera-style canvas demo */
export type CameraStreamKind = 'hls' | 'mjpeg' | 'iframe' | 'snapshot' | 'simulator'

export type SchoolCamera = {
  id: string
  name: string
  location: string
  zone: 'entrance' | 'hallway' | 'playground' | 'parking' | 'gym' | 'office' | 'other'
  /** Browser-playable URL (HLS .m3u8, MJPEG, go2rtc embed, or snapshot JPG) */
  streamUrl: string
  streamKind: CameraStreamKind
  /** Optional still image when stream is offline */
  snapshotUrl?: string
  notes?: string
  enabled: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type SchoolModulesState = {
  lessonPlans: LessonPlan[]
  pulses: PulseEntry[]
  videos: SchoolVideo[]
  cameras?: SchoolCamera[]
}

export const emptyModules = (): SchoolModulesState => ({
  lessonPlans: [],
  pulses: [],
  videos: [],
  cameras: [],
})

export const CAMERA_ZONE_LABEL: Record<SchoolCamera['zone'], string> = {
  entrance: 'Entrance',
  hallway: 'Hallway',
  playground: 'Playground',
  parking: 'Parking',
  gym: 'Gym',
  office: 'Office',
  other: 'Other',
}

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
