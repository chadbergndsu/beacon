'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Sky } from '@react-three/drei'
import type { CraftFloorLayout } from '@/lib/craft/types'
import { VoxelSchool } from './VoxelSchool'
import { PlayerController } from './PlayerController'
import { OccupancyParticles, PresenceMarkers, RoomLabels } from './PresenceLayer'
import { TrailMarkers } from './CraftSidePanels'

export function VoxelScene({ layout }: { layout: CraftFloorLayout }) {
  return (
    <Canvas
      shadows
      camera={{ fov: 75, near: 0.1, far: 200, position: [24, 2, 26] }}
      className="h-full w-full touch-none bg-sky-200"
    >
      <color attach="background" args={['#bae6fd']} />
      <Sky sunPosition={[100, 20, 100]} />
      <ambientLight intensity={0.55} />
      <directionalLight castShadow position={[20, 30, 10]} intensity={0.9} shadow-mapSize={[1024, 1024]} />
      <Suspense fallback={null}>
        <VoxelSchool layout={layout} />
        <RoomLabels />
        <PresenceMarkers />
        <OccupancyParticles />
        <TrailMarkers />
      </Suspense>
      <PlayerController />
    </Canvas>
  )
}
