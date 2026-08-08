export type RatioMetric =
  | { state: 'ready'; active: number; eligible: number; percent: number }
  | { state: 'no_eligible'; active: 0; eligible: 0 }
  | { state: 'unavailable'; reason: string }

export type CountMetric =
  | { state: 'ready'; count: number }
  | { state: 'unavailable'; reason: string }

export type WorkflowMetric =
  | { state: 'ready'; primary: number; secondary: number }
  | { state: 'unavailable'; reason: string }

export type HelpfulnessMetric =
  | { state: 'ready'; helpful: number; total: number; percent: number }
  | { state: 'small_sample'; helpful: number; total: number; minimum: 5 }
  | { state: 'unavailable'; reason: string }

export type DeliveryMetric =
  | { state: 'ready'; delivered: number; failed: number; unsent: number }
  | { state: 'unavailable'; reason: string }

export type BaselineStatus =
  | { state: 'not_started' }
  | { state: 'gathering'; day: number }
  | { state: 'complete' }
  | { state: 'unavailable'; reason: string }

export interface PilotEvidenceScorecard {
  windowStart: string
  windowEnd: string
  feedbackWindowStart: string
  baseline: BaselineStatus
  activeTeachers: RatioMetric
  activeLinkedParents: RatioMetric
  attendanceActivity: WorkflowMetric
  gradeActivity: WorkflowMetric
  emailDelivery: DeliveryMetric
  parentHelpfulness: HelpfulnessMetric
  feedbackReceived: CountMetric
}
