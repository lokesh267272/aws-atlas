import { useEffect, useLayoutEffect, useMemo, useRef, type ComponentRef, type RefObject } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import {
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  Quaternion,
  RingGeometry,
  SphereGeometry,
  Vector3,
} from 'three'
import { buildLandGeometry, latLonToVec3 } from './globeGeometry'
import { ZOOM_LEVELS } from './zoomLevels'
import { edgeCities } from './edgeCities'
import { regionByCode, regions, type AwsRegion } from './regions'

/* Hex values of the design tokens (three.js cannot read CSS variables). */
const HEX = {
  screen2: '#1c2c39',
  screenDim: '#8fa6b6',
  region: '#00a4a6',
  edge: '#8c4fff',
  selected: '#5fb3e6',
}

const HOME = { lat: 22, lon: -35 }
const HOME_DIR = latLonToVec3(HOME.lat, HOME.lon, 1).normalize()
const START_POS = HOME_DIR.clone().multiplyScalar(ZOOM_LEVELS[0])

export interface GlobeSceneProps {
  selected: string | null
  /** Changes on every pick, even of the same Region, so the camera turns back to it */
  selectNonce: number
  hovered: string | null
  showEdges: boolean
  spinning: boolean
  zoom: number
  reducedMotion: boolean
  /** Rendering pauses while the globe is scrolled out of view */
  active: boolean
  /** Changes when the learner presses Reset, to send the camera home */
  homeSignal: number
  onHover: (code: string | null) => void
  onSelect: (code: string) => void
  /** The learner dragged the globe */
  onUserInteract: () => void
  /**
   * Label boxes rendered by the page (outside the canvas). The scene moves them
   * to follow their markers each frame, and hides them on the far side.
   */
  labels: { hover: RefObject<HTMLDivElement | null>; selected: RefObject<HTMLDivElement | null> }
}

export default function GlobeScene(props: GlobeSceneProps) {
  const { active } = props
  return (
    <Canvas
      dpr={[1, 2]}
      // Draw only when something changes (drag, spin, a camera move, a new label), and never while scrolled away.
      frameloop={active ? 'demand' : 'never'}
      camera={{ position: [START_POS.x, START_POS.y, START_POS.z], fov: 40, near: 0.1, far: 50 }}
      gl={{ antialias: true, powerPreference: 'low-power' }}
      onCreated={({ gl }) => {
        gl.domElement.style.cursor = 'grab'
      }}
      aria-hidden
    >
      <Globe {...props} />
    </Canvas>
  )
}

