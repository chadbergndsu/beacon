'use client'

import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import type { CraftBlockInstance } from '@/lib/craft/geometry'

export function InstancedBlocks({
  instances,
  defaultRoughness = 0.75,
}: {
  instances: CraftBlockInstance[]
  defaultRoughness?: number
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const obj = useRef(new THREE.Object3D())

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh || !instances.length) return
    const temp = obj.current
    for (let i = 0; i < instances.length; i++) {
      const inst = instances[i]!
      temp.position.set(inst.position[0], inst.position[1], inst.position[2])
      temp.scale.set(inst.size[0], inst.size[1], inst.size[2])
      temp.updateMatrix()
      mesh.setMatrixAt(i, temp.matrix)
      mesh.setColorAt(i, new THREE.Color(inst.color))
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [instances])

  if (!instances.length) return null

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, instances.length]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        vertexColors
        roughness={defaultRoughness}
        metalness={0.05}
      />
    </instancedMesh>
  )
}

export function EmissiveBlocks({ instances }: { instances: CraftBlockInstance[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const obj = useRef(new THREE.Object3D())

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh || !instances.length) return
    const temp = obj.current
    for (let i = 0; i < instances.length; i++) {
      const inst = instances[i]!
      temp.position.set(inst.position[0], inst.position[1], inst.position[2])
      temp.scale.set(inst.size[0], inst.size[1], inst.size[2])
      temp.updateMatrix()
      mesh.setMatrixAt(i, temp.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }, [instances])

  if (!instances.length) return null
  const sample = instances[0]!

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, instances.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={sample.color}
        emissive={sample.emissive || sample.color}
        emissiveIntensity={sample.emissiveIntensity ?? 0.2}
        metalness={sample.metalness ?? 0.15}
        roughness={sample.roughness ?? 0.15}
        transparent
        opacity={0.88}
      />
    </instancedMesh>
  )
}
