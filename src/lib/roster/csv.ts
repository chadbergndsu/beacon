/**
 * Production roster CSV parsing — students and simple staff rows.
 * Headers are flexible (first, last, grade, email, etc.).
 */

export type StudentCsvRow = {
  firstName: string
  lastName: string
  gradeLevel: string | null
  email?: string | null // optional parent email for later link
  className?: string | null
  line: number
}

export type ParseStudentsResult = {
  rows: StudentCsvRow[]
  errors: string[]
  skipped: number
}

const FIRST_KEYS = ['first_name', 'firstname', 'first', 'student_first', 'given_name']
const LAST_KEYS = ['last_name', 'lastname', 'last', 'student_last', 'surname', 'family_name']
const GRADE_KEYS = ['grade', 'grade_level', 'gradelevel', 'year', 'class_grade']
const EMAIL_KEYS = ['parent_email', 'email', 'guardian_email', 'family_email']
const CLASS_KEYS = ['class', 'class_name', 'classname', 'homeroom', 'section']

function normHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/^\uFEFF/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

/** Minimal RFC4180-ish CSV split (quotes, commas, newlines). */
export function splitCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let i = 0
  let inQuotes = false
  const s = text.replace(/^\uFEFF/, '')

  while (i < s.length) {
    const ch = s[i]
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          cell += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      cell += ch
      i++
      continue
    }
    if (ch === '"') {
      inQuotes = true
      i++
      continue
    }
    if (ch === ',') {
      row.push(cell)
      cell = ''
      i++
      continue
    }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++
      row.push(cell)
      cell = ''
      if (row.some((c) => c.trim() !== '')) rows.push(row)
      row = []
      i++
      continue
    }
    cell += ch
    i++
  }
  row.push(cell)
  if (row.some((c) => c.trim() !== '')) rows.push(row)
  return rows
}

/**
 * Parse student CSV. First row = headers.
 * Required: first name + last name (or a single "name" column "Last, First").
 */
export function parseStudentsCsv(text: string): ParseStudentsResult {
  const errors: string[] = []
  const table = splitCsv(text)
  if (table.length < 2) {
    return {
      rows: [],
      errors: ['CSV needs a header row and at least one student row.'],
      skipped: 0,
    }
  }

  const headers = table[0].map(normHeader)
  const idx = (keys: string[]) => {
    for (const k of keys) {
      const i = headers.indexOf(k)
      if (i >= 0) return i
    }
    return -1
  }

  const iFirst = idx(FIRST_KEYS)
  const iLast = idx(LAST_KEYS)
  const iName = idx(['name', 'student', 'student_name', 'full_name'])
  const iGrade = idx(GRADE_KEYS)
  const iEmail = idx(EMAIL_KEYS)
  const iClass = idx(CLASS_KEYS)

  if (iFirst < 0 && iLast < 0 && iName < 0) {
    return {
      rows: [],
      errors: [
        'Could not find name columns. Use headers like first_name, last_name (or Name as "Last, First").',
      ],
      skipped: 0,
    }
  }

  const rows: StudentCsvRow[] = []
  let skipped = 0

  for (let r = 1; r < table.length; r++) {
    const line = r + 1
    const cells = table[r]
    const get = (i: number) => (i >= 0 ? (cells[i] ?? '').trim() : '')

    let firstName = get(iFirst)
    let lastName = get(iLast)

    if ((!firstName || !lastName) && iName >= 0) {
      const full = get(iName)
      if (full.includes(',')) {
        const [a, b] = full.split(',').map((x) => x.trim())
        lastName = lastName || a
        firstName = firstName || b
      } else {
        const parts = full.split(/\s+/).filter(Boolean)
        if (parts.length >= 2) {
          firstName = firstName || parts[0]
          lastName = lastName || parts.slice(1).join(' ')
        } else if (parts.length === 1) {
          firstName = firstName || parts[0]
          lastName = lastName || parts[0]
        }
      }
    }

    if (!firstName || !lastName) {
      skipped++
      errors.push(`Line ${line}: missing first/last name — skipped.`)
      continue
    }

    if (firstName.length > 80 || lastName.length > 80) {
      skipped++
      errors.push(`Line ${line}: name too long — skipped.`)
      continue
    }

    rows.push({
      firstName,
      lastName,
      gradeLevel: get(iGrade) || null,
      email: get(iEmail) || null,
      className: get(iClass) || null,
      line,
    })
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push('No student rows found.')
  }

  return { rows, errors, skipped }
}

export const STUDENT_CSV_TEMPLATE = `first_name,last_name,grade_level,parent_email,class
Ava,Nguyen,5,parent.ava@example.com,5th Grade Homeroom
Noah,Patel,5,parent.noah@example.com,5th Grade Homeroom
`
