import { useEffect, useLayoutEffect, useMemo, useRef, type ComponentRef, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Edges, Html, Line } from '@react-three/drei'
import { Color, MathUtils, Vector3, type Group, type Mesh, type MeshLambertMaterial, type PerspectiveCamera } from 'three'
import { cn } from '../../../../lib/cn'
import { story } from '../../story'
import { SLOTS, TOTAL_UNITS, type HostStage } from './hostModel'

/* Hex values of the design tokens (three.js cannot read CSS variables). */
const HEX = {
  screen2: '#1c2c39',
  accent: '#5fb3e6',
  line: '#2e4352',
  dim: '#8fa6b6',
  text: '#d6e2ea',
  compute: '#ed7100',
  az: '#147eba',
}
const FREE_COLOR = new Color(HEX.dim)
const YOUR_COLOR = new Color(HEX.compute)

/* Sizes in scene units (roughly metres). The host is the top server in the rack. */
const RACK = { w: 1.8, h: 2.3, d: 1.1, wall: 0.06 }
const SLAB = { w: 1.66, h: 0.26, d: 1 }
const SLAB_YS = [0.3, 0.7, 1.1, 1.5, 1.9]
const HOST_Y = SLAB_YS[SLAB_YS.length - 1]
/** How far the host slides out of the rack, like a drawer. */
const PULL_Z = 1.45
const NITRO_H = 0.07
const BLOCK = { h: 0.38, d: 0.8, gap: 0.06, span: 1.56 }
const BLOCK_BASE = SLAB.h / 2 + NITRO_H
const AZ_RECT = { x0: -1.35, x1: 1.35, z0: -0.85, z1: 1.25 }

const UNIT_W = (BLOCK.span - BLOCK.gap * (TOTAL_UNITS - 1)) / TOTAL_UNITS
/** Instance blocks laid out left to right on top of the host. */
const BLOCKS = (() => {
  let x = -BLOCK.span / 2
  return SLOTS.map((s) => {
    const w = s.units * UNIT_W + (s.units - 1) * BLOCK.gap
    const cx = x + w / 2
    x += w + BLOCK.gap
    return { ...s, w, cx }
  })
})()

/* Animation lengths in seconds. Motion only follows the learner's Split and Rent presses. */
const SPLIT_SECONDS = 1.8
const RENT_SECONDS = 1.1

const seg = (p: number, a: number, b: number) => MathUtils.clamp((p - a) / (b - a), 0, 1)
const ease = (t: number) => t * t * (3 - 2 * t)

/** Where every part is for a given progress of the split (0..1) and the rent (0..1). */
function pose(split: number, rent: number) {
  return {
    slide: ease(seg(split, 0, 0.4)),
    nitro: ease(seg(split, 0.35, 0.55)),
    blocks: BLOCKS.map((_, i) => ease(seg(split, 0.5 + i * 0.08, 0.76 + i * 0.08))),
    you: ease(seg(rent, 0, 0.55)),
    az: ease(seg(rent, 0.35, 1)),
  }
}

/* Camera: look at the rack from the front right and step back until the scene fits the stage. */
const TARGET = new Vector3(0, 1.3, 0.7)
const VIEW_DIR = new Vector3(0.38, 0.6, 1).normalize()
const FIT = { w: 3.6, h: 3.4 }

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

/**
 * Where every label's DOM node lives: the canvas's own wrapper, fixed from the first frame (same fix as the Region scene).
 * Without it, drei's Html moves its node once the canvas connects its events and, when the scene mounts inside
 * React DOM's commit (cached lazy chunk, e.g. on re-entering the lesson), unmounts its React root synchronously there.
 */
function useLabelHost(): RefObject<HTMLElement> {
  const gl = useThree((s) => s.gl)
  return useMemo(() => ({ current: gl.domElement.parentElement! }), [gl])
}

/** A short DOM label pinned to a point in the scene. Hidden from screen readers: the status line and legend say the same. */
function Label({
  position,
  labelRef,
  opacity = 1,
  kind = 'tag',
  place = 'center',
  children,
}: {
  position: [number, number, number]
  labelRef?: RefObject<HTMLDivElement | null> | ((el: HTMLDivElement | null) => void)
  opacity?: number
  kind?: 'tag' | 'text' | 'az'
  /** center: on the point; right: starts at the point; above-right: sits up and right of it */
  place?: 'center' | 'right' | 'above-right'
  children: ReactNode
}) {
  const shift: Record<typeof place, string> = {
    center: '',
    right: '-translate-y-1/2',
    'above-right': '-translate-y-full',
  }
  const style: CSSProperties = { opacity }
  const host = useLabelHost()
  return (
    <Html position={position} center={place === 'center'} zIndexRange={[10, 0]} pointerEvents="none" portal={host}>
      <div
        ref={labelRef}
        aria-hidden
        style={style}
        className={cn(
          'whitespace-nowrap text-xs font-bold leading-tight',
          kind === 'tag' && 'rounded-[3px] border border-screen-line bg-screen/85 px-1.5 py-0.5 text-screen-text',
          kind === 'text' && 'text-screen-text',
          kind === 'az' && 'rounded-[3px] bg-az px-1.5 py-0.5 text-white',
          shift[place],
        )}
      >
        {children}
      </div>
    </Html>
  )
}

