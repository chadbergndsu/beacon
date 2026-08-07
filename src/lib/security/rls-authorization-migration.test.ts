import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationsDir = join(process.cwd(), 'supabase', 'migrations')
const migrationNames = readdirSync(migrationsDir).filter((name) =>
  name.includes('_authorization_boundar')
)

if (migrationNames.length !== 2) throw new Error('authorization boundary migrations are missing')

const sql = migrationNames
  .sort()
  .map((name) => readFileSync(join(migrationsDir, name), 'utf8'))
  .join('\n')
const normalized = sql.replace(/\s+/g, ' ').trim()
const familyBillingSql = readFileSync(
  join(migrationsDir, '019_family_billing_portal.sql'),
  'utf8'
).replace(/\s+/g, ' ')
const helperHardeningSql = readFileSync(
  join(migrationsDir, '20260807150235_rls_helper_api_hardening.sql'),
  'utf8'
).replace(/\s+/g, ' ')
const parentPolicyRepairSql = readFileSync(
  join(migrationsDir, '20260807151612_repair_recursive_parent_policies.sql'),
  'utf8'
).replace(/\s+/g, ' ')

function policy(name: string): string {
  const start = normalized.indexOf(`CREATE POLICY "${name}"`)
  if (start === -1) throw new Error(`policy not found: ${name}`)
  const end = normalized.indexOf(';', start)
  return normalized.slice(start, end + 1)
}

describe('authorization boundaries migration', () => {
  it('includes the recursion-safe tenant helper required by manual pilot schemas', () => {
    expect(normalized).toContain(
      'CREATE OR REPLACE FUNCTION public.student_in_my_school(p_student_id UUID)'
    )
    expect(normalized).toContain('SECURITY DEFINER')
    expect(normalized).toContain('SELECT auth.uid() IS NOT NULL AND EXISTS')
    expect(normalized).toContain('s.school_id = public.get_user_school_id()')
    expect(normalized).toContain(
      'CREATE OR REPLACE FUNCTION public.teaches_class(p_class_id UUID)'
    )
    expect(normalized).toContain('c.teacher_id = auth.uid()')
  })

  it('removes every historical broad roster policy before replacing it', () => {
    for (const name of [
      'School isolation students',
      'staff_students_all',
      'School isolation classes',
      'staff_classes_all',
      'School isolation enrollments',
      'staff_enrollments_all',
    ]) {
      expect(normalized).toContain(`DROP POLICY IF EXISTS "${name}"`)
    }
  })

  it('gives teachers read-only student access through owned-class enrollment', () => {
    const studentPolicy = policy('teacher_students_select')
    expect(studentPolicy).toContain('FOR SELECT TO authenticated')
    expect(studentPolicy).toContain("get_user_role()) = 'teacher'")
    expect(studentPolicy).toContain('FROM public.enrollments e')
    expect(studentPolicy).toContain('public.teaches_class(e.class_id)')
  })

  it('limits teacher class and enrollment writes to owned classes', () => {
    const classPolicy = policy('teacher_own_classes_all')
    expect(classPolicy).toContain('teacher_id = (SELECT auth.uid())')
    expect(classPolicy).toContain('WITH CHECK')

    const enrollmentPolicy = policy('teacher_own_enrollments_all')
    expect(enrollmentPolicy).toContain('public.teaches_class(class_id)')
    expect(enrollmentPolicy).toContain('public.student_in_my_school(student_id)')
    expect(enrollmentPolicy).toContain('WITH CHECK')
  })

  it('keeps school-wide roster management away from teacher and parent roles', () => {
    for (const name of [
      'school_leadership_students_all',
      'school_leadership_classes_all',
      'school_leadership_enrollments_all',
    ]) {
      const leadershipPolicy = policy(name)
      expect(leadershipPolicy).toContain("IN ('admin', 'staff', 'principal')")
      expect(leadershipPolicy).not.toMatch(/IN \([^)]*'teacher'/)
      expect(leadershipPolicy).not.toMatch(/IN \([^)]*'parent'/)
      expect(leadershipPolicy).toContain('WITH CHECK')
    }
  })

  it('defines the billing boundary as principal/admin only', () => {
    const helper = normalized.match(
      /CREATE OR REPLACE FUNCTION private\.is_school_billing_admin\(\).*?AS \$\$(.*?)\$\$;/
    )?.[1]

    expect(helper).toContain("p.role IN ('admin', 'principal')")
    expect(helper).not.toContain("'staff'")
    expect(helper).not.toContain("'teacher'")
  })

  it('applies the narrow billing helper to every billing write policy', () => {
    for (const name of [
      'Leadership manage QB connection',
      'Leadership manage products',
      'Leadership manage invoices',
      'Leadership manage payments',
      'Leadership manage payment plans',
      'Leadership manage schedules',
    ]) {
      const billingPolicy = policy(name)
      expect(billingPolicy).toContain('TO authenticated')
      expect(billingPolicy).toContain('private.is_school_billing_admin()')
      expect(billingPolicy).toContain('WITH CHECK')
      expect(billingPolicy).not.toContain('is_school_leadership()')
    }
  })

  it('preserves the narrow boundary when optional billing tables are added later', () => {
    expect(familyBillingSql).toContain(
      "p.role IN ('admin', 'principal')"
    )
    expect(familyBillingSql).toContain(
      'CREATE POLICY "Leadership manage payment plans" ON billing_payment_plans FOR ALL TO authenticated'
    )
    expect(familyBillingSql).toContain(
      'CREATE POLICY "Leadership manage schedules" ON billing_schedules FOR ALL TO authenticated'
    )
    expect(familyBillingSql.match(/private\.is_school_billing_admin\(\)/g)).toHaveLength(7)
    expect(familyBillingSql).not.toContain('is_school_leadership()')
  })

  it('removes policy helpers from the exposed public RPC schema', () => {
    for (const helper of [
      'get_user_role()',
      'get_user_school_id()',
      'is_school_leadership()',
      'is_parent_of(UUID)',
      'parent_can_view_class(UUID)',
      'parent_of_student(UUID)',
      'student_in_my_school(UUID)',
      'teaches_class(UUID)',
    ]) {
      expect(helperHardeningSql).toContain(
        `ALTER FUNCTION public.${helper} SET SCHEMA private`
      )
    }
    expect(helperHardeningSql).toContain(
      'REVOKE ALL ON FUNCTION private.student_in_my_school(UUID) FROM PUBLIC, anon'
    )
    expect(helperHardeningSql).toContain(
      'CREATE OR REPLACE FUNCTION private.parent_in_my_school(p_parent_id UUID)'
    )
    expect(helperHardeningSql).toContain(
      "SET search_path = ''"
    )
  })

  it('repairs recursive parent policies through private helpers', () => {
    expect(parentPolicyRepairSql).toContain(
      'CREATE POLICY "Parents see linked students" ON public.students FOR SELECT TO authenticated USING (private.is_parent_of(id))'
    )
    expect(parentPolicyRepairSql).toContain(
      'CREATE POLICY "School staff manage parent links" ON public.parent_students FOR ALL TO authenticated'
    )
    expect(parentPolicyRepairSql).toContain('private.student_in_my_school(student_id)')
    expect(parentPolicyRepairSql).toContain('private.parent_in_my_school(parent_id)')
    expect(parentPolicyRepairSql).toContain('WITH CHECK')
    expect(parentPolicyRepairSql).not.toContain('FROM public.students')
  })
})
