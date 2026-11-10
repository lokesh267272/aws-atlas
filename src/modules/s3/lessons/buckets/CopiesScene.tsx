import { useEffect, useLayoutEffect, useMemo, useRef, type ComponentRef, type ReactNode, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Edges, Html, Line } from '@react-three/drei'
import { Color, MathUtils, Vector3, type Group, type MeshLambertMaterial, type PerspectiveCamera } from 'three'
import { cn } from '../../../../lib/cn'
import { HEX } from '../../../ec2/lessons/scale/look'
import { s3Story } from '../../story'
import {
  AZ_INDEXES,
  DATA_DEVICES,
  DEVICES_PER_AZ,
  azOut,
  copiesLeft,
  deviceBroken,
  homeAzs,
  servingAz,
  type AzIndex,
  type Break,
  type Where,
} from './bucketsModel'

/** The storage category colour (--color-storage): the photo and its copies. three.js cannot read CSS variables. */
const STORAGE = '#7aa116'

/* Layout in scene units. Three AZ platforms left to right, each with a building of four storage devices; the photo in front. */
const AZ_X = [-2.3, 0, 2.3]
const PLAT = { w: 2.05, d: 2.0, h: 0.12 }
const BUILDING = { w: 1.62, h: 0.66, d: 1.0, z: -0.2 }
const DEVICE = { w: 0.26, h: 0.36, d: 0.6 }
const DEVICE_X = Array.from({ length: DEVICES_PER_AZ }, (_, i) => (i - (DEVICES_PER_AZ - 1) / 2) * 0.36)
const CARD = { w: 0.22, h: 0.035, d: 0.3 }
/** Where a copy rests: on top of its device. */
const REST_Y = DEVICE.h + CARD.h / 2 + 0.01
const PHOTO = { x: 0, y: 1.25, z: 2.35, w: 0.5, h: 0.05, d: 0.38 }
const REGION = { x0: -3.55, x1: 3.55, z0: -1.35, z1: 1.45 }
/** How far an AZ that is out sinks. */
const DROP = 0.7

/* Animation, in seconds. Motion only follows the learner's Upload and break presses. */
const FLY = 0.9
const STAGGER = 0.12
const ARC = 0.7

const ease = (t: number) => t * t * (3 - 2 * t)

/** Eases `cur` toward `target`; returns `target` once close, so motion stops. */
function approach(cur: number, target: number, dt: number, rate: number) {
  const next = cur + (target - cur) * (1 - Math.exp(-rate * dt))
  return Math.abs(target - next) < 0.002 ? target : next
}

/* ------------------------------------------------------------------ Camera */

const TARGET = new Vector3(0, 0.2, 0.55)
const VIEW_DIR = new Vector3(0.08, 1.0, 1.05).normalize()
const FIT = { w: 7.6, h: 4.9 }

/** Looks at the Region from the front and above, stepping back until it fits the stage. */
function CameraRig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const width = useThree((s) => s.size.width)
  const height = useThree((s) => s.size.height)
  const invalidate = useThree((s) => s.invalidate)
  useLayoutEffect(() => {
    const aspect = width / Math.max(1, height)
    const v = MathUtils.degToRad(camera.fov / 2)
    const h = Math.atan(Math.tan(v) * aspect)
    const d = Math.max(FIT.w / 2 / Math.tan(h), FIT.h / 2 / Math.tan(v))
    camera.position.copy(TARGET).addScaledVector(VIEW_DIR, d)
    camera.lookAt(TARGET)
    camera.updateMatrixWorld()
    invalidate()
  }, [camera, width, height, invalidate])
  return null
}

/* ------------------------------------------------------------------ Labels */

type LabelKind = 'tag' | 'region' | 'az' | 'bad' | 'dim' | 'copy'

