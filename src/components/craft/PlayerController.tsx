/* eslint-disable react-hooks/immutability -- R3F useFrame moves the Three.js camera each tick */
'use client'

import { useEffect, useRef, type ComponentRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import * as THREE from 'three'
import { portalsOnFloor, worldPortalAabb, getRoomById, getRoomCenter } from '@/lib/craft/campus'
import { clampToBounds, resolvePlayerCollision } from '@/lib/craft/collision'
import { useCraftUi } from './CraftUiContext'

const WALK_SPEED = 7
const SPRINT_SPEED = 11
const FLY_SPEED = 14
const LOOK_SENS = 0.0022
const PORTAL_COOLDOWN_MS = 900
const FOLLOW_MS = 4500

export function PlayerController() {
  const { camera } = useThree()
  const {
    flyMode,
    setPlayer,
    teleportRoomId,
    requestTeleport,
    cameraSnap,
    clearCameraSnap,
    layout,
    geometry,
    activeFloorId,
    switchFloor,
    setPointerLocked,
    pointerLocked,
    touchMove,
    touchLookRef,
    markers,
    followMarkerId,
    setFollowMarkerId,
  } = useCraftUi()
  const controlsRef = useRef<ComponentRef<typeof PointerLockControls>>(null)
  const keys = useRef<Record<string, boolean>>({})
  const velocity = useRef(new THREE.Vector3())
  const yaw = useRef(0)
  const pitch = useRef(0)
  const portalCooldown = useRef(0)
  const followUntil = useRef(0)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true
      if (
        e.code === 'ArrowUp' ||
        e.code === 'ArrowDown' ||
        e.code === 'ArrowLeft' ||
        e.code === 'ArrowRight'
      ) {
        e.preventDefault()
      }
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

  // Apply one-shot camera snaps from teleports / floor portals
  useEffect(() => {
    if (!cameraSnap) return
    camera.position.set(cameraSnap.x, cameraSnap.y, cameraSnap.z)
    yaw.current = cameraSnap.yaw
    pitch.current = cameraSnap.pitch
    camera.rotation.order = 'YXZ'
    camera.rotation.y = cameraSnap.yaw
    camera.rotation.x = cameraSnap.pitch
    velocity.current.set(0, 0, 0)
    clearCameraSnap()
  }, [cameraSnap, camera, clearCameraSnap])

  useEffect(() => {
    if (!teleportRoomId) return
    // requestTeleport already snapped camera + player; clear the flag
    requestTeleport(null)
  }, [teleportRoomId, requestTeleport])

  useEffect(() => {
    if (!followMarkerId) {
      followUntil.current = 0
      return
    }
    followUntil.current = performance.now() + FOLLOW_MS
  }, [followMarkerId])

  useFrame((_, delta) => {
    camera.rotation.order = 'YXZ'

    const following =
      Boolean(followMarkerId) &&
      followUntil.current > 0 &&
      performance.now() < followUntil.current
    if (followMarkerId && followUntil.current > 0 && performance.now() >= followUntil.current) {
      followUntil.current = 0
      setFollowMarkerId(null)
    }

    // Break follow when the player starts moving
    if (
      following &&
      (keys.current.KeyW ||
        keys.current.KeyA ||
        keys.current.KeyS ||
        keys.current.KeyD ||
        touchMove.x ||
        touchMove.y)
    ) {
      setFollowMarkerId(null)
      followUntil.current = 0
    }

    if (following && followMarkerId) {
      const marker = markers.find((m) => m.id === followMarkerId)
      const room = marker ? getRoomById(layout, marker.roomId) : null
      if (room) {
        const [mx, , mz] = getRoomCenter(layout, room)
        const dx = mx - camera.position.x
        const dz = mz - camera.position.z
        if (dx * dx + dz * dz > 0.01) {
          const targetYaw = Math.atan2(-dx, -dz)
          let diff = targetYaw - yaw.current
          while (diff > Math.PI) diff -= Math.PI * 2
          while (diff < -Math.PI) diff += Math.PI * 2
          yaw.current += diff * Math.min(1, delta * 4)
          pitch.current = THREE.MathUtils.lerp(pitch.current, -0.12, 0.08)
        }
      }
    }

    if (!pointerLocked || following) {
      const look = touchLookRef.current
      if (look.dx || look.dy) {
        if (following) {
          setFollowMarkerId(null)
          followUntil.current = 0
        }
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
      !keys.current.Space
    const maxSpeed = flyMode ? FLY_SPEED : sprint ? SPRINT_SPEED : WALK_SPEED

    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)
    forward.y = flyMode ? forward.y : 0
    if (forward.lengthSq() > 0) forward.normalize()

    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize()
    const wish = new THREE.Vector3()

    if (keys.current.KeyW || keys.current.ArrowUp) wish.add(forward)
    if (keys.current.KeyS || keys.current.ArrowDown) wish.sub(forward)
    if (keys.current.KeyA || keys.current.ArrowLeft) wish.sub(right)
    if (keys.current.KeyD || keys.current.ArrowRight) wish.add(right)

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
      const targetY = geometry.elevationY + 2
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.35)
    } else {
      camera.position.y += step.y
      camera.position.y = THREE.MathUtils.clamp(camera.position.y, 1, 20)
    }

    camera.position.x = nextX
    camera.position.z = nextZ

    portalCooldown.current = Math.max(0, portalCooldown.current - delta * 1000)
    if (!flyMode && portalCooldown.current <= 0) {
      for (const portal of portalsOnFloor(layout, activeFloorId)) {
        const box = worldPortalAabb(layout, portal)
        const px = camera.position.x
        const py = camera.position.y
        const pz = camera.position.z
        if (
          px >= box.minX &&
          px <= box.maxX &&
          py >= box.minY &&
          py <= box.maxY + 0.5 &&
          pz >= box.minZ &&
          pz <= box.maxZ
        ) {
          portalCooldown.current = PORTAL_COOLDOWN_MS
          switchFloor(portal.targetFloorId, portal.targetRoomId ?? null)
          break
        }
      }
    }

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
