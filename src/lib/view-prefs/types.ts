/**
 * Per-user configurable screen layouts — teachers (and every role) pick
 * which sections show and in what order on each screen.
 */

export type ScreenId =
  | 'dashboard'
  | 'teacher_quick'
  | 'teacher_printables'
  | 'teacher_lessons'
  | 'class_gradebook'
  | 'student_overview'
  | 'principal_overview'
  | 'admin_comms'
  | 'announcements'

export type SectionDef = {
  id: string
  label: string
  description?: string
  /** Cannot be hidden (identity / safety chrome). */
  locked?: boolean
  defaultVisible?: boolean
}

export type ScreenLayout = {
  /** Section ids in display order (subset or full catalog). */
  order: string[]
  /** Explicitly hidden section ids (locked sections ignored). */
  hidden: string[]
}

export type ViewLayoutsMap = Partial<Record<ScreenId, ScreenLayout>>

export type UserPreferences = {
  viewLayouts?: ViewLayoutsMap
}
