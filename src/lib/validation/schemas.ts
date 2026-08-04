import { z } from 'zod'

export const uuidSchema = z.string().uuid()

export const attendanceStatusSchema = z.enum(['present', 'absent', 'tardy', 'excused'])

export const scanDirectionSchema = z.enum(['in', 'out'])

export const pulseLevelSchema = z.enum(['strong', 'steady', 'needs_care'])

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')

export const gradeRowSchema = z.object({
  assignment_id: z.string().min(1).max(80),
  student_id: z.string().uuid(),
  score: z.number().finite().min(-1000).max(1_000_000).nullable(),
  is_missing: z.boolean(),
  is_late: z.boolean().optional(),
  comments: z.string().max(2000).nullable().optional(),
})

export const gradesBatchSchema = z
  .array(gradeRowSchema)
  .min(1)
  .max(500)

export const attendanceRowSchema = z.object({
  studentId: z.string().uuid(),
  status: attendanceStatusSchema,
  note: z.string().max(500).optional(),
})

export const attendanceBatchSchema = z.object({
  classId: z.string().uuid(),
  date: isoDateSchema,
  rows: z.array(attendanceRowSchema).min(1).max(200),
})

export const pulseInputSchema = z.object({
  studentId: z.string().uuid(),
  overall: pulseLevelSchema,
  dimensions: z.record(z.string(), pulseLevelSchema).optional(),
  note: z.string().max(4000),
  celebrate: z.string().max(1000).optional(),
})

export const deviceScanBodySchema = z.object({
  deviceToken: z.string().min(12).max(120),
  code: z.string().min(4).max(80),
  roomId: z.string().uuid(),
  direction: z.enum(['in', 'out', 'auto']).optional(),
  deviceLabel: z.string().max(80).optional(),
})
