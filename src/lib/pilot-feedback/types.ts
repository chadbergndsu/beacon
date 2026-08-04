export type FeedbackCategory = 'idea' | 'issue' | 'question' | 'other'
export type FeedbackStatus = 'new' | 'reviewed' | 'planned' | 'done' | 'wont_do'

export type PilotFeedback = {
  id: string
  schoolId: string | null
  userId: string | null
  role: string | null
  category: FeedbackCategory
  message: string
  pagePath: string | null
  pageTitle: string | null
  status: FeedbackStatus
  staffNotes: string | null
  createdAt: string
  submitterName?: string | null
  submitterEmail?: string | null
}

export const FEEDBACK_CATEGORY_LABEL: Record<FeedbackCategory, string> = {
  idea: 'Idea',
  issue: 'Something broken',
  question: 'Question',
  other: 'Other',
}

export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  planned: 'Planned',
  done: 'Done',
  wont_do: "Won't do",
}
