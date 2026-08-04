import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'
import { isSchoolStaff } from '@/lib/roles'
import { loadSchoolBrand } from '@/lib/school-brand'
import { BirthdayCouponBook } from '@/components/printables/BirthdayCouponBook'

export default async function TeacherPrintablesPage() {
  const { profile } = await getProfile()
  if (!profile || !isSchoolStaff(profile.role)) {
    redirect('/dashboard')
  }

  const brand = await loadSchoolBrand(profile.school_id)

  return (
    <div className="space-y-6">
      <p className="print:hidden text-xs font-semibold uppercase tracking-wide text-sky-700">
        <Link href="/dashboard" className="hover:underline">
          Dashboard
        </Link>
        {' / '}
        Teacher printables
      </p>
      <BirthdayCouponBook
        defaultTeacherName={profile.full_name || ''}
        schoolName={brand.name}
      />
    </div>
  )
}
