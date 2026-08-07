/** Teacher lesson planner shared types. */

export type TeacherClass = {
  id: string
  name: string
  subject: string | null
  grade_level: string | null
  /** Optional period window shown in quick view, e.g. "8:15–9:05" */
  periodTime?: string | null
  icon?: 'book' | 'pencil' | 'calc' | 'globe' | 'heart' | 'music' | 'science' | null
}

export function classLabel(c: TeacherClass): string {
  return c.subject?.trim() || c.name
}
