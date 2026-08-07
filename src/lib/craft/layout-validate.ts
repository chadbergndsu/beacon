import { z } from 'zod'
import type { CraftFloorLayout } from './types'

const tuple3 = z.tuple([z.number(), z.number(), z.number()])

const roomSchema = z.object({
  roomId: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(['classroom', 'aftercare', 'office', 'gym', 'other']),
  origin: tuple3,
  size: tuple3,
  color: z.string().min(1),
})

export const craftLayoutSchema = z.object({
  version: z.literal(1),
  id: z.string().min(1),
  name: z.string().min(1),
  blockSize: z.number().positive(),
  floorY: z.number(),
  rooms: z.array(roomSchema).min(1),
})

export function parseCraftLayout(input: unknown): CraftFloorLayout | null {
  const parsed = craftLayoutSchema.safeParse(input)
  return parsed.success ? parsed.data : null
}
