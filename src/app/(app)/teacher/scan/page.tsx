import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'
import { isSchoolStaff } from '@/lib/roles'
import { StaffScanner } from '@/components/badge/StaffScanner'

export default async function TeacherScanPage() {
  const { profile } = await getProfile()
  if (!profile || !isSchoolStaff(profile.role)) {
    redirect('/dashboard')
  }
  return <StaffScanner />
}
