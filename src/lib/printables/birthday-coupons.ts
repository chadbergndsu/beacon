/**
 * Birthday Coupon Book — printable classroom freebies for elementary teachers.
 * No DB required; filled in on the print page and printed/saved as PDF.
 */

export type BirthdayCoupon = {
  id: string
  title: string
  blurb: string
  emoji: string
}

/** Default pack aimed at 4th / 5th grade classroom culture. */
export const BIRTHDAY_COUPONS: BirthdayCoupon[] = [
  {
    id: 'homework_pass',
    title: 'Free homework pass',
    blurb: 'Skip one homework assignment (still show up ready to learn).',
    emoji: '📝',
  },
  {
    id: 'sit_anywhere',
    title: 'Sit anywhere',
    blurb: 'Choose your seat for one class period.',
    emoji: '💺',
  },
  {
    id: 'snack_anytime',
    title: 'Snack anytime',
    blurb: 'Enjoy a quiet snack during independent work (once).',
    emoji: '🍎',
  },
  {
    id: 'water_bottle',
    title: 'Water bottle at desk',
    blurb: 'Keep a water bottle at your desk all day.',
    emoji: '💧',
  },
  {
    id: 'mascot',
    title: 'Class mascot at desk',
    blurb: 'Borrow the class mascot for a full day.',
    emoji: '🧸',
  },
  {
    id: 'recess_choice',
    title: 'Recess choice',
    blurb: 'Pick the recess game or activity (once).',
    emoji: '⚽',
  },
  {
    id: 'line_leader',
    title: 'Line leader',
    blurb: 'Lead the line for a full day.',
    emoji: '🚶',
  },
  {
    id: 'cushion',
    title: 'Cushion at desk',
    blurb: 'Use a cushion or flexible seating for a day.',
    emoji: '🪑',
  },
  {
    id: 'messy_desk',
    title: 'Messy desk recess pass',
    blurb: 'Go to recess without cleaning your desk first (once).',
    emoji: '📚',
  },
  {
    id: 'tell_story',
    title: 'Tell a story during class',
    blurb: 'Share a short story with the class (teacher picks the moment).',
    emoji: '🎤',
  },
]

export function couponCount(): number {
  return BIRTHDAY_COUPONS.length
}
