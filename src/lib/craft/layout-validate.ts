import { z } from 'zod'
import { normalizeCampusLayout } from './campus'
import type { CraftCampusLayout } from './types'

const tuple3 = z.tuple([z.number(), z.number(), z.number()])

const roomSchema = z.object({
  roomId: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(['classroom', 'aftercare', 'office', 'gym', 'other']),
  origin: tuple3,
  size: tuple3,
  color: z.string().min(1),
})

const portalSchema = z.object({
  portalId: z.string().min(1),
  kind: z.enum(['stairs', 'elevator']),
  floorId: z.string().min(1),
  origin: tuple3,
  size: tuple3,
  targetFloorId: z.string().min(1),
  targetRoomId: z.string().min(1).optional(),
  label: z.string().min(1),
})

const floorSchema = z.object({
  floorId: z.string().min(1),
  name: z.string().min(1),
  elevationY: z.number(),
  rooms: z.array(roomSchema).min(1),
})

export const craftCampusSchemaV2 = z.object({
  version: z.literal(2),
  id: z.string().min(1),
  name: z.string().min(1),
  blockSize: z.number().positive(),
  floors: z.array(floorSchema).min(1),
  portals: z.array(portalSchema).default([]),
})

export const craftLayoutSchemaV1 = z.object({
  version: z.literal(1),
  id: z.string().min(1),
  name: z.string().min(1),
  blockSize: z.number().positive(),
  floorY: z.number(),
  rooms: z.array(roomSchema).min(1),
})

export function parseCraftLayout(input: unknown): CraftCampusLayout | null {
  const v2 = craftCampusSchemaV2.safeParse(input)
  if (v2.success) return v2.data
  const v1 = craftLayoutSchemaV1.safeParse(input)
  if (v1.success) return normalizeCampusLayout(v1.data)
  return normalizeCampusLayout(input)
}