const labelClass: Record<LabelKind, string> = {
  tag: 'rounded-[3px] border border-screen-line bg-screen/85 px-1.5 py-0.5 text-screen-text',
  region: 'rounded-[3px] bg-region px-1.5 py-0.5 text-white',
  az: 'rounded-[3px] bg-az px-1.5 py-0.5 text-white',
  bad: 'rounded-[3px] bg-bad px-1.5 py-0.5 text-white',
  dim: 'rounded-[3px] border border-screen-line bg-screen/85 px-1.5 py-0.5 text-screen-dim',
  copy: 'rounded-[3px] border-2 border-storage bg-screen/85 px-1.5 py-0.5 text-screen-text',
}

/**
 * Where every label's DOM node lives: the canvas's own wrapper, fixed from the first frame (same fix as Module 2's scenes).
 * Without it, drei's Html moves its node once the canvas connects its events and, when the scene mounts inside
 * React DOM's commit (cached lazy chunk, e.g. on re-entering the lesson), unmounts its React root synchronously there.
 */
function useLabelHost(): RefObject<HTMLElement> {
  const gl = useThree((s) => s.gl)
  return useMemo(() => ({ current: gl.domElement.parentElement! }), [gl])
}

/** A short DOM label pinned to a point. Hidden from screen readers: the status line and the stage's label say the same. */
function Label({
  position,
  kind = 'tag',
  place = 'center',
  children,
}: {
  position: [number, number, number]
  kind?: LabelKind
  /** center: on the point; above: sits on top of it; above-left: up and to the left of it; below: hangs under it */
  place?: 'center' | 'above' | 'above-left' | 'below'
  children: ReactNode
}) {
  const shift = {
    center: '',
    above: '-translate-x-1/2 -translate-y-full',
    'above-left': '-translate-x-full -translate-y-full',
    below: '-translate-x-1/2',
  }[place]
  const host = useLabelHost()
  return (
    <Html position={position} center={place === 'center'} zIndexRange={[10, 0]} pointerEvents="none" portal={host}>
      <div aria-hidden className={cn('whitespace-nowrap text-xs font-bold leading-tight', labelClass[kind], shift)}>
        {children}
      </div>
    </Html>
  )
}

/* ------------------------------------------------------------------ Copies */

const GREEN = new Color(STORAGE)
const RED = new Color(HEX.bad)

/**
 * One copy of the photo: a small green card that flies from the photo to its device when stored, and turns into a faded
 * red mark when its device breaks or its whole AZ goes out. The copy that serves reads also draws the read path to the photo.
 * It lives inside its AZ's group, so it sinks with the AZ.
 */
