'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Sky, Stars } from '@react-three/drei'
import { VoxelSchool } from './VoxelSchool'
import { PlayerController } from './PlayerController'
import { OccupancyParticles, PresenceMarkers, RoomLabels } from './PresenceLayer'
import { TrailMarkers } from './CraftSidePanels'
import { SceneEnvironment } from './SceneEnvironment'
import { ScenePostProcessing } from './ScenePostProcessing'

export function VoxelScene() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 72, near: 0.1, far: 160, position: [24, 2, 26] }}
      className="h-full w-full touch-none bg-sky-300"
    >
      <color attach="background" args={['#b8d4ea']} />
      <Sky
        distance={450000}
        sunPosition={[100, 28, 100]}
        inclination={0.52}
        azimuth={0.22}
        mieCoefficient={0.005}
        rayleigh={0.4}
      />
      <Stars radius={120} depth={40} count={1200} factor={3} saturation={0} fade speed={0.4} />
      <SceneEnvironment />
      <Suspense fallback={null}>
        <VoxelSchool />
        <RoomLabels />
        <PresenceMarkers />
        <OccupancyParticles />
        <TrailMarkers />
      </Suspense>
      <PlayerController />
      <ScenePostProcessing />
    </Canvas>
  )
}
