import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useReducedMotion } from 'motion/react'
import { TriangleAlert, ZoomIn, ZoomOut } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Switch } from '../../../../components/controls'
import { cn } from '../../../../lib/cn'
import { hasWebGL } from './geo'
import { edgeCities } from './edgeCities'
import { regionByCode } from './regions'
import { RegionDetails, RegionList } from './RegionPicker'
import { ZOOM_LEVELS } from './zoomLevels'

const GlobeScene = lazy(() => import('./GlobeScene'))

/** Small buttons styled for the dark "screen" panel. */
export const darkButton =
  'inline-flex h-8 items-center gap-1.5 rounded-md border border-screen-line bg-screen-2 px-2.5 text-sm font-bold text-screen-text transition-colors hover:border-screen-dim hover:text-white disabled:opacity-40 aria-disabled:cursor-default aria-disabled:opacity-40 aria-disabled:hover:border-screen-line aria-disabled:hover:text-screen-text focus-visible:outline-[#5fb3e6] [&_svg]:size-4'

/** Renders the fallback instead of crashing the lesson if the 3D view throws. */
class GlobeBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
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

function NoWebGL() {
  return (
    <div role="status" className="grid h-full place-items-center p-6 text-center">
      <div className="max-w-[34ch]">
        <TriangleAlert aria-hidden className="mx-auto size-6 text-[#ffc278]" />
        <p className="mt-2 font-bold text-white">The 3D globe can’t start in this browser</p>
        <p className="mt-1 text-sm text-screen-dim">
          It needs WebGL, which is turned off or not supported here. The Region list still works: choose a Region to see its
          details.
        </p>
      </div>
    </div>
  )
}

/** A label box that the 3D scene moves next to its marker. Hidden from screen readers: the details panel says the same. */
function GlobeLabel({ boxRef, code, emphasis = false }: { boxRef: RefObject<HTMLDivElement | null>; code: string | null; emphasis?: boolean }) {
  const r = code ? regionByCode[code] : undefined
  return (
    <div
      ref={boxRef}
      aria-hidden
      className={cn(
        'pointer-events-none absolute left-0 top-0 z-[1] whitespace-nowrap rounded-[4px] border bg-screen px-2 py-1 text-xs leading-tight text-screen-text transition-opacity duration-150',
        emphasis ? 'border-[#5fb3e6]' : 'border-screen-line',
      )}
      style={{ opacity: 0 }}
    >
      {r && (
        <>
          <span className="font-mono font-bold text-white">{r.code}</span>
          <span className="block text-screen-dim">{r.name}</span>
        </>
      )}
    </div>
  )
}

/** Legend marks match the globe: a round dot for a Region, a diamond for an edge location, a ring for the selection. */
function LegendDot({ color, shape = 'dot' }: { color: string; shape?: 'dot' | 'diamond' | 'ring' }) {
  return (
    <svg aria-hidden viewBox="0 0 12 12" className="size-3 shrink-0">
      {shape === 'ring' ? (
        <circle cx="6" cy="6" r="4.5" fill="none" stroke={color} strokeWidth="2" />
      ) : shape === 'diamond' ? (
        <path d="M6 1.2 10.8 6 6 10.8 1.2 6Z" fill={color} />
      ) : (
        <circle cx="6" cy="6" r="4" fill={color} />
      )}
    </svg>
  )
}

