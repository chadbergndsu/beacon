/**
 * Abeka-aligned grade + subject catalog for Christian school class setup.
 * Suggestions only — schools can still type custom names.
 */

export type AbekaGradeBand = 'preschool' | 'elementary' | 'middle' | 'high'

export type AbekaGrade = {
  id: string
  label: string
  band: AbekaGradeBand
}

export type AbekaSubject = {
  id: string
  label: string
  /** Short name for class titles */
  short: string
  bands: AbekaGradeBand[]
}

export const ABEKA_GRADES: AbekaGrade[] = [
  { id: 'K4', label: 'K4', band: 'preschool' },
  { id: 'K5', label: 'K5', band: 'preschool' },
  { id: '1', label: '1st Grade', band: 'elementary' },
  { id: '2', label: '2nd Grade', band: 'elementary' },
  { id: '3', label: '3rd Grade', band: 'elementary' },
  { id: '4', label: '4th Grade', band: 'elementary' },
  { id: '5', label: '5th Grade', band: 'elementary' },
  { id: '6', label: '6th Grade', band: 'elementary' },
  { id: '7', label: '7th Grade', band: 'middle' },
  { id: '8', label: '8th Grade', band: 'middle' },
  { id: '9', label: '9th Grade', band: 'high' },
  { id: '10', label: '10th Grade', band: 'high' },
  { id: '11', label: '11th Grade', band: 'high' },
  { id: '12', label: '12th Grade', band: 'high' },
]

export const ABEKA_SUBJECTS: AbekaSubject[] = [
  { id: 'bible', label: 'Bible', short: 'Bible', bands: ['preschool', 'elementary', 'middle', 'high'] },
  {
    id: 'phonics',
    label: 'Phonics / Reading',
    short: 'Phonics',
    bands: ['preschool', 'elementary'],
  },
  {
    id: 'language',
    label: 'Language / Grammar',
    short: 'Language',
    bands: ['elementary', 'middle', 'high'],
  },
  {
    id: 'spelling',
    label: 'Spelling & Poetry',
    short: 'Spelling',
    bands: ['elementary', 'middle'],
  },
  {
    id: 'penmanship',
    label: 'Penmanship / Handwriting',
    short: 'Penmanship',
    bands: ['preschool', 'elementary'],
  },
  {
    id: 'english',
    label: 'English',
    short: 'English',
    bands: ['middle', 'high'],
  },
  {
    id: 'literature',
    label: 'Literature',
    short: 'Literature',
    bands: ['middle', 'high'],
  },
  {
    id: 'arithmetic',
    label: 'Arithmetic / Math',
    short: 'Arithmetic',
    bands: ['preschool', 'elementary', 'middle'],
  },
  {
    id: 'algebra1',
    label: 'Algebra 1',
    short: 'Algebra 1',
    bands: ['high'],
  },
  {
    id: 'algebra2',
    label: 'Algebra 2',
    short: 'Algebra 2',
    bands: ['high'],
  },
  {
    id: 'geometry',
    label: 'Plane Geometry',
    short: 'Geometry',
    bands: ['high'],
  },
  {
    id: 'precalc',
    label: 'Precalculus',
    short: 'Precalculus',
    bands: ['high'],
  },
  {
    id: 'history',
    label: 'History / Geography',
    short: 'History',
    bands: ['elementary', 'middle', 'high'],
  },
  {
    id: 'science',
    label: 'Science',
    short: 'Science',
    bands: ['elementary', 'middle', 'high'],
  },
  {
    id: 'biology',
    label: 'Biology',
    short: 'Biology',
    bands: ['high'],
  },
  {
    id: 'chemistry',
    label: 'Chemistry',
    short: 'Chemistry',
    bands: ['high'],
  },
  {
    id: 'physics',
    label: 'Physics',
    short: 'Physics',
    bands: ['high'],
  },
  {
    id: 'health',
    label: 'Health',
    short: 'Health',
    bands: ['elementary', 'middle', 'high'],
  },
  {
    id: 'art',
    label: 'Art',
    short: 'Art',
    bands: ['preschool', 'elementary', 'middle', 'high'],
  },
  {
    id: 'music',
    label: 'Music',
    short: 'Music',
    bands: ['preschool', 'elementary', 'middle', 'high'],
  },
  {
    id: 'spanish',
    label: 'Spanish',
    short: 'Spanish',
    bands: ['middle', 'high'],
  },
  {
    id: 'homeroom',
    label: 'Homeroom (all subjects)',
    short: 'Homeroom',
    bands: ['preschool', 'elementary', 'middle'],
  },
  {
    id: 'elective',
    label: 'Elective / Other',
    short: 'Elective',
    bands: ['preschool', 'elementary', 'middle', 'high'],
  },
]

export function gradeById(id: string): AbekaGrade | undefined {
  return ABEKA_GRADES.find((g) => g.id === id)
}

export function subjectsForGrade(gradeId: string): AbekaSubject[] {
  const g = gradeById(gradeId)
  if (!g) return ABEKA_SUBJECTS
  return ABEKA_SUBJECTS.filter((s) => s.bands.includes(g.band))
}

/** Core Abeka slate often used for a single teacher / grade level. */
export function coreSubjectsForGrade(gradeId: string): AbekaSubject[] {
  const all = subjectsForGrade(gradeId)
  const g = gradeById(gradeId)
  if (!g) return all

  if (g.band === 'preschool' || g.band === 'elementary') {
    // Elementary often one homeroom — still offer subject split
    const prefer = ['homeroom', 'bible', 'phonics', 'language', 'arithmetic', 'history', 'science']
    return prefer
      .map((id) => all.find((s) => s.id === id))
      .filter(Boolean) as AbekaSubject[]
  }
  if (g.band === 'middle') {
    const prefer = ['bible', 'english', 'arithmetic', 'history', 'science', 'health']
    return prefer
      .map((id) => all.find((s) => s.id === id))
      .filter(Boolean) as AbekaSubject[]
  }
  // high school
  const prefer = ['bible', 'english', 'algebra1', 'history', 'biology', 'health']
  return prefer
    .map((id) => all.find((s) => s.id === id))
    .filter(Boolean) as AbekaSubject[]
}

export function suggestClassName(gradeId: string, subject: AbekaSubject | { short: string; id: string }): string {
  const g = gradeById(gradeId)
  const gradeLabel = g?.label || gradeId || 'Class'
  if (subject.id === 'homeroom') return `${gradeLabel} Homeroom`
  return `${gradeLabel} ${subject.short}`
}

/**
 * Optional short call-code style label (not official Abeka SKUs).
 * Schools often attach their own section/call numbers; this is a starter pattern.
 */
export function suggestCallCode(
  gradeId: string,
  subject: AbekaSubject | { id: string; short: string }
): string {
  const g = (gradeId || '').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'X'
  const sub = subject.id === 'homeroom' ? 'HR' : subject.short.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase()
  return `${g}-${sub}`
}

export function subjectLabelFromId(id: string | null | undefined): string | null {
  if (!id) return null
  return ABEKA_SUBJECTS.find((s) => s.id === id)?.label || id
}
