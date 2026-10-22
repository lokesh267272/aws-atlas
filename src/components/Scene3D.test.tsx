import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ThreeElements } from '@react-three/fiber'
import { Scene3DView, hasWebGL } from './Scene3D'

// Keeps r3f's JSX intrinsic types (<mesh />) in scope for this file.
export type _Three = ThreeElements

describe('Scene3DView', () => {
  it('renders the fallback without WebGL', () => {
    const html = renderToStaticMarkup(
      <Scene3DView webgl={false} label="x" fallback={<p>flat view</p>}>
        <mesh />
      </Scene3DView>,
    )
    expect(html).toContain('flat view')
  })

  it('renders no fallback before detection', () => {
    const html = renderToStaticMarkup(
      <Scene3DView webgl={null} label="x" fallback={<p>flat view</p>}>
        <mesh />
      </Scene3DView>,
    )
    expect(html).not.toContain('flat view')
  })

  it('labels the canvas container when WebGL is available', () => {
    const html = renderToStaticMarkup(
      <Scene3DView webgl label="An instance" fallback={<p>flat view</p>}>
        <mesh />
      </Scene3DView>,
    )
    expect(html).toContain('role="img"')
    expect(html).toContain('aria-label="An instance"')
    expect(html).not.toContain('flat view')
  })

  it('reports no WebGL outside a browser', () => {
    expect(hasWebGL()).toBe(false)
  })
})
