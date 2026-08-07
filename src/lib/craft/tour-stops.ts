import { CRAFT_DEMO_ROOM_IDS } from './demo-ids'

export type TourStop = {
  id: string
  title: string
  blurb: string
  roomId: string
}

/** Ordered public tour stops — matches rooms that exist in the demo layout. */
export const TOUR_STOPS: readonly TourStop[] = [
  {
    id: 'entrance',
    title: 'Main entrance',
    blurb: 'Where families arrive and check in for the day.',
    roomId: CRAFT_DEMO_ROOM_IDS.entrance,
  },
  {
    id: 'hall',
    title: 'Main hall',
    blurb: 'The spine of the building — classrooms branch off here.',
    roomId: CRAFT_DEMO_ROOM_IDS.hall,
  },
  {
    id: 'room101',
    title: 'Classroom 101',
    blurb: 'A typical primary classroom block with live presence markers.',
    roomId: CRAFT_DEMO_ROOM_IDS.room101,
  },
  {
    id: 'office',
    title: 'Front office',
    blurb: 'Where Marian and Chris keep the school running day to day.',
    roomId: CRAFT_DEMO_ROOM_IDS.office,
  },
  {
    id: 'gym',
    title: 'Gymnasium',
    blurb: 'PE, assemblies, and rainy-day recess under one roof.',
    roomId: CRAFT_DEMO_ROOM_IDS.gym,
  },
]
