import type { ScreenId, SectionDef } from './types'

/**
 * Catalog of configurable sections per screen.
 * Pages only render sections that apply to the current role; missing
 * section elements are simply skipped at resolve time.
 */
export const SCREEN_CATALOG: Record<ScreenId, { title: string; sections: SectionDef[] }> = {
  dashboard: {
    title: 'Home',
    sections: [
      {
        id: 'quick_mobile',
        label: 'Mobile quick mode',
        description: 'Phone banner to Teacher Quick Mode',
      },
      {
        id: 'principal_banner',
        label: 'Principal welcome',
        description: 'Leadership shortcuts',
      },
      {
        id: 'header',
        label: 'Welcome header',
        locked: true,
      },
      {
        id: 'teacher_encouragement',
        label: 'Teacher encouragement',
        description: 'Random saying or scripture — tap for another',
      },
      {
        id: 'teacher_today',
        label: "Today's focus",
        description: 'Missing work rollup for your classes',
      },
      {
        id: 'classes',
        label: 'Classes',
      },
      {
        id: 'parent_billing',
        label: 'Balances & pay',
      },
      {
        id: 'parent_missing',
        label: 'Family missing work',
      },
      {
        id: 'children',
        label: 'Your children',
      },
      {
        id: 'parent_feed',
        label: 'Family feed',
      },
      {
        id: 'parent_feedback',
        label: 'Weekly parent feedback',
        description: 'One-tap helpfulness check with an optional note',
      },
      {
        id: 'announcements',
        label: 'Announcements',
      },
    ],
  },
  teacher_quick: {
    title: 'Quick mode',
    sections: [
      { id: 'header', label: 'Header', locked: true },
      { id: 'class_picker', label: 'Class picker', locked: true },
      { id: 'mode_tabs', label: 'Attendance / scores / pulse tabs', locked: true },
      { id: 'work_surface', label: 'Main work surface', locked: true },
      { id: 'hints', label: 'Tips & shortcuts' },
    ],
  },
  teacher_printables: {
    title: 'Printables',
    sections: [
      { id: 'hub_header', label: 'Printables header', locked: true },
      {
        id: 'score_sheets',
        label: 'Weekly test & quiz score sheets',
        description: 'Parent signature send-home',
      },
      {
        id: 'birthday_coupons',
        label: 'Birthday Coupon Book',
        description: 'Student birthday freebies',
      },
    ],
  },
  teacher_lessons: {
    title: 'Lesson plans',
    sections: [
      { id: 'header', label: 'Header', locked: true },
      { id: 'planner', label: 'Day / week planner' },
      { id: 'plans_list', label: 'Saved plans' },
    ],
  },
  class_gradebook: {
    title: 'Class',
    sections: [
      { id: 'header', label: 'Class header', locked: true },
      { id: 'tabs', label: 'Class tabs', locked: true },
      { id: 'missing_work', label: 'Missing work radar' },
      { id: 'roster_chips', label: 'Student quick links' },
      { id: 'grade_entry', label: 'Grade entry & parent preview' },
      { id: 'setup', label: 'Categories & assignments setup' },
      { id: 'lessons', label: 'Lesson plans panel' },
      { id: 'pulse', label: 'Pulse panel' },
      { id: 'attendance', label: 'Attendance panel' },
    ],
  },
  student_overview: {
    title: 'Student',
    sections: [
      { id: 'header', label: 'Student header', locked: true },
      { id: 'dinner_table', label: 'Dinner Table Digest' },
      { id: 'missing_work', label: 'Missing work' },
      { id: 'pulse', label: 'Pulse timeline' },
      { id: 'grades', label: 'Class grades' },
    ],
  },
  principal_overview: {
    title: 'Principal office',
    sections: [
      { id: 'daily_tasks', label: 'Daily tasks' },
      { id: 'beacon_signal', label: 'Beacon Signal' },
      { id: 'stats', label: 'School stats' },
      { id: 'quickbooks', label: 'QuickBooks card' },
      { id: 'announcements', label: 'Recent announcements' },
      { id: 'shortcuts', label: 'Office shortcuts' },
    ],
  },
  admin_comms: {
    title: 'Communications',
    sections: [
      { id: 'header', label: 'Comms header', locked: true },
      { id: 'compose', label: 'Compose message' },
      { id: 'test_email', label: 'Test email' },
      { id: 'test_slack', label: 'Slack test' },
      { id: 'outbox', label: 'Email outbox' },
      { id: 'tips', label: 'Delivery tips' },
    ],
  },
  announcements: {
    title: 'Announcements',
    sections: [
      { id: 'header', label: 'Header', locked: true },
      { id: 'list', label: 'Announcement list' },
      { id: 'system_email', label: 'System email tools' },
    ],
  },
}

export function getScreenCatalog(screenId: ScreenId) {
  return SCREEN_CATALOG[screenId]
}

export function defaultLayoutForScreen(screenId: ScreenId): {
  order: string[]
  hidden: string[]
} {
  const sections = SCREEN_CATALOG[screenId].sections
  return {
    order: sections.map((s) => s.id),
    hidden: sections.filter((s) => s.defaultVisible === false).map((s) => s.id),
  }
}
