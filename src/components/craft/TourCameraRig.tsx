'use client'

import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { getRoomById, getRoomCenter, layoutBounds } from '@/lib/craft/campus'
import { useCraftUi } from './CraftUiContext'

type OrbitControlsImpl = {
  target: THREE.Vector3
  enabled: boolean
  autoRotate: boolean
  update: () => void
}

/** Orbit camera that honors teleports / guided tour stops. */
export function TourCameraRig() {
  const { camera } = useThree()
  const {
    layout,
    activeFloorId,
    cameraSnap,
    clearCameraSnap,
    highlightRoomId,
  } = useCraftUi()
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const autoRotateResume = useRef<ReturnType<typeof setTimeout> | null>(null)

  const bounds = layoutBounds(layout, activeFloorId)
  const cx = (bounds.minX + bounds.maxX) / 2
  const cz = (bounds.minZ + bounds.maxZ) / 2
  const span = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ)

  useEffect(() => {
    if (!cameraSnap) return
    const controls = controlsRef.current
    const lookAt = new THREE.Vector3(cameraSnap.x, 1.2, cameraSnap.z)
    const camPos = new THREE.Vector3(
      cameraSnap.x + span * 0.22,
      Math.max(10, cameraSnap.y + 12),
      cameraSnap.z + span * 0.28
    )
    camera.position.copy(camPos)
    if (controls) {
      controls.target.copy(lookAt)
      controls.autoRotate = false
      controls.update()
    }
    clearCameraSnap()
    if (autoRotateResume.current) clearTimeout(autoRotateResume.current)
    autoRotateResume.current = setTimeout(() => {
      if (controlsRef.current) controlsRef.current.autoRotate = true
    }, 12_000)
    return () => {
      if (autoRotateResume.current) clearTimeout(autoRotateResume.current)
    }
  }, [cameraSnap, camera, clearCameraSnap, span])

  // Soft look-at when only highlight changes (guided step without full snap)
  useEffect(() => {
    if (!highlightRoomId || cameraSnap) return
    const room = getRoomById(layout, highlightRoomId)
    if (!room) return
    const [rx, , rz] = getRoomCenter(layout, room)
    const controls = controlsRef.current
    if (!controls) return
    controls.target.set(rx, 1.2, rz)
    controls.autoRotate = false
    controls.update()
  }, [highlightRoomId, layout, cameraSnap])

  return (
    <OrbitControls
      ref={controlsRef as never}
      target={[cx, 2, cz]}
      enablePan
      enableDamping
      dampingFactor={0.08}
      minDistance={8}
      maxDistance={span * 1.4}
      maxPolarAngle={Math.PI / 2.15}
      autoRotate
      autoRotateSpeed={0.35}
    />
  )
}
