/* eslint-disable react-hooks/immutability -- R3F useFrame moves the Three.js camera each tick */
'use client'

import { useEffect, useRef, type ComponentRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import * as THREE from 'three'
import { getRoomById, getRoomCenter } from '@/lib/craft/layout'
import { useCraftUi } from './CraftUiContext'

const MOVE_SPEED = 6
const FLY_SPEED = 10

export function PlayerController() {
  const { camera } = useThree()
  const {
    flyMode,
    setPlayer,
    teleportRoomId,
    requestTeleport,
    layout,
    setPointerLocked,
  } = useCraftUi()
  const controlsRef = useRef<ComponentRef<typeof PointerLockControls>>(null)
  const keys = useRef<Record<string, boolean>>({})

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true
    }
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  useEffect(() => {
    if (!teleportRoomId) return
    const room = getRoomById(layout, teleportRoomId)
    if (!room) {
      requestTeleport(null)
      return
    }
    const [cx, cy, cz] = getRoomCenter(room)
    camera.position.set(cx, cy + 0.5, cz)
    requestTeleport(null)
  }, [teleportRoomId, layout, camera, requestTeleport])

  useFrame((_, delta) => {
    const speed = (flyMode ? FLY_SPEED : MOVE_SPEED) * delta
    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)
    forward.y = flyMode ? forward.y : 0
    forward.normalize()

    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize()
    const move = new THREE.Vector3()

    if (keys.current.KeyW) move.add(forward)
    if (keys.current.KeyS) move.sub(forward)
    if (keys.current.KeyA) move.sub(right)
    if (keys.current.KeyD) move.add(right)

    if (flyMode) {
      if (keys.current.Space) move.y += 1
      if (keys.current.ShiftLeft || keys.current.ShiftRight) move.y -= 1
    }

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed)
      camera.position.add(move)
    }

    if (!flyMode) {
      camera.position.y = 2
    }

    camera.position.x = THREE.MathUtils.clamp(camera.position.x, 0, 48)
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, 0, 36)
    if (flyMode) {
      camera.position.y = THREE.MathUtils.clamp(camera.position.y, 1, 12)
    }

    setPlayer({ x: camera.position.x, y: camera.position.y, z: camera.position.z })
  })

  return (
    <PointerLockControls
      ref={controlsRef}
      onLock={() => setPointerLocked(true)}
      onUnlock={() => setPointerLocked(false)}
    />
  )
}
