import { requirePrincipal } from '@/lib/principal'
import { listVideos } from '@/lib/school-modules/store'
import { VideoLibrary } from '@/components/principal/VideoLibrary'

export default async function PrincipalVideosPage() {
  const { schoolId } = await requirePrincipal()
  const videos = await listVideos(schoolId)

  return <VideoLibrary videos={videos} />
}
