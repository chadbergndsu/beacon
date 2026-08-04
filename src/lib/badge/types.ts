export type RoomKind = 'classroom' | 'aftercare' | 'office' | 'gym' | 'other'
export type ScanDirection = 'in' | 'out'
export type ScanPurpose = 'attendance' | 'aftercare' | 'general'
export type AftercareStatus = 'open' | 'closed' | 'billed' | 'void'

export type SchoolRoom = {
  id: string
  schoolId: string
  name: string
  kind: RoomKind
  classId: string | null
  billable: boolean
  rateCentsPerHour: number
  active: boolean
  sortOrder: number
}

export type BadgeScan = {
  id: string
  schoolId: string
  studentId: string
  roomId: string | null
  direction: ScanDirection
  purpose: ScanPurpose
  scannedAt: string
  source: string
  kioskLabel: string | null
  sessionId: string | null
}

export type AftercareSession = {
  id: string
  schoolId: string
  studentId: string
  roomId: string | null
  checkInAt: string
  checkOutAt: string | null
  minutes: number | null
  rateCentsPerHour: number
  amountCents: number | null
  status: AftercareStatus
  invoiceId: string | null
}

export type StudentBadge = {
  id: string
  firstName: string
  lastName: string
  gradeLevel: string | null
  badgeCode: string
  schoolName: string
}

export type ScanResult = {
  ok: true
  studentName: string
  direction: ScanDirection
  purpose: ScanPurpose
  roomName: string
  message: string
  aftercareMinutes?: number | null
  amountCents?: number | null
  attendanceMarked?: boolean
} | {
  ok: false
  error: string
}
