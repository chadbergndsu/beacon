'use client'

import { layoutBounds } from '@/lib/craft/layout'
import { EmissiveBlocks, InstancedBlocks } from './InstancedBlocks'
import { useCraftUi } from './CraftUiContext'

function CampusGround() {
  const { layout } = useCraftUi()
  const bounds = layoutBounds(layout)
  const cx = (bounds.minX + bounds.maxX) / 2
  const cz = (bounds.minZ + bounds.maxZ) / 2
  const w = bounds.maxX - bounds.minX + 8
  const d = bounds.maxZ - bounds.minZ + 8

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.03, cz]} receiveShadow>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial color="#64748b" roughness={0.95} />
    </mesh>
  )
}

export function VoxelSchool() {
  const { geometry, highlightRoomId, layout } = useCraftUi()
  const highlightRoom = layout.rooms.find((r) => r.roomId === highlightRoomId)

  return (
    <group>
      <CampusGround />
      <InstancedBlocks instances={geometry.floors} defaultRoughness={0.82} />
      <InstancedBlocks instances={geometry.trims} defaultRoughness={0.55} />
      <InstancedBlocks instances={geometry.ceilings} defaultRoughness={0.95} />
      <InstancedBlocks instances={geometry.walls} defaultRoughness={0.78} />
      <InstancedBlocks instances={geometry.doors} defaultRoughness={0.65} />
      <EmissiveBlocks instances={geometry.windows} />
      {geometry.lights.map((light) => (
        <pointLight
          key={light.roomId}
          position={light.position}
          color={light.color}
          intensity={light.intensity}
          distance={14}
          decay={2}
        />
      ))}
      {highlightRoom ? (
        <mesh
          position={[
            highlightRoom.origin[0] + highlightRoom.size[0] / 2,
            highlightRoom.origin[1] + 0.02,
            highlightRoom.origin[2] + highlightRoom.size[2] / 2,
          ]}
        >
          <boxGeometry args={[highlightRoom.size[0], 0.04, highlightRoom.size[2]]} />
          <meshStandardMaterial
            color="#38bdf8"
            transparent
            opacity={0.35}
            emissive="#0ea5e9"
            emissiveIntensity={0.45}
          />
        </mesh>
      ) : null}
    </group>
  )
}
