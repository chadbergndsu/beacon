export type AttendanceStatus = 'present' | 'absent' | 'tardy' | 'excused'

export type AttendanceRecord = {
  id: string
  schoolId: string
  classId: string
  studentId: string
  date: string
  status: AttendanceStatus
  note?: string
  markedBy?: string
}

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  tardy: 'Tardy',
  excused: 'Excused',
}
