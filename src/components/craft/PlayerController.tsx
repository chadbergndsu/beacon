/* eslint-disable react-hooks/immutability -- R3F useFrame moves the Three.js camera each tick */
'use client'

import { useEffect, useRef, type ComponentRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import * as THREE from 'three'
import { getRoomById, getRoomCenter } from '@/lib/craft/layout'
import { clampToBounds, resolvePlayerCollision } from '@/lib/craft/collision'
import { useCraftUi } from './CraftUiContext'

const WALK_SPEED = 7
const SPRINT_SPEED = 11
const FLY_SPEED = 14
const LOOK_SENS = 0.0022

export function PlayerController() {
  const { camera } = useThree()
  const {
    flyMode,
    setPlayer,
    teleportRoomId,
    requestTeleport,
    layout,
    geometry,
    setPointerLocked,
    pointerLocked,
    touchMove,
    touchLookRef,
  } = useCraftUi()
  const controlsRef = useRef<ComponentRef<typeof PointerLockControls>>(null)
  const keys = useRef<Record<string, boolean>>({})
  const velocity = useRef(new THREE.Vector3())
  const yaw = useRef(0)
  const pitch = useRef(0)

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
    velocity.current.set(0, 0, 0)
    requestTeleport(null)
  }, [teleportRoomId, layout, camera, requestTeleport])

  useFrame((_, delta) => {
    camera.rotation.order = 'YXZ'

    if (!pointerLocked) {
      const look = touchLookRef.current
      if (look.dx || look.dy) {
        yaw.current -= look.dx * LOOK_SENS
        pitch.current = THREE.MathUtils.clamp(pitch.current - look.dy * LOOK_SENS, -1.45, 1.45)
        look.dx = 0
        look.dy = 0
      }
      camera.rotation.y = yaw.current
      camera.rotation.x = pitch.current
    } else {
      yaw.current = camera.rotation.y
      pitch.current = camera.rotation.x
    }

    const sprint =
      !flyMode &&
      (keys.current.ShiftLeft || keys.current.ShiftRight) &&
      !(keys.current.Space)
    const maxSpeed = flyMode ? FLY_SPEED : sprint ? SPRINT_SPEED : WALK_SPEED

    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)
    forward.y = flyMode ? forward.y : 0
    if (forward.lengthSq() > 0) forward.normalize()

    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize()
    const wish = new THREE.Vector3()

    if (keys.current.KeyW) wish.add(forward)
    if (keys.current.KeyS) wish.sub(forward)
    if (keys.current.KeyA) wish.sub(right)
    if (keys.current.KeyD) wish.add(right)

    if (touchMove.x || touchMove.y) {
      wish.add(right.clone().multiplyScalar(touchMove.x))
      wish.add(forward.clone().multiplyScalar(-touchMove.y))
    }

    if (flyMode) {
      if (keys.current.Space) wish.y += 1
      if (keys.current.ShiftLeft || keys.current.ShiftRight) wish.y -= 1
    }

    const target = wish.lengthSq() > 0 ? wish.normalize().multiplyScalar(maxSpeed) : new THREE.Vector3()
    velocity.current.lerp(target, flyMode ? 0.18 : 0.22)
    const step = velocity.current.clone().multiplyScalar(delta)

    const prev = { x: camera.position.x, z: camera.position.z }
    let nextX = prev.x + step.x
    let nextZ = prev.z + step.z

    if (!flyMode) {
      const resolved = resolvePlayerCollision(prev, { x: nextX, z: nextZ }, geometry.collision)
      nextX = resolved.x
      nextZ = resolved.z
      const clamped = clampToBounds(nextX, nextZ, geometry.bounds)
      nextX = clamped.x
      nextZ = clamped.z
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, 2, 0.35)
    } else {
      camera.position.y += step.y
      camera.position.y = THREE.MathUtils.clamp(camera.position.y, 1, 12)
    }

    camera.position.x = nextX
    camera.position.z = nextZ

    setPlayer({
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      yaw: yaw.current,
      pitch: pitch.current,
    })
  })

  return (
    <PointerLockControls
      ref={controlsRef}
      onLock={() => setPointerLocked(true)}
      onUnlock={() => setPointerLocked(false)}
    />
  )
}
