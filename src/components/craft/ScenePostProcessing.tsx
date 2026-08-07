'use client'

import { Bloom, EffectComposer, N8AO } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'

export function ScenePostProcessing() {
  return (
    <EffectComposer multisampling={0}>
      <N8AO intensity={1.2} aoRadius={0.4} distanceFalloff={0.5} color="black" />
      <Bloom
        intensity={0.22}
        luminanceThreshold={0.88}
        luminanceSmoothing={0.12}
        mipmapBlur
        blendFunction={BlendFunction.ADD}
      />
    </EffectComposer>
  )
}
