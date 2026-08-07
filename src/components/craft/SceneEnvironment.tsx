'use client'

import { ContactShadows } from '@react-three/drei'

export function SceneEnvironment() {
  return (
    <>
      <fog attach="fog" args={['#b8d4ea', 28, 95]} />
      <hemisphereLight args={['#dbeafe', '#475569', 0.45]} />
      <directionalLight
        castShadow
        position={[32, 48, 18]}
        intensity={1.15}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={120}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />
      <directionalLight position={[-20, 24, -12]} intensity={0.35} color="#93c5fd" />
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.35}
        scale={80}
        blur={2.5}
        far={20}
        color="#0f172a"
      />
    </>
  )
}