function Globe({
  selected,
  selectNonce,
  hovered,
  showEdges,
  spinning,
  zoom,
  reducedMotion,
  active,
  homeSignal,
  onHover,
  onSelect,
  onUserInteract,
  labels,
}: GlobeSceneProps) {
  // Draw a fresh frame when the globe comes back into view (for example to carry on spinning).
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    if (active) invalidate()
  }, [active, invalidate])

  // Shared, light geometry and materials, created once and disposed on unmount.
  const assets = useMemo(
    () => ({
      land: buildLandGeometry(),
      marker: new SphereGeometry(0.016, 14, 10),
      hit: new SphereGeometry(0.032, 8, 6),
      ring: new RingGeometry(0.03, 0.038, 40),
      markerMat: new MeshBasicMaterial({ color: HEX.region }),
      hitMat: new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
      ringMat: new MeshBasicMaterial({ color: HEX.selected }),
    }),
    [],
  )
  useEffect(
    () => () => {
      Object.values(assets).forEach((a) => a.dispose())
    },
    [assets],
  )

  const stop = (e: ThreeEvent<PointerEvent | MouseEvent>) => e.stopPropagation()

  return (
    <>
      {/* The globe itself blocks pointer events for markers on its far side. */}
      <mesh onPointerOver={stop} onPointerMove={stop} onClick={stop}>
        <sphereGeometry args={[1, 64, 48]} />
        <meshBasicMaterial color={HEX.screen2} />
      </mesh>
      <lineSegments geometry={assets.land} dispose={null}>
        <lineBasicMaterial color={HEX.screenDim} transparent opacity={0.85} />
      </lineSegments>

      {regions.map((r) => (
        <RegionMarker
          key={r.code}
          region={r}
          active={r.code === selected || r.code === hovered}
          selected={r.code === selected}
          assets={assets}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}

      {selected && <SelectedRing region={regionByCode[selected]} assets={assets} />}
      {showEdges && <EdgeDots />}

      <LabelTracker el={labels.hover} code={hovered && hovered !== selected ? hovered : null} />
      <LabelTracker el={labels.selected} code={selected} />

      <CameraRig
        selected={selected}
        selectNonce={selectNonce}
        zoom={zoom}
        spinning={spinning}
        reducedMotion={reducedMotion}
        homeSignal={homeSignal}
        onUserInteract={onUserInteract}
      />
    </>
  )
}

type Assets = {
  marker: SphereGeometry
  hit: SphereGeometry
  ring: RingGeometry
  markerMat: MeshBasicMaterial
  hitMat: MeshBasicMaterial
  ringMat: MeshBasicMaterial
}

function RegionMarker({
  region,
  active,
  selected,
  assets,
  onHover,
  onSelect,
}: {
  region: AwsRegion
  active: boolean
  selected: boolean
  assets: Assets
  onHover: (code: string | null) => void
  onSelect: (code: string) => void
}) {
  const position = useMemo(() => latLonToVec3(region.lat, region.lon, 1.004), [region])
  const canvas = useThree((s) => s.gl.domElement)
  const scale = selected ? 1.55 : active ? 1.35 : 1
  return (
    <group position={position}>
      <mesh geometry={assets.marker} material={assets.markerMat} scale={scale} dispose={null} />
      {/* A larger invisible target so small dots are easy to hit with a finger */}
      <mesh
        geometry={assets.hit}
        material={assets.hitMat}
        dispose={null}
        onPointerOver={(e) => {
          e.stopPropagation()
          canvas.style.cursor = 'pointer'
          onHover(region.code)
        }}
        onPointerOut={() => {
          canvas.style.cursor = 'grab'
          onHover(null)
        }}
        onClick={(e) => {
          e.stopPropagation()
          if (e.delta > 6) return // it was a drag, not a click
          onSelect(region.code)
        }}
      />
    </group>
  )
}

const Z_AXIS = new Vector3(0, 0, 1)

function SelectedRing({ region, assets }: { region: AwsRegion; assets: Assets }) {
  const { position, quaternion } = useMemo(() => {
    const p = latLonToVec3(region.lat, region.lon, 1.006)
    const q = new Quaternion().setFromUnitVectors(Z_AXIS, p.clone().normalize())
    return { position: p, quaternion: q }
  }, [region])
  return <mesh geometry={assets.ring} material={assets.ringMat} position={position} quaternion={quaternion} dispose={null} />
}

/** Edge locations are flat diamonds lying on the surface, so they differ from the round Region dots by shape as well as colour. */
const DIAMOND_SPIN = new Quaternion().setFromAxisAngle(Z_AXIS, Math.PI / 4)

function EdgeDots() {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new Object3D()
    const normal = new Vector3()
    edgeCities.forEach((c, i) => {
      latLonToVec3(c.lat, c.lon, 1.005, dummy.position)
      // Face outwards from the centre of the globe, turned 45 degrees so the square reads as a diamond.
      dummy.quaternion.setFromUnitVectors(Z_AXIS, normal.copy(dummy.position).normalize()).multiply(DIAMOND_SPIN)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, edgeCities.length]}>
      <planeGeometry args={[0.021, 0.021]} />
      <meshBasicMaterial color={HEX.edge} />
    </instancedMesh>
  )
}

const projected = new Vector3()
const camDir = new Vector3()

/**
 * Moves a page-rendered label box so it sits beside its marker, and hides it
 * when the marker turns to the far side of the globe. Plain DOM writes, so no
 * React re-render happens per frame.
 */
