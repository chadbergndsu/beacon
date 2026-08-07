import { NextResponse } from 'next/server'
import { requireCraftProfile } from '@/lib/craft/auth-api'
import { canTriggerMockScans } from '@/lib/craft/presence'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const auth = await requireCraftProfile()
  if (!auth.ok) return auth.response
  if (!canTriggerMockScans(auth.profile.role)) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('students')
    .select('id, first_name, last_name, grade_level')
    .eq('school_id', auth.profile.school_id!)
    .eq('active', true)
    .order('last_name')
    .limit(200)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    students: (data ?? []).map((s) => ({
      id: s.id as string,
      name: `${s.first_name} ${s.last_name}`,
      gradeLevel: (s.grade_level as string | null) ?? null,
    })),
  })
}
