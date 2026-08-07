import { getProfile } from '@/lib/auth'
import { TeacherEncouragementBanner } from '@/components/teacher/TeacherEncouragementBanner'
import { teacherEncouragementForDay } from '@/lib/teacher/encouragement'

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getProfile()

  if (profile?.role !== 'teacher') {
    return children
  }

  const encouragement = teacherEncouragementForDay(profile.id)

  return (
    <div className="page-stack animate-beacon-in">
      <TeacherEncouragementBanner
        initial={encouragement.item}
        initialIndex={encouragement.index}
      />
      {children}
    </div>
  )
}