function Copy({
  az,
  slot,
  order,
  wanted,
  alive,
  serving,
  reduced,
}: {
  az: AzIndex
  /** Which device in the AZ holds it. */
  slot: number
  /** Position in the upload, for a short stagger. */
  order: number
  /** Stored here in the current view. */
  wanted: boolean
  alive: boolean
  /** This is the copy reads are served from. */
  serving: boolean
  reduced: boolean
}) {
  const invalidate = useThree((s) => s.invalidate)
  const group = useRef<Group>(null)
  const material = useRef<MeshLambertMaterial>(null)
  const path = useRef<Group>(null)
  const from = useMemo(() => new Vector3(PHOTO.x - AZ_X[az], PHOTO.y - PHOTO.h, PHOTO.z), [az])
  const to = useMemo(() => new Vector3(DEVICE_X[slot], REST_Y, BUILDING.z), [slot])
  const delay = order * STAGGER
  // Start at the end state, so a scene that loads after an upload does not replay it.
  const cur = useRef({ t: wanted ? FLY + delay : 0, dead: alive ? 0 : 1 })

  // Going back (Reset, Repair, switching view) or reduced motion: jump straight to the end state.
  useEffect(() => {
    const c = cur.current
    if (!wanted) c.t = 0
    else if (reduced) c.t = FLY + delay
    if (alive || reduced) c.dead = alive ? 0 : 1
    invalidate()
  }, [wanted, alive, reduced, delay, invalidate])

  useFrame((_, dt) => {
    const c = cur.current
    const step = Math.min(dt, 1 / 30)
    let moving = false
    if (wanted && c.t < FLY + delay) {
      c.t = Math.min(FLY + delay, c.t + step)
      moving = true
    }
    const deadTarget = alive ? 0 : 1
    if (c.dead !== deadTarget) {
      c.dead = approach(c.dead, deadTarget, step, 5)
      moving = true
    }
    const land = wanted ? ease(MathUtils.clamp((c.t - delay) / FLY, 0, 1)) : 0
    const g = group.current
    if (g) {
      g.visible = wanted && c.t > delay
      g.position.lerpVectors(from, to, land)
      g.position.y += Math.sin(land * Math.PI) * ARC - 0.12 * c.dead
    }
    if (material.current) {
      material.current.color.copy(GREEN).lerp(RED, c.dead)
      material.current.opacity = 1 - 0.6 * c.dead
    }
    // The read path shows once the serving copy has landed.
    if (path.current) path.current.visible = serving && land >= 1 && c.dead === 0
    if (moving) invalidate()
  })

  const c = cur.current
  const land0 = wanted ? ease(MathUtils.clamp((c.t - delay) / FLY, 0, 1)) : 0
  const p0 = new Vector3().lerpVectors(from, to, land0)
  return (
    <>
      <group ref={group} position={[p0.x, p0.y - 0.12 * c.dead, p0.z]} visible={wanted && c.t > delay}>
        <mesh>
          <boxGeometry args={[CARD.w, CARD.h, CARD.d]} />
          <meshLambertMaterial ref={material} color={STORAGE} transparent opacity={1 - 0.6 * c.dead} toneMapped={false} />
          <Edges color={HEX.text} transparent opacity={0.8} />
        </mesh>
      </group>
      {/* No `visible` prop on Line itself: drei spreads Line props onto the material too, and a hidden material never comes back. */}
      <group ref={path} visible={serving && land0 >= 1 && c.dead === 0}>
        <Line points={[[to.x, to.y + CARD.h, to.z], [from.x, from.y, from.z]]} color={HEX.accent} lineWidth={2} />
      </group>
    </>
  )
}

/* ------------------------------------------------------------------ Devices */

function Device({ x, broken, dark }: { x: number; broken: boolean; dark: boolean }) {
  const color = broken ? HEX.bad : dark ? HEX.screen : HEX.line
  return (
    <mesh position={[x, DEVICE.h / 2, BUILDING.z]}>
      <boxGeometry args={[DEVICE.w, DEVICE.h, DEVICE.d]} />
      <meshLambertMaterial color={color} toneMapped={false} />
      <Edges color={broken ? HEX.bad : HEX.dim} transparent opacity={dark ? 0.3 : 0.75} />
    </mesh>
  )
}

/**
 * The AZ's storage: a see-through data center building with a row of devices inside (a real AZ has one or more data
 * centers; the sim draws one). `out` greys it with its AZ; `broken` marks the first device holding a copy.
 */
