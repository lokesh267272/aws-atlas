import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { cn } from '../lib/cn'

const Scene3DCanvas = lazy(() => import('./Scene3DCanvas'))

/** True when the browser can create a WebGL context. Releases the test context right away. */
export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null
    if (!gl) return false
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

/** Catches a throwing 3D view and tells the parent, which then shows the fallback outside the clipped stage. */
class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/** True while the element is on (or near) the screen. */
function useInView<T extends Element>(ref: RefObject<T | null>) {
  const [inView, setInView] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '120px' })
    io.observe(el)
    return () => io.disconnect()
  }, [ref])
  return inView
}

export type Scene3DViewProps = {
  /** null while WebGL support is still being detected. */
  webgl: boolean | null
  /** Accessible description of the scene. */
  label: string
  /** Flat view shown when WebGL is missing or the scene fails. */
  fallback: ReactNode
  /** r3f scene content. */
  children: ReactNode
  /** Tailwind height classes for the stage. */
  height?: string
}

/** Dark stage that lazy-loads an r3f Canvas, pauses off-screen, and shows `fallback` without WebGL, on error or on context loss. The fallback is not clipped: it can grow taller than the stage. */
export function Scene3DView({ webgl, label, fallback, children, height = 'h-[320px] sm:h-[420px]' }: Scene3DViewProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const inView = useInView(stageRef)
  const [broken, setBroken] = useState(false)
  const onLost = useCallback(() => setBroken(true), [])
  const showFallback = webgl === false || broken

  return (
    <div
      ref={stageRef}
      className={cn(
        'relative rounded-md border border-screen-line bg-screen text-screen-text',
        !showFallback && 'overflow-hidden',
        !showFallback && height,
      )}
    >
      {showFallback ? (
        fallback
      ) : webgl === true ? (
        <SceneBoundary onError={onLost}>
          {/* The loading text sits outside role="img" so it is announced */}
          <Suspense fallback={<p role="status" className="p-4 text-sm text-screen-dim">Loading the 3D view…</p>}>
            <div role="img" aria-label={label} className="absolute inset-0">
              <Scene3DCanvas active={inView} onLost={onLost}>
                {children}
              </Scene3DCanvas>
            </div>
          </Suspense>
        </SceneBoundary>
      ) : null}
    </div>
  )
}

/**
 * Detects WebGL after mount, then renders Scene3DView.
 * Contract: the frameloop is 'demand'. Scenes render one frame per state change; scenes that animate must call
 * invalidate() from useFrame while the animation runs. While off-screen the loop is paused and one frame is queued on return.
 */
export function Scene3D(props: Omit<Scene3DViewProps, 'webgl'>) {
  const [webgl, setWebgl] = useState<boolean | null>(null)
  useEffect(() => setWebgl(hasWebGL()), [])
  return <Scene3DView {...props} webgl={webgl} />
}
