import { useEffect, type ReactNode } from 'react'
import { Canvas, useThree } from '@react-three/fiber'

/** Queues one frame whenever the stage comes back on screen: invalidate() is a no-op while the frameloop is 'never'. */
function RedrawOnActive({ active }: { active: boolean }) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    if (active) invalidate()
  }, [active, invalidate])
  return null
}

/** The only file that pulls in three.js for Scene3D. Loaded lazily so other pages never download it. */
export default function Scene3DCanvas({ active, onLost, children }: { active: boolean; onLost: () => void; children: ReactNode }) {
  return (
    <Canvas
      dpr={[1, 2]}
      // Draw only when something changes, and never while scrolled away.
      frameloop={active ? 'demand' : 'never'}
      camera={{ position: [4, 3, 6], fov: 40, near: 0.1, far: 100 }}
      gl={{ antialias: true, powerPreference: 'low-power' }}
      onCreated={({ gl }) => {
        // Switch to the flat view if the browser drops the WebGL context after start.
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          onLost()
        })
      }}
    >
      <RedrawOnActive active={active} />
      {children}
    </Canvas>
  )
}