function Storage({ out, broken }: { out: boolean; broken: boolean }) {
  return (
    <group>
      <mesh position={[0, BUILDING.h / 2, BUILDING.z]}>
        <boxGeometry args={[BUILDING.w, BUILDING.h, BUILDING.d]} />
        <meshBasicMaterial color={out ? HEX.bad : HEX.screen2} transparent opacity={out ? 0.18 : 0.3} depthWrite={false} toneMapped={false} />
        <Edges color={out ? HEX.bad : HEX.dim} transparent opacity={out ? 0.9 : 0.55} />
      </mesh>
      {DEVICE_X.map((x, i) => (
        <Device key={i} x={x} broken={broken && i === DATA_DEVICES[0]} dark={out} />
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ AZ */

const SLAB_LIVE = new Color(HEX.screen2)
const SLAB_DEAD = new Color(HEX.line)
const EDGE_LIVE = new Color(HEX.az)
const EDGE_DEAD = new Color(HEX.dim)

/** One Availability Zone: a platform with a blue dashed edge. An AZ that is out greys and sinks. */
function AzPlatform({
  index,
  out,
  reduced,
  narrow,
  children,
}: {
  index: AzIndex
  out: boolean
  reduced: boolean
  narrow: boolean
  children: ReactNode
}) {
  const invalidate = useThree((s) => s.invalidate)
  const group = useRef<Group>(null)
  const slab = useRef<MeshLambertMaterial>(null)
  const edge = useRef<ComponentRef<typeof Line>>(null)
  const cur = useRef({ drop: out ? 1 : 0 })

  useEffect(() => {
    // Coming back (Repair, Reset) jumps; going out animates unless motion is reduced.
    if (!out || reduced) cur.current.drop = out ? 1 : 0
    invalidate()
  }, [out, reduced, invalidate])

  useFrame((_, dt) => {
    const c = cur.current
    const want = out ? 1 : 0
    const drop = reduced ? want : approach(c.drop, want, Math.min(dt, 1 / 30), 2.6)
    const moving = drop !== c.drop
    c.drop = drop
    if (group.current) group.current.position.y = -DROP * drop
    if (slab.current) {
      slab.current.color.copy(SLAB_LIVE).lerp(SLAB_DEAD, drop)
      slab.current.opacity = 1 - 0.5 * drop
    }
    if (edge.current) {
      edge.current.material.color.copy(EDGE_LIVE).lerp(EDGE_DEAD, drop)
      edge.current.material.opacity = 1 - 0.6 * drop
    }
    if (moving) invalidate()
  })

  const x0 = -PLAT.w / 2 + 0.04
  const x1 = PLAT.w / 2 - 0.04
  const z0 = -PLAT.d / 2 + 0.04
  const z1 = PLAT.d / 2 - 0.04
  // On a small stage, "1a" instead of "ap-south-1a".
  const name = narrow ? s3Story.azs[index].slice(s3Story.regionCode.length - 1) : s3Story.azs[index]
  return (
    <group position={[AZ_X[index], 0, 0]}>
      <group ref={group} position={[0, -DROP * cur.current.drop, 0]}>
        <mesh position={[0, -PLAT.h / 2, 0]}>
          <boxGeometry args={[PLAT.w, PLAT.h, PLAT.d]} />
          <meshLambertMaterial ref={slab} color={HEX.screen2} transparent toneMapped={false} />
        </mesh>
        <Line
          ref={edge}
          points={[
            [x0, 0.003, z0],
            [x1, 0.003, z0],
            [x1, 0.003, z1],
            [x0, 0.003, z1],
            [x0, 0.003, z0],
          ]}
          color={HEX.az}
          lineWidth={2}
          dashed
          dashSize={0.12}
          gapSize={0.08}
          transparent
        />
        <Label position={[0, 0, PLAT.d / 2 + 0.16]} kind={out ? 'bad' : 'az'}>
          {out ? `${name} out` : name}
        </Label>
        {children}
      </group>
    </group>
  )
}

/** The tag over an AZ's devices: whether it holds copies, and whether a device broke. The AZ's own label says when it is out. */
function copiesTag(where: Where, az: AzIndex, stored: boolean, breaks: Break[], narrow: boolean): { text: string; kind: LabelKind } | null {
  if (azOut(az, breaks) || !stored) return null
  if (!homeAzs(where).includes(az)) return narrow ? null : { text: 'no copy here', kind: 'dim' }
  // AWS doesn't say how many copies, so the tag says only that copies are there.
  const copies = copiesLeft(where, breaks)[az] > 0 ? 'copies' : 'no copy'
  if (narrow) return { text: copies, kind: 'copy' }
  const broken = deviceBroken(az, breaks) ? ', 1 device broken' : ''
  return { text: where === 'ebs' ? `EBS volume: ${copies}${broken}` : `${copies}${broken}`, kind: 'copy' }
}

/* ------------------------------------------------------------------ Scene */

/**
 * Where a photo really lives, in 3D: a teal dashed Region with three AZ platforms, a row of storage devices on each.
 * Uploading to S3 Standard sends copies to devices in all three AZs; an EBS volume keeps its copies in one AZ.
 * Breaking a device or taking out a whole AZ marks what is lost; the read path shows which copy still answers.
 * Loaded lazily inside Scene3D. Draws on demand and asks for frames only while something moves.
 */
export default function CopiesScene({
  where,
  stored,
  breaks,
  reduced,
}: {
  where: Where
  stored: boolean
  breaks: Break[]
  reduced: boolean
}) {
  const narrow = useThree((s) => s.size.width) < 520
  const homes = homeAzs(where)
  const serving = stored ? servingAz(where, breaks) : null
  const canRead = serving !== null

  const photoLabel = !stored
    ? 'Your photo'
    : canRead
      ? `Reads from ${narrow ? s3Story.azs[serving].slice(s3Story.regionCode.length - 1) : s3Story.azs[serving]}`
      : narrow
        ? "Can't read it"
        : "Can't read the photo"

  return (
    <>
      <CameraRig />
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 7, 5]} intensity={0.9} />

      {/* The Region: a teal dashed frame on the ground */}
      <Line
        points={[
          [REGION.x0, -PLAT.h + 0.002, REGION.z0],
          [REGION.x1, -PLAT.h + 0.002, REGION.z0],
          [REGION.x1, -PLAT.h + 0.002, REGION.z1],
          [REGION.x0, -PLAT.h + 0.002, REGION.z1],
          [REGION.x0, -PLAT.h + 0.002, REGION.z0],
        ]}
        color={HEX.region}
        lineWidth={2}
        dashed
        dashSize={0.18}
        gapSize={0.12}
      />
      {!narrow && (
        <Label position={[REGION.x1 - 0.05, -PLAT.h, REGION.z1]} kind="region" place="above-left">
          Region {s3Story.regionCode}
        </Label>
      )}

      {AZ_INDEXES.map((az) => {
        const out = azOut(az, breaks)
        const broken = deviceBroken(az, breaks)
        const tag = copiesTag(where, az, stored, breaks, narrow)
        // Reads come from the first copy still standing in the serving AZ.
        const servingSlot = DATA_DEVICES[broken ? 1 : 0]
        return (
          <AzPlatform key={az} index={az} out={out} reduced={reduced} narrow={narrow}>
            <Storage out={out} broken={broken} />
            {tag && (
              <Label position={[0, BUILDING.h + 0.08, BUILDING.z]} kind={tag.kind} place="above">
                {tag.text}
              </Label>
            )}
            {DATA_DEVICES.map((slot, i) => (
              <Copy
                key={slot}
                az={az}
                slot={slot}
                order={az * DATA_DEVICES.length + i}
                wanted={stored && homes.includes(az)}
                alive={!out && !(broken && i === 0)}
                serving={serving === az && slot === servingSlot}
                reduced={reduced}
              />
            ))}
          </AzPlatform>
        )
      })}

      {/* The photo being stored and read, in front of the Region */}
      <mesh position={[PHOTO.x, PHOTO.y, PHOTO.z]}>
        <boxGeometry args={[PHOTO.w, PHOTO.h, PHOTO.d]} />
        <meshLambertMaterial color={STORAGE} transparent opacity={stored && !canRead ? 0.35 : 1} toneMapped={false} />
        <Edges color={HEX.text} transparent opacity={0.9} />
      </mesh>
      {/* Under the photo, so it never covers the middle AZ's name label behind it */}
      <Label position={[PHOTO.x, PHOTO.y - 0.12, PHOTO.z]} kind={stored && !canRead ? 'bad' : 'tag'} place="below">
        {photoLabel}
      </Label>
    </>
  )
}
