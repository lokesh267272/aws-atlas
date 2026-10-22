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

  it('does not clip or fix the height of the fallback', () => {
    const html = renderToStaticMarkup(
      <Scene3DView webgl={false} label="x" fallback={<p>flat view</p>}>
        <mesh />
      </Scene3DView>,
    )
    expect(html).not.toContain('overflow-hidden')
    expect(html).not.toMatch(/h-\[/)
  })

  it('keeps a fixed, clipped stage for the canvas and a placeholder', () => {
    for (const webgl of [true, null]) {
      const html = renderToStaticMarkup(
        <Scene3DView webgl={webgl} label="x" fallback={<p>flat view</p>}>
          <mesh />
        </Scene3DView>,
      )
      expect(html).toContain('overflow-hidden')
      expect(html).toMatch(/h-\[/)
    }
  })

  it('announces loading outside the labelled image', () => {
    const html = renderToStaticMarkup(
      <Scene3DView webgl label="x" fallback={<p>flat view</p>}>
        <mesh />
      </Scene3DView>,
    )
    expect(html).toContain('role="status"')
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
