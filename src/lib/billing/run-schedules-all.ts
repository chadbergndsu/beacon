/**
 * Run due recurring billing schedules across schools (cron entrypoint).
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { runDueBillingSchedules } from '@/lib/billing/store'
import { reportError } from '@/lib/ops/report-error'

export type CronSchedulesResult = {
  schoolsProcessed: number
  invoicesCreated: number
  errors: string[]
}

export async function runDueBillingSchedulesAllSchools(): Promise<CronSchedulesResult> {
  const admin = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: due, error } = await admin
    .from('billing_schedules')
    .select('school_id')
    .eq('active', true)
    .lte('next_run_on', today)
    .limit(500)

  if (error) {
    if (
      (error.message || '').toLowerCase().includes('does not exist') ||
      error.code === '42P01' ||
      error.code === 'PGRST205'
    ) {
      return {
        schoolsProcessed: 0,
        invoicesCreated: 0,
        errors: ['billing_schedules missing — apply migration 019'],
      }
    }
    reportError(error, { surface: 'cron-schedules-list' })
    return { schoolsProcessed: 0, invoicesCreated: 0, errors: [error.message] }
  }

  const schoolIds = [...new Set((due || []).map((r) => String(r.school_id)).filter(Boolean))]
  let invoicesCreated = 0
  const errors: string[] = []

  for (const schoolId of schoolIds) {
    try {
      const r = await runDueBillingSchedules(schoolId)
      invoicesCreated += r.created
      for (const e of r.errors) errors.push(`${schoolId.slice(0, 8)}: ${e}`)
      await admin.from('audit_logs').insert({
        school_id: schoolId,
        user_id: null,
        action: 'billing.schedules_cron',
        table_name: 'billing_schedules',
        details: { created: r.created, errors: r.errors },
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'schedule run failed'
      errors.push(`${schoolId.slice(0, 8)}: ${msg}`)
      reportError(e, { surface: 'cron-schedules-school', schoolId })
    }
  }

  return {
    schoolsProcessed: schoolIds.length,
    invoicesCreated,
    errors: errors.slice(0, 50),
  }
}
