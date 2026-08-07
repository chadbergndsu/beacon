'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Sky, Stars } from '@react-three/drei'
import { VoxelSchool } from './VoxelSchool'
import { OccupancyParticles, PresenceMarkers, RoomLabels } from './PresenceLayer'
import { SceneEnvironment } from './SceneEnvironment'
import { ScenePostProcessing } from './ScenePostProcessing'
import { TourCameraRig } from './TourCameraRig'

export function TourVoxelScene() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 58, near: 0.1, far: 160, position: [40, 28, 44] }}
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
      </Suspense>
      <TourCameraRig />
      <ScenePostProcessing />
    </Canvas>
  )
}