function LabelTracker({ el, code }: { el: RefObject<HTMLDivElement | null>; code: string | null }) {
  const anchor = useMemo(() => {
    const r = code ? regionByCode[code] : undefined
    return r ? latLonToVec3(r.lat, r.lon, 1.01) : null
  }, [code])
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    // Hide right away; the next frame places it.
    if (el.current) el.current.style.opacity = '0'
    invalidate()
  }, [el, code, invalidate])
  useFrame(({ camera, size }) => {
    const box = el.current
    if (!box) return
    if (!anchor) {
      box.style.opacity = '0'
      return
    }
    const facing = camDir.copy(camera.position).normalize().dot(projected.copy(anchor).normalize())
    // A point on the globe is only visible in front of the horizon, which moves as the camera comes closer.
    const horizon = 1 / camera.position.length()
    projected.copy(anchor).project(camera)
    const onScreen = Math.abs(projected.x) <= 1 && Math.abs(projected.y) <= 1
    const x = ((projected.x + 1) / 2) * size.width
    const y = ((1 - projected.y) / 2) * size.height
    const w = box.offsetWidth
    const h = box.offsetHeight
    // Sit to the right of the marker, or to the left when there is no room. On a narrow stage where neither fits,
    // sit above it (below it near the top edge). Never go past the edges of the stage.
    const rightFits = x + 12 + w <= size.width - 4
    const leftFits = x - 12 - w >= 4
    let left = rightFits ? x + 12 : x - 12 - w
    let mid = y
    if (!rightFits && !leftFits) {
      left = x - w / 2
      mid = y - 14 - h / 2 >= h / 2 + 4 ? y - 14 - h / 2 : y + 14 + h / 2
    }
    left = Math.min(Math.max(4, left), size.width - w - 4)
    const top = Math.min(Math.max(h / 2 + 4, mid), size.height - h / 2 - 4)
    box.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px) translateY(-50%)`
    box.style.opacity = facing > horizon + 0.03 && onScreen ? '1' : '0'
  })
  return null
}

/* ------------------------------------------------------------ CameraRig */

const tmpDir = new Vector3()
const tmpQ = new Quaternion()
const partialQ = new Quaternion()

/**
 * Orbit controls (drag to rotate, no pan, no wheel zoom so the page still
 * scrolls) plus smooth "fly to" moves when a Region is chosen.
 */
function CameraRig({
  selected,
  selectNonce,
  zoom,
  spinning,
  reducedMotion,
  homeSignal,
  onUserInteract,
}: {
  selected: string | null
  selectNonce: number
  zoom: number
  spinning: boolean
  reducedMotion: boolean
  homeSignal: number
  onUserInteract: () => void
}) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const camera = useThree((s) => s.camera)
  // The canvas only draws on demand, so every change below asks for a frame.
  const invalidate = useThree((s) => s.invalidate)
  const flyTo = useRef<Vector3 | null>(null)
  const distance = useRef(ZOOM_LEVELS[0])

  useEffect(() => {
    if (!selected) return
    const r = regionByCode[selected]
    if (r) flyTo.current = latLonToVec3(r.lat, r.lon, 1).normalize()
    invalidate()
  }, [selected, selectNonce, invalidate])

  useEffect(() => {
    distance.current = ZOOM_LEVELS[zoom] ?? ZOOM_LEVELS[0]
    invalidate()
  }, [zoom, invalidate])

  // Spinning keeps itself going (each turn asks for the next frame); this starts it.
  useEffect(() => {
    if (spinning) invalidate()
  }, [spinning, invalidate])

  const firstHome = useRef(true)
  useEffect(() => {
    if (firstHome.current) {
      firstHome.current = false
      return
    }
    flyTo.current = HOME_DIR.clone()
    invalidate()
  }, [homeSignal, invalidate])

  const placed = useRef(false)

  useFrame(({ size }, dt) => {
    const c = controls.current
    if (!c) return
    const pos = camera.position
    // The first frame and reduced motion jump straight to the target; otherwise ease towards it.
    // dt is capped because the first frame after a pause reports the whole pause.
    const k = reducedMotion || !placed.current ? 1 : 1 - Math.exp(-Math.min(dt, 1 / 30) * 4.5)
    let changed = false
    const r = pos.length()

    const target = flyTo.current
    if (target) {
      const dir = tmpDir.copy(pos).normalize()
      tmpQ.setFromUnitVectors(dir, target)
      partialQ.identity().slerp(tmpQ, k)
      dir.applyQuaternion(partialQ)
      if (dir.angleTo(target) < 0.002) {
        dir.copy(target)
        flyTo.current = null
      }
      pos.copy(dir).multiplyScalar(r)
      changed = true
    }

    // Step back on tall, narrow screens so the whole globe still fits side to side.
    const aspect = size.width / Math.max(1, size.height)
    const want = distance.current * Math.max(1, 0.93 / aspect)
    if (Math.abs(pos.length() - want) > 0.002) {
      pos.setLength(pos.length() + (want - pos.length()) * k)
      changed = true
    }
    placed.current = true

    // Auto-rotate turns the camera by tiny steps that OrbitControls does not always report as a change,
    // so keep asking for frames for as long as the globe is spinning.
    if (spinning) invalidate()

    if (changed) {
      camera.lookAt(0, 0, 0)
      c.update()
      // Still easing towards the target: ask for another frame.
      invalidate()
    }
  })

  return (
    <OrbitControls
      ref={controls}
      enablePan={false}
      enableZoom={false}
      enableDamping={!reducedMotion}
      dampingFactor={0.08}
      rotateSpeed={0.55}
      autoRotate={spinning && !reducedMotion}
      autoRotateSpeed={0.6}
      onStart={() => {
        flyTo.current = null
        onUserInteract()
      }}
    />
  )
}
