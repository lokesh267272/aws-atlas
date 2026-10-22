import type { ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'

/** The only file that pulls in three.js for Scene3D. Loaded lazily so other pages never download it. */
export default function Scene3DCanvas({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <Canvas
      dpr={[1, 2]}
      // Draw only when something changes, and never while scrolled away.
      frameloop={active ? 'demand' : 'never'}
      camera={{ position: [4, 3, 6], fov: 40, near: 0.1, far: 100 }}
      gl={{ antialias: true, powerPreference: 'low-power' }}
    >
      {children}
    </Canvas>
  )
}
