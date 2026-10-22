import { useEffect, useLayoutEffect, useRef, type ComponentRef, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Edges, Html, Line } from '@react-three/drei'
import {
  Color,
  MathUtils,
  Object3D,
  Vector3,
  type Group,
  type InstancedMesh,
  type MeshLambertMaterial,
  type PerspectiveCamera,
} from 'three'
import { cn } from '../../../../lib/cn'
import { story } from '../../story'
import { HEX } from './look'
import { DB_HOME, REGION_AZS, type FleetConfig, type Pay, type RemovedReason, type Tick } from './scaleModel'

/* Layout in scene units. AZ platforms sit left to right; the load balancer is in front; customers further in front. */
const AZ_X = [-2.3, 0, 2.3]
const PLAT = { w: 2.05, d: 2.2, h: 0.12 }
const COLS = [-0.69, -0.23, 0.23, 0.69]
const ROWS = [0.68, 0.22, -0.24]
const SLOTS = COLS.length * ROWS.length
const BLOCK = { w: 0.34, h: 0.36, d: 0.34 }
const DB = { z: -0.76, r: 0.19, h: 0.34 }
const GROUND = -PLAT.h
const ALB = { z: 1.95, w: 6.5, d: 0.3, h: 0.18 }
const REGION = { x0: -3.6, x1: 3.6, z0: -1.5, z1: 2.55 }
const CUSTOMER_Z = 3.45
/** How far a failed AZ sinks. */
const DROP = 0.8

const slotXZ = (slot: number): [number, number] => [COLS[slot % COLS.length], ROWS[Math.floor(slot / COLS.length) % ROWS.length]]

/** Eases `cur` toward `target`; returns `target` once close, so motion stops. */
function approach(cur: number, target: number, dt: number, rate: number) {
  const next = cur + (target - cur) * (1 - Math.exp(-rate * dt))
  return Math.abs(target - next) < 0.002 ? target : next
}

/* ------------------------------------------------------------------ Camera */

const TARGET = new Vector3(0, -0.1, 1.3)
const VIEW_DIR = new Vector3(0.1, 1.0, 0.95).normalize()
const FIT = { w: 7.7, h: 5.1 }

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

type LabelKind = 'tag' | 'region' | 'az' | 'alb' | 'db' | 'bad' | 'warn' | 'dim'

const labelClass: Record<LabelKind, string> = {
  tag: 'rounded-[3px] border border-screen-line bg-screen/85 px-1.5 py-0.5 text-screen-text',
  region: 'rounded-[3px] bg-region px-1.5 py-0.5 text-white',
  az: 'rounded-[3px] bg-az px-1.5 py-0.5 text-white',
  alb: 'rounded-[3px] bg-networking px-1.5 py-0.5 text-white',
  db: 'rounded-[3px] bg-database px-1.5 py-0.5 text-white',
  bad: 'rounded-[3px] bg-bad px-1.5 py-0.5 text-white',
  warn: 'rounded-[3px] bg-warn-soft px-1.5 py-0.5 text-warn',
  dim: 'rounded-[3px] border border-screen-line bg-screen/85 px-1.5 py-0.5 text-screen-dim',
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
  /** center: on the point; above: sits on top of it; above-right / above-left: up and to that side of it */
  place?: 'center' | 'above' | 'above-right' | 'above-left'
  children: ReactNode
}) {
  const shift = {
    center: '',
    above: '-translate-x-1/2 -translate-y-full',
    'above-right': '-translate-y-full',
    'above-left': '-translate-x-full -translate-y-full',
  }[place]
  return (
    <Html position={position} center={place === 'center'} zIndexRange={[10, 0]} pointerEvents="none">
      <div aria-hidden className={cn('whitespace-nowrap text-xs font-bold leading-tight', labelClass[kind], shift)}>
        {children}
      </div>
    </Html>
  )
}

/* ------------------------------------------------------------------ Servers */

type BlockState = 'ready' | 'booting' | RemovedReason