export function GlobeExplorer() {
  const reduced = useReducedMotion() ?? false
  const [selected, setSelected] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [showEdges, setShowEdges] = useState(false)
  // Still until the learner turns spinning on: motion only in response to the learner.
  const [spinning, setSpinning] = useState(false)
  const [zoom, setZoom] = useState(0)
  const [homeSignal, setHomeSignal] = useState(0)
  // Changes on every pick, so choosing the same Region again still turns the globe back to it.
  const [selectNonce, setSelectNonce] = useState(0)
  const [webgl] = useState(() => hasWebGL())
  const stageRef = useRef<HTMLDivElement>(null)
  const hoverLabelRef = useRef<HTMLDivElement>(null)
  const selectedLabelRef = useRef<HTMLDivElement>(null)
  const labels = useMemo(() => ({ hover: hoverLabelRef, selected: selectedLabelRef }), [])
  const inView = useInView(stageRef)

  const spinOn = spinning && !reduced

  const select = useCallback((code: string) => {
    setSelected(code)
    setSelectNonce((n) => n + 1)
    setSpinning(false)
  }, [])

  const stopSpin = useCallback(() => setSpinning(false), [])

  const reset = () => {
    setSelected(null)
    setHovered(null)
    setShowEdges(false)
    setZoom(0)
    setSpinning(false)
    setHomeSignal((n) => n + 1)
  }

  const fallback = <NoWebGL />

  return (
    <Bench
      tone="screen"
      title="Try it: spin the globe"
      intro={
        <>
          Drag the globe to turn it, or pick a Region from the list. Each teal dot is one Region. Notice where Regions cluster.
        </>
      }
      onReset={reset}
    >
      <div className="@container">
        <div className="grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_18.5rem]">
          {/* Globe and its controls */}
          <div className="min-w-0">
            <div
              ref={stageRef}
              className="relative h-[300px] overflow-hidden rounded-md border border-screen-line bg-screen sm:h-[420px] @3xl:h-[470px]"
            >
              {webgl ? (
                <GlobeBoundary fallback={fallback}>
                  <div
                    role="img"
                    aria-label="A 3D globe of the Earth with a dot for each of the 34 AWS Regions a standard account can use. Use the Region list to explore it with a keyboard or screen reader."
                    className="absolute inset-0"
                  >
                    <Suspense fallback={<p className="p-4 text-sm text-screen-dim">Loading the globe…</p>}>
                      <GlobeScene
                        selected={selected}
                        selectNonce={selectNonce}
                        hovered={hovered}
                        showEdges={showEdges}
                        spinning={spinOn}
                        zoom={zoom}
                        reducedMotion={reduced}
                        active={inView}
                        homeSignal={homeSignal}
                        onHover={setHovered}
                        onSelect={select}
                        onUserInteract={stopSpin}
                        labels={labels}
                      />
                    </Suspense>
                    <GlobeLabel boxRef={selectedLabelRef} code={selected} emphasis />
                    {/* Rendered last so the label you are pointing at sits on top */}
                    <GlobeLabel boxRef={hoverLabelRef} code={hovered && hovered !== selected ? hovered : null} />
                  </div>
                  <div className="absolute right-2 top-2 z-[2] flex gap-1.5">
                    {/* aria-disabled, not disabled, so keyboard focus stays on the button at the limit */}
                    <button
                      type="button"
                      className={darkButton}
                      onClick={() => setZoom((z) => Math.min(ZOOM_LEVELS.length - 1, z + 1))}
                      aria-disabled={zoom >= ZOOM_LEVELS.length - 1}
                    >
                      <ZoomIn aria-hidden />
                      <span className="sr-only sm:not-sr-only">Zoom in</span>
                    </button>
                    <button
                      type="button"
                      className={darkButton}
                      onClick={() => setZoom((z) => Math.max(0, z - 1))}
                      aria-disabled={zoom <= 0}
                    >
                      <ZoomOut aria-hidden />
                      <span className="sr-only sm:not-sr-only">Zoom out</span>
                    </button>
                  </div>
                </GlobeBoundary>
              ) : (
                fallback
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
              <Switch
                label="Show a sample of edge locations (small AWS sites you will meet later)"
                checked={showEdges}
                onChange={setShowEdges}
                tone="screen"
              />
              {webgl && !reduced && (
                <Switch label="Spin slowly" checked={spinning} onChange={setSpinning} tone="screen" />
              )}
            </div>

            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-screen-dim" aria-label="Legend">
              <li className="flex items-center gap-1.5">
                <LegendDot color="#00a4a6" /> Region (all 34 a standard account can use)
              </li>
              <li className="flex items-center gap-1.5">
                <LegendDot color="#8c4fff" shape="diamond" /> Edge location: a sample of {edgeCities.length} cities
                {!showEdges && ' (switched off)'}
              </li>
              <li className="flex items-center gap-1.5">
                <LegendDot color="#5fb3e6" shape="ring" /> Selected Region
              </li>
            </ul>
            <p className="mt-2 text-xs text-screen-dim">
              Simplified: each dot marks the rough metro area. AWS does not publish data center addresses, and a Region’s
              Availability Zones are spread over many kilometres.
            </p>
            {showEdges && (
              <details className="mt-2 text-xs text-screen-dim">
                <summary className="cursor-pointer rounded-[2px] font-bold text-screen-text focus-visible:outline-[#5fb3e6]">List the sample edge-location cities</summary>
                <p className="mt-1.5 leading-relaxed">{edgeCities.map((c) => c.city).join(', ')}.</p>
                <p className="mt-1.5">The real network has more than 750 points of presence in over 100 cities.</p>
              </details>
            )}
          </div>

          {/* Details and accessible Region picker */}
          <div className="flex min-w-0 flex-col gap-3 @3xl:h-[470px]">
            <RegionDetails code={selected} />
            <RegionList selected={selected} onSelect={select} onPreview={setHovered} />
          </div>
        </div>
      </div>
    </Bench>
  )
}
