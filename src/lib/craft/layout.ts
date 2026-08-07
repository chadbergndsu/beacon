import type { CraftCampusLayout, CraftRoomDef } from './types'
import { CRAFT_DEMO_ROOM_IDS } from './demo-ids'

export { CRAFT_DEMO_ROOM_IDS } from './demo-ids'
export {
  allRooms,
  buildRoomIdMap,
  getDefaultFloorId,
  getFloor,
  getRoomById,
  getRoomByName,
  getRoomCenter,
  getRoomFloorId,
  invertRoomIdMap,
  layoutBounds,
  normalizeCampusLayout,
  portalsOnFloor,
} from './campus'

function room(
  roomId: string,
  name: string,
  kind: CraftRoomDef['kind'],
  origin: [number, number, number],
  size: [number, number, number],
  color: string
): CraftRoomDef {
  return { roomId, name, kind, origin, size, color }
}

/** Two-floor pilot campus — editable via Go-live layout editor or JSON import. */
export const DEMO_SCHOOL_LAYOUT: CraftCampusLayout = {
  version: 2,
  id: 'demo-pilot-campus',
  name: 'Pilot Elementary',
  blockSize: 1,
  floors: [
    {
      floorId: 'floor-1',
      name: 'Floor 1',
      elevationY: 0,
      rooms: [
        room(CRAFT_DEMO_ROOM_IDS.entrance, 'Main Entrance', 'other', [18, 0, 28], [12, 4, 4], '#cbd5e1'),
        room(CRAFT_DEMO_ROOM_IDS.hall, 'Main Hall', 'other', [20, 0, 8], [8, 4, 20], '#e2e8f0'),
        room(CRAFT_DEMO_ROOM_IDS.room101, 'Room 101', 'classroom', [4, 0, 16], [14, 4, 10], '#bfdbfe'),
        room(CRAFT_DEMO_ROOM_IDS.room102, 'Room 102', 'classroom', [4, 0, 4], [14, 4, 10], '#93c5fd'),
        room(CRAFT_DEMO_ROOM_IDS.room103, 'Room 103', 'classroom', [30, 0, 16], [14, 4, 10], '#bbf7d0'),
        room(CRAFT_DEMO_ROOM_IDS.office, 'Front Office', 'office', [30, 0, 4], [14, 4, 10], '#fde68a'),
        room(CRAFT_DEMO_ROOM_IDS.gym, 'Gymnasium', 'gym', [30, 0, 28], [14, 5, 8], '#fca5a5'),
      ],
    },
    {
      floorId: 'floor-2',
      name: 'Floor 2',
      elevationY: 5,
      rooms: [
        room('craft-demo-floor2-hall', 'Upper Hall', 'other', [20, 0, 8], [8, 4, 20], '#e2e8f0'),
        room('craft-demo-room-201', 'Room 201', 'classroom', [4, 0, 16], [14, 4, 10], '#c4b5fd'),
        room('craft-demo-room-202', 'Room 202', 'classroom', [4, 0, 4], [14, 4, 10], '#a78bfa'),
        room('craft-demo-room-203', 'Media Lab', 'classroom', [30, 0, 16], [14, 4, 10], '#86efac'),
        room('craft-demo-room-204', 'Staff Lounge', 'office', [30, 0, 4], [14, 4, 10], '#fcd34d'),
      ],
    },
  ],
  portals: [
    {
      portalId: 'portal-stairs-main',
      kind: 'stairs',
      floorId: 'floor-1',
      origin: [22, 0, 14],
      size: [4, 4, 3],
      targetFloorId: 'floor-2',
      targetRoomId: 'craft-demo-floor2-hall',
      label: 'Stairs up',
    },
    {
      portalId: 'portal-stairs-main-down',
      kind: 'stairs',
      floorId: 'floor-2',
      origin: [22, 0, 14],
      size: [4, 4, 3],
      targetFloorId: 'floor-1',
      targetRoomId: CRAFT_DEMO_ROOM_IDS.hall,
      label: 'Stairs down',
    },
    {
      portalId: 'portal-elevator',
      kind: 'elevator',
      floorId: 'floor-1',
      origin: [26, 0, 10],
      size: [2.5, 4, 2.5],
      targetFloorId: 'floor-2',
      targetRoomId: 'craft-demo-floor2-hall',
      label: 'Elevator',
    },
    {
      portalId: 'portal-elevator-up',
      kind: 'elevator',
      floorId: 'floor-2',
      origin: [26, 0, 10],
      size: [2.5, 4, 2.5],
      targetFloorId: 'floor-1',
      targetRoomId: CRAFT_DEMO_ROOM_IDS.hall,
      label: 'Elevator',
    },
  ],
}