const BODY: Record<Pay, string> = { 'savings-plan': HEX.compute, 'on-demand': HEX.computeTint, spot: HEX.warnSoft }
const EDGE: Record<Pay, string> = { 'savings-plan': HEX.text, 'on-demand': HEX.compute, spot: HEX.warn }
const RED = new Color(HEX.bad)

function goal(state: BlockState) {
  const y = BLOCK.h / 2
  switch (state) {
    case 'ready':
      return { y, s: 1, o: 1, red: 0 }
    case 'booting':
      return { y, s: 1, o: 0.25, red: 0 }
    case 'crash':
      return { y: y - 0.3, s: 0, o: 1, red: 1 }
    case 'spot':
      return { y: y + 0.9, s: 0, o: 0.7, red: 0 }
    case 'az-down':
    case 'scale-in':
      return { y, s: 0, o: 0.6, red: 0 }
  }
}

/**
 * One server: pops in when launched, is see-through while it boots, then turns solid.
 * Leaving, it sinks red (crash), lifts away (Spot) or shrinks (scale-in, or with its failed AZ).
 */
function Block({
  x,
  z,
  pay,
  state,
  reduced,
  appear,
  note,
}: {
  x: number
  z: number
  pay: Pay
  state: BlockState
  reduced: boolean
  /** Pop in from nothing (a server launched after the scene first drew). */
  appear: boolean
  /** A short red tag above it, such as "120 orders lost". */
  note?: string
}) {
  const invalidate = useThree((s) => s.invalidate)
  const group = useRef<Group>(null)
  const body = useRef<MeshLambertMaterial>(null)
  const base = useRef(new Color(BODY[pay]))
  // A server seen for the first time while leaving starts from standing, so its exit still shows.
  const g0 = goal(reduced ? state : state === 'booting' || state === 'ready' ? state : 'ready')
  const cur = useRef({ x, z, ...g0, s: appear && !reduced ? 0 : g0.s })

  useEffect(() => {
    base.current.set(BODY[pay])
    invalidate()
  }, [pay, state, x, z, invalidate])

  useFrame((_, dt) => {
    const c = cur.current
    const g = goal(state)
    const step = Math.min(dt, 1 / 30)
    const shrinkRate = state === 'crash' ? 2.2 : 5
    const next = reduced
      ? { x, z, ...g }
      : {
          x: approach(c.x, x, step, 8),
          z: approach(c.z, z, step, 8),
          y: approach(c.y, g.y, step, state === 'spot' ? 3 : 4),
          s: approach(c.s, g.s, step, g.s > c.s ? 9 : shrinkRate),
          o: approach(c.o, g.o, step, 6),
          red: approach(c.red, g.red, step, 12),
        }
    const moving = next.x !== c.x || next.z !== c.z || next.y !== c.y || next.s !== c.s || next.o !== c.o || next.red !== c.red
    cur.current = next
    const gr = group.current
    if (gr) {
      gr.position.set(next.x, next.y, next.z)
      gr.scale.setScalar(Math.max(next.s, 1e-4))
      gr.visible = next.s > 0.002
    }
    if (body.current) {
      body.current.color.copy(base.current).lerp(RED, next.red)
      body.current.opacity = next.o
    }
    if (moving) invalidate()
  })

  const c = cur.current
  return (
    <>
      <group ref={group} position={[c.x, c.y, c.z]} scale={Math.max(c.s, 1e-4)} visible={c.s > 0.002}>
        <mesh>
          <boxGeometry args={[BLOCK.w, BLOCK.h, BLOCK.d]} />
          <meshLambertMaterial ref={body} color={BODY[pay]} transparent opacity={c.o} toneMapped={false} />
          <Edges color={EDGE[pay]} transparent opacity={0.9} />
        </mesh>
        {pay === 'spot' && (
          // An amber band marks Spot, like the hatching in lesson 5's chart.
          <mesh>
            <boxGeometry args={[BLOCK.w + 0.012, BLOCK.h * 0.3, BLOCK.d + 0.012]} />
            <meshLambertMaterial color={HEX.warn} transparent opacity={c.o} toneMapped={false} />
          </mesh>
        )}
      </group>
      {note && (
        <Label position={[x, BLOCK.h + 0.3, z]} kind="bad">
          {note}
        </Label>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ Database */

/** The ready-made orders database (Amazon RDS, Multi-AZ): primary in one AZ, standby copy in another. */
function Database({
  role,
  unused,
  failing,
  narrow,
}: {
  role: 'primary' | 'standby' | 'gone'
  unused: boolean
  failing: boolean
  narrow: boolean
}) {
  const faded = unused || role === 'gone'
  return (
    <group position={[0, 0, DB.z]}>
      <mesh position={[0, DB.h / 2, 0]}>
        <cylinderGeometry args={[DB.r, DB.r, DB.h, 24]} />
        <meshLambertMaterial color={HEX.database} transparent opacity={faded ? 0.35 : 1} toneMapped={false} />
        <Edges color={HEX.text} transparent opacity={faded ? 0.3 : 0.7} threshold={30} />
      </mesh>
      {role !== 'gone' && (
        <Label position={[0, DB.h + 0.2, 0]} kind={unused ? 'dim' : failing ? 'warn' : 'db'}>
          {unused
            ? narrow
              ? 'not used'
              : 'DB not used'
            : failing
              ? narrow
                ? 'Failing over'
                : 'Failing over: orders wait'
              : role === 'primary'
                ? narrow
                  ? 'primary'
                  : 'DB primary'
                : narrow
                  ? 'standby'
                  : 'DB standby'}
        </Label>
      )}
    </group>
  )
}

/* ------------------------------------------------------------------ AZ */

const SLAB_LIVE = new Color(HEX.screen2)
const SLAB_DEAD = new Color(HEX.line)
const EDGE_LIVE = new Color(HEX.az)
const EDGE_DEAD = new Color(HEX.dim)

/** One Availability Zone: a platform with a blue dashed edge. A failed AZ greys out and sinks. */
function AzPlatform({
  index,
  inGroup,
  down,
  reduced,
  narrow,
  children,
}: {
  index: number
  inGroup: boolean
  down: boolean
  reduced: boolean
  /** A small stage: short labels, so they do not cover each other. */
  narrow: boolean
  children: ReactNode
}) {
  const invalidate = useThree((s) => s.invalidate)
  const group = useRef<Group>(null)
  const slab = useRef<MeshLambertMaterial>(null)
  const edge = useRef<ComponentRef<typeof Line>>(null)
  const cur = useRef({ drop: down ? 1 : 0 })

  useEffect(() => {
    invalidate()
  }, [down, inGroup, invalidate])

  useFrame((_, dt) => {
    const c = cur.current
    const want = down ? 1 : 0
    const drop = reduced ? want : approach(c.drop, want, Math.min(dt, 1 / 30), 2.6)
    const moving = drop !== c.drop
    c.drop = drop
    if (group.current) group.current.position.y = -DROP * drop
    if (slab.current) {
      slab.current.color.copy(SLAB_LIVE).lerp(SLAB_DEAD, drop)
      slab.current.opacity = (inGroup ? 1 : 0.5) * (1 - 0.5 * drop)
    }
    if (edge.current) {
      edge.current.material.color.copy(EDGE_LIVE).lerp(EDGE_DEAD, drop)
      edge.current.material.opacity = (inGroup ? 1 : 0.4) * (1 - 0.6 * drop)
    }
    if (moving) invalidate()
  })

  const x0 = -PLAT.w / 2 + 0.04
  const x1 = PLAT.w / 2 - 0.04
  const z0 = -PLAT.d / 2 + 0.04
  const z1 = PLAT.d / 2 - 0.04
  // On a small stage, "1a" instead of "ap-south-1a".
  const name = narrow ? story.azs[index].slice(story.regionCode.length - 1) : story.azs[index]
  return (
    <group position={[AZ_X[index], 0, 0]}>
      <group ref={group} position={[0, -DROP * cur.current.drop, 0]}>
        <mesh position={[0, -PLAT.h / 2, 0]}>
          <boxGeometry args={[PLAT.w, PLAT.h, PLAT.d]} />
          <meshLambertMaterial ref={slab} color={HEX.screen2} transparent opacity={inGroup ? 1 : 0.5} toneMapped={false} />
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
          // No `visible` prop: drei spreads Line props onto the material too, and a hidden material never comes back.
        />
        <Label position={[0, 0, PLAT.d / 2 + 0.16]} kind={down ? 'bad' : inGroup ? 'az' : 'dim'}>
          {down ? `${name} down` : inGroup ? name : narrow ? `${name} unused` : `${name}: not used`}
        </Label>
        {children}
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ Load balancer */

function LoadBalancer({
  healthy,
  webOpen,
  turnedAway,
  narrow,
}: {
  healthy: boolean[]
  webOpen: boolean
  turnedAway: number
  narrow: boolean
}) {
  return (
    <group>
      <mesh position={[0, GROUND + ALB.h / 2, ALB.z]}>
        <boxGeometry args={[ALB.w, ALB.h, ALB.d]} />
        <meshLambertMaterial color={HEX.networking} toneMapped={false} />
        <Edges color={HEX.text} transparent opacity={0.6} />
      </mesh>
      {/* Paths from the load balancer to each AZ that has healthy servers */}
      {healthy.map((ok, a) =>
        ok ? (
          <Line
            key={a}
            points={[
              [AZ_X[a], GROUND + 0.02, ALB.z - ALB.d / 2],
              [AZ_X[a], GROUND + 0.02, PLAT.d / 2],
            ]}
            color={HEX.networking}
            lineWidth={3}
          />
        ) : null,
      )}
      {!narrow && (
        <Label position={[0, GROUND + ALB.h + 0.02, ALB.z + 0.05]} kind="alb">
          Load balancer
        </Label>
      )}
      {!webOpen && (
        <>
          <mesh position={[0, GROUND + 0.22, ALB.z + ALB.d / 2 + 0.06]}>
            <boxGeometry args={[ALB.w, 0.44, 0.03]} />
            <meshBasicMaterial color={HEX.bad} transparent opacity={0.55} toneMapped={false} />
          </mesh>
          <Label position={[-2.3, GROUND + 0.5, ALB.z + 0.3]} kind="bad">
            Web port closed
          </Label>
        </>
      )}
      {webOpen && turnedAway > 0 && (
        <Label position={[2.3, GROUND + 0.5, ALB.z + 0.3]} kind="bad">
          {turnedAway} turned away
        </Label>
      )}
    </group>
  )
}

/* ------------------------------------------------------------------ Requests */

const N = 36
/** Seconds for one request to travel from a customer to where its order is saved. */
const TRIP = 1.9
const GOLDEN = 0.6180339887

type Route = { a: Vector3; b: Vector3; c: Vector3 | null; d: Vector3 | null; kind: 'db' | 'wait' | 'disk' | 'away' }

const C_REQ = new Color(HEX.accent)
const C_DB = new Color(HEX.database)
const C_WAIT = new Color(HEX.warnSoft)
const C_AWAY = new Color(HEX.bad)

/**
 * Request dots: customers to the load balancer, on to a healthy server, then to the database (or into the server's own disk).
 * Customers with no healthy server to take them bounce off the load balancer in red. They run only while the day plays.
 */
function Requests({ tick, cfg, playing, reduced }: { tick: Tick; cfg: FleetConfig; playing: boolean; reduced: boolean }) {
  const invalidate = useThree((s) => s.invalidate)
  const mesh = useRef<InstancedMesh>(null)
  const tickRef = useRef(tick)
  const routes = useRef<(Route | null)[]>(Array.from({ length: N }, () => null))
  const lastU = useRef<number[]>(Array.from({ length: N }, () => 1))
  const counter = useRef(0)
  const clock = useRef(0)
  const dummy = useRef(new Object3D())
  const color = useRef(new Color())
  const run = playing && !reduced

  useEffect(() => {
    tickRef.current = tick
  }, [tick])

  useLayoutEffect(() => {
    const m = mesh.current
    if (!m) return
    if (!run) {
      m.count = 0
      routes.current = routes.current.map(() => null)
      lastU.current = lastU.current.map(() => 1)
    }
    invalidate()
  }, [run, invalidate])

  const makeRoute = (i: number): Route => {
    const t = tickRef.current
    const k = counter.current++
    const a = new Vector3((((i * 7) % 11) - 5) * 0.55, 0.12, CUSTOMER_Z)
    const ready = t.instances.filter((x) => !x.booting)
    const share = t.demand > 0 ? t.served / t.demand : 0
    const served = ready.length > 0 && (k * GOLDEN) % 1 < share
    if (!served) {
      const b = new Vector3(a.x * 0.8, 0.12, ALB.z + ALB.d / 2 + 0.05)
      return { a, b, c: null, d: null, kind: 'away' }
    }
    const inst = ready[k % ready.length]
    const slot = t.instances.filter((x) => x.az === inst.az).sort((p, q) => p.id - q.id).findIndex((x) => x.id === inst.id)
    const [sx, sz] = slotXZ(Math.max(0, slot))
    const c = new Vector3(AZ_X[inst.az] + sx, BLOCK.h + 0.06, sz)
    const b = new Vector3(MathUtils.lerp(a.x, c.x, 0.5), 0.12, ALB.z)
    if (cfg.ordersOn === 'server-disk') return { a, b, c, d: null, kind: 'disk' }
    if (t.dbFailingOver || t.dbPrimary === null) return { a, b, c, d: null, kind: 'wait' }
    const d = new Vector3(AZ_X[t.dbPrimary], DB.h + 0.06, DB.z)
    return { a, b, c, d, kind: 'db' }
  }

  useFrame((_, dt) => {
    const m = mesh.current
    if (!m || !run) return
    clock.current += Math.min(dt, 1 / 20)
    m.count = N
    const o = dummy.current
    for (let i = 0; i < N; i++) {
      const u = (clock.current / TRIP + i / N) % 1
      if (u < lastU.current[i] || !routes.current[i]) routes.current[i] = makeRoute(i)
      lastU.current[i] = u
      const r = routes.current[i]!
      let scale = 1
      const col = color.current.copy(C_REQ)
      if (u < 1 / 3) {
        o.position.lerpVectors(r.a, r.b, u * 3)
      } else if (r.kind === 'away') {
        // Bounce back toward the customer, red, and fade out.
        const p = Math.min(1, (u - 1 / 3) * 3)
        o.position.lerpVectors(r.b, r.a, p * 0.45)
        col.copy(C_AWAY)
        scale = 1 - p
      } else if (u < 2 / 3) {
        o.position.lerpVectors(r.b, r.c!, (u - 1 / 3) * 3)
      } else {
        const p = (u - 2 / 3) * 3
        if (r.kind === 'db') {
          o.position.lerpVectors(r.c!, r.d!, p)
          col.copy(C_DB)
        } else if (r.kind === 'wait') {
          // The database is failing over: the order waits on the server, then goes through.
          o.position.copy(r.c!)
          o.position.y += 0.08 + 0.04 * Math.sin(p * Math.PI * 2)
          col.copy(C_WAIT)
        } else {
          // Saved on the server's own disk.
          o.position.copy(r.c!)
          o.position.y -= p * 0.2
          scale = 1 - p
        }
      }
      o.scale.setScalar(Math.max(scale, 1e-4))
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      m.setColorAt(i, col)
    }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    invalidate()
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, N]} frustumCulled={false}>
      <sphereGeometry args={[0.055, 10, 8]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  )
}

/* ------------------------------------------------------------------ Scene */

/**
 * The Region in 3D: three AZ platforms inside a teal dashed Region frame, servers as blocks (colour = how they are paid for),
 * the load balancer in front, and the orders database's primary and standby on two platforms.
 * Loaded lazily inside Scene3D. Draws on demand; asks for frames only while something moves or the day plays.
 */
export default function RegionScene({
  tick,
  cfg,
  playing,
  reduced,
  live = true,
}: {
  tick: Tick
  cfg: FleetConfig
  playing: boolean
  reduced: boolean
  /** False for a preview of a day not run yet: no turned-away count. */
  live?: boolean
}) {
  const narrow = useThree((s) => s.size.width) < 520
  // Servers that exist when the scene first draws appear in place; later ones pop in.
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
  }, [])

  // Remember each server's slot, so a removed one leaves from where it stood.
  const lastSlot = useRef(new Map<number, number>())
  const slots = new Map<number, number>()
  for (let a = 0; a < REGION_AZS; a++) {
    tick.instances
      .filter((i) => i.az === a)
      .sort((p, q) => p.id - q.id)
      .forEach((inst, s) => slots.set(inst.id, s))
  }
  useEffect(() => {
    slots.forEach((s, id) => lastSlot.current.set(id, s))
  })

  const usesDb = cfg.ordersOn === 'database'
  const healthy = Array.from({ length: REGION_AZS }, (_, a) => a < cfg.azCount && !tick.azDown[a] && tick.perAz[a] > 0)
  const dbRole = (a: number): 'primary' | 'standby' | 'gone' =>
    tick.dbPrimary === a ? 'primary' : tick.dbStandby === a ? 'standby' : 'gone'

  return (
    <>
      <CameraRig />
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 7, 5]} intensity={0.9} />

      {/* The Region: a teal dashed frame on the ground */}
      <Line
        points={[
          [REGION.x0, GROUND + 0.002, REGION.z0],
          [REGION.x1, GROUND + 0.002, REGION.z0],
          [REGION.x1, GROUND + 0.002, REGION.z1],
          [REGION.x0, GROUND + 0.002, REGION.z1],
          [REGION.x0, GROUND + 0.002, REGION.z0],
        ]}
        color={HEX.region}
        lineWidth={2}
        dashed
        dashSize={0.18}
        gapSize={0.12}
      />
      {!narrow && (
        <Label position={[REGION.x1 - 0.05, GROUND, REGION.z1]} kind="region" place="above-left">
          Region {story.regionCode}
        </Label>
      )}

      {Array.from({ length: REGION_AZS }, (_, a) => {
        const here = tick.instances.filter((i) => i.az === a)
        const gone = tick.removed.filter((r) => r.az === a)
        return (
          <AzPlatform key={a} index={a} inGroup={a < cfg.azCount} down={tick.azDown[a]} reduced={reduced} narrow={narrow}>
            {/* One keyed list, so a server that leaves keeps its block and animates out from where it stood. */}
            {[
              ...here.map((inst) => {
                const s = slots.get(inst.id) ?? 0
                if (s >= SLOTS) return null
                const [x, z] = slotXZ(s)
                return (
                  <Block
                    key={inst.id}
                    x={x}
                    z={z}
                    pay={inst.pay}
                    state={inst.booting ? 'booting' : 'ready'}
                    reduced={reduced}
                    appear={mounted.current}
                  />
                )
              }),
              ...gone.map((r) => {
                const [x, z] = slotXZ(lastSlot.current.get(r.id) ?? 0)
                return (
                  <Block
                    key={r.id}
                    x={x}
                    z={z}
                    pay={r.pay}
                    state={r.reason}
                    reduced={reduced}
                    appear={false}
                    note={r.orders > 0 ? `${r.orders} orders lost` : undefined}
                  />
                )
              }),
            ]}
            {(a === DB_HOME.primary || a === DB_HOME.standby) && (
              <Database
                role={dbRole(a)}
                unused={!usesDb}
                failing={usesDb && tick.dbFailingOver && tick.dbPrimary === a}
                narrow={narrow}
              />
            )}
          </AzPlatform>
        )
      })}

      <LoadBalancer healthy={healthy} webOpen={cfg.webOpen} turnedAway={live ? tick.turnedAway : 0} narrow={narrow} />
      <Label position={[0, 0.1, CUSTOMER_Z + 0.25]} kind="tag">
        Customers
      </Label>

      <Requests tick={tick} cfg={cfg} playing={playing} reduced={reduced} />
    </>
  )
}