function Rack() {
  const wall = (
    <>
      <meshLambertMaterial color={HEX.screen2} toneMapped={false} />
      <Edges color={HEX.dim} transparent opacity={0.45} />
    </>
  )
  return (
    <group>
      <mesh position={[-RACK.w / 2, RACK.h / 2, 0]}>
        <boxGeometry args={[RACK.wall, RACK.h, RACK.d]} />
        {wall}
      </mesh>
      <mesh position={[RACK.w / 2, RACK.h / 2, 0]}>
        <boxGeometry args={[RACK.wall, RACK.h, RACK.d]} />
        {wall}
      </mesh>
      <mesh position={[0, RACK.h, 0]}>
        <boxGeometry args={[RACK.w + RACK.wall, RACK.wall, RACK.d]} />
        {wall}
      </mesh>
      <mesh position={[0, RACK.wall / 2, 0]}>
        <boxGeometry args={[RACK.w + RACK.wall, RACK.wall, RACK.d]} />
        {wall}
      </mesh>
      <mesh position={[0, RACK.h / 2, -RACK.d / 2]}>
        <boxGeometry args={[RACK.w, RACK.h, 0.03]} />
        <meshLambertMaterial color={HEX.screen2} toneMapped={false} />
      </mesh>
      {SLAB_YS.slice(0, -1).map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[SLAB.w, SLAB.h, SLAB.d]} />
          <meshLambertMaterial color={HEX.line} toneMapped={false} />
          <Edges color={HEX.dim} transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * The 3D host: a rack of servers. Split pulls the top server out and shows the Nitro System carving it into instances
 * owned by different customers; Rent turns the free one into yours and marks its Availability Zone.
 * Loaded lazily inside Scene3D. Draws on demand and asks for frames only while an animation runs.
 */
export default function HostScene({ stage, reduced }: { stage: HostStage; reduced: boolean }) {
  const invalidate = useThree((s) => s.invalidate)
  const want = { split: stage === 'whole' ? 0 : 1, rent: stage === 'rented' ? 1 : 0 }
  // Start at the end state, so a scene that loads after a press does not replay it.
  const progress = useRef({ split: want.split, rent: want.rent })

  const host = useRef<Group>(null)
  const nitro = useRef<Mesh>(null)
  const blocks = useRef<(Mesh | null)[]>([])
  const yourMaterial = useRef<MeshLambertMaterial>(null)
  const azLine = useRef<ComponentRef<typeof Line>>(null)
  const nitroLabel = useRef<HTMLDivElement>(null)
  const azLabel = useRef<HTMLDivElement>(null)
  const blockLabels = useRef<(HTMLDivElement | null)[]>([])
  const freeText = useRef<HTMLSpanElement>(null)
  const youText = useRef<HTMLSpanElement>(null)

  // Going back (Reset) or reduced motion: jump straight to the end state.
  useEffect(() => {
    const p = progress.current
    if (reduced || want.split < p.split) p.split = want.split
    if (reduced || want.rent < p.rent) p.rent = want.rent
    invalidate()
  }, [want.split, want.rent, reduced, invalidate])

  useFrame((_, dt) => {
    const p = progress.current
    const step = Math.min(dt, 1 / 30)
    let moving = false
    if (p.split < want.split) {
      p.split = Math.min(want.split, p.split + step / SPLIT_SECONDS)
      moving = true
    } else if (p.rent < want.rent) {
      // Renting from a whole server finishes the split first.
      p.rent = Math.min(want.rent, p.rent + step / RENT_SECONDS)
      moving = true
    }

    const now = pose(p.split, p.rent)
    if (host.current) host.current.position.z = now.slide * PULL_Z
    if (nitro.current) {
      nitro.current.scale.y = Math.max(now.nitro, 1e-4)
      nitro.current.visible = now.nitro > 0
    }
    blocks.current.forEach((b, i) => {
      if (!b) return
      const r = now.blocks[i]
      b.scale.y = Math.max(r, 1e-4)
      b.position.y = BLOCK_BASE + (BLOCK.h * r) / 2
      b.visible = r > 0
    })
    if (yourMaterial.current) {
      yourMaterial.current.color.lerpColors(FREE_COLOR, YOUR_COLOR, now.you)
      yourMaterial.current.opacity = 0.14 + 0.86 * now.you
    }
    if (azLine.current) {
      azLine.current.material.opacity = now.az
      azLine.current.visible = now.az > 0
    }
    if (nitroLabel.current) nitroLabel.current.style.opacity = String(now.nitro)
    if (azLabel.current) azLabel.current.style.opacity = String(now.az)
    // The Free and You words cross-fade with the block's colour instead of flipping when Rent is pressed.
    if (freeText.current) freeText.current.style.opacity = String(1 - now.you)
    if (youText.current) youText.current.style.opacity = String(now.you)
    blockLabels.current.forEach((el, i) => {
      if (el) el.style.opacity = String(now.blocks[i])
    })

    if (moving) invalidate()
  })

  // Labels render in their own DOM root, so they also get their starting opacity from here.
  const start = pose(progress.current.split, progress.current.rent)

  return (
    <>
      <CameraRig />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 6, 5]} intensity={0.9} />

      <Rack />

      {/* The host server, which slides out of the rack like a drawer when split */}
      <group ref={host} position={[0, HOST_Y, start.slide * PULL_Z]}>
        <mesh>
          <boxGeometry args={[SLAB.w, SLAB.h, SLAB.d]} />
          <meshLambertMaterial color={HEX.line} toneMapped={false} />
          {/* Accent edges mark the one server this view follows */}
          <Edges color={HEX.accent} />
        </mesh>
        <Label position={[0, 0, SLAB.d / 2 + 0.001]}>Physical server</Label>

        {/* The Nitro System: the layer that splits the server and keeps instances apart */}
        <mesh
          ref={nitro}
          position={[0, SLAB.h / 2 + NITRO_H / 2, 0]}
          scale={[1, Math.max(start.nitro, 1e-4), 1]}
          visible={start.nitro > 0}
        >
          <boxGeometry args={[SLAB.w, NITRO_H, SLAB.d]} />
          <meshLambertMaterial color={HEX.text} toneMapped={false} />
        </mesh>
        <Label
          position={[SLAB.w / 2 + 0.08, SLAB.h / 2 + NITRO_H / 2, SLAB.d / 2]}
          place="right"
          labelRef={nitroLabel}
          opacity={start.nitro}
        >
          Nitro System
        </Label>

        {BLOCKS.map((b, i) => {
          const r = start.blocks[i]
          const yours = b.owner === 'you'
          return (
            <group key={b.id} position={[b.cx, 0, 0]}>
              <mesh
                ref={(m) => {
                  blocks.current[i] = m
                }}
                position={[0, BLOCK_BASE + (BLOCK.h * r) / 2, 0]}
                scale={[1, Math.max(r, 1e-4), 1]}
                visible={r > 0}
              >
                <boxGeometry args={[b.w, BLOCK.h, BLOCK.d]} />
                {yours ? (
                  <meshLambertMaterial
                    ref={yourMaterial}
                    color={start.you > 0 ? HEX.compute : HEX.dim}
                    transparent
                    opacity={0.14 + 0.86 * start.you}
                    toneMapped={false}
                  />
                ) : (
                  <meshLambertMaterial color={HEX.dim} toneMapped={false} />
                )}
                <Edges color={yours ? HEX.dim : HEX.text} transparent opacity={yours ? 0.9 : 0.7} />
              </mesh>
              <Label
                position={[0, BLOCK_BASE + BLOCK.h + 0.12, 0]}
                kind="text"
                opacity={r}
                labelRef={(el) => {
                  blockLabels.current[i] = el
                }}
              >
                {yours ? (
                  <span className="grid">
                    <span ref={freeText} style={{ gridArea: '1 / 1', opacity: 1 - start.you }}>
                      Free
                    </span>
                    <span ref={youText} style={{ gridArea: '1 / 1', opacity: start.you }}>
                      You
                    </span>
                  </span>
                ) : (
                  b.label
                )}
              </Label>
            </group>
          )
        })}
      </group>

      {/* The Availability Zone this rack sits in, drawn as a dashed boundary on the floor */}
      <Line
        ref={azLine}
        points={[
          [AZ_RECT.x0, 0.002, AZ_RECT.z0],
          [AZ_RECT.x1, 0.002, AZ_RECT.z0],
          [AZ_RECT.x1, 0.002, AZ_RECT.z1],
          [AZ_RECT.x0, 0.002, AZ_RECT.z1],
          [AZ_RECT.x0, 0.002, AZ_RECT.z0],
        ]}
        color={HEX.az}
        lineWidth={2}
        dashed
        dashSize={0.14}
        gapSize={0.09}
        transparent
        // No `visible` prop here: drei spreads Line props onto the material too, and a hidden material never comes back.
        opacity={start.az}
      />
      <Label position={[AZ_RECT.x0 + 0.05, 0, AZ_RECT.z1]} kind="az" place="above-right" labelRef={azLabel} opacity={start.az}>
        AZ {story.azs[0]}
      </Label>
    </>
  )
}
