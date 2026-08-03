import { requirePrincipal } from '@/lib/principal'
import { listCameras } from '@/lib/school-modules/store'
import { CameraWall } from '@/components/principal/CameraWall'

export default async function PrincipalCamerasPage() {
  const { schoolId } = await requirePrincipal()
  const cameras = await listCameras(schoolId)

  return <CameraWall cameras={cameras} />
}
