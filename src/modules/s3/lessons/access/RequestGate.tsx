import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Archive, Bot, Check, DoorClosed, DoorOpen, Lock, ScanSearch, Send, Server, ShieldCheck, ShieldOff, ShoppingBag, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Pill, Readout, Switch, Button } from '../../../../components/controls'
import { Challenge, useChallenge } from '../../../../components/Challenge'
import { Term } from '../../../../components/Term'
import { cn } from '../../../../lib/cn'
import {
  challengeStart,
  checks,
  decide,
  GATE_NOW,
  leaks,
  RECEIPT_LINK,
  REQUESTS,
  solution,
  solved,
  wanted,
  type AccessConfig,
  type Reason,
  type Req,
} from './accessModel'
import { BUCKET_NAME } from '../../story'

/** The example bucket name, the same one the file-store diagram uses. */
export const BUCKET = BUCKET_NAME

/* ------------------------------------------------------------------ State */

export interface AccessGate {
  config: AccessConfig
  /** Counts presses of Send requests; a new number replays the dots. */
  run: number
  /** True while the results on screen match the current settings (any edit clears them). */
  live: boolean
  /** The learner just tried to make the bucket public while Block Public Access was on. */
  publicBlocked: boolean
  update: (patch: Partial<AccessConfig>) => void
  /** "Make public": refused while Block Public Access is on, as S3 refuses a public bucket policy. */
  tryPublic: (on: boolean) => void
  send: () => void
  /** Replace the settings and send requests straight away (used by Show me). */
  apply: (config: AccessConfig) => void
  reset: () => void
}

/** Settings plus the request run. `initial` must be a stable object (a module constant). */
export function useAccessGate(initial: AccessConfig): AccessGate {
  const [s, set] = useState({ config: initial, run: 0, live: false, publicBlocked: false })
  const update = useCallback(
    (patch: Partial<AccessConfig>) => set((p) => ({ ...p, config: { ...p.config, ...patch }, live: false, publicBlocked: false })),
    [],
  )
  const tryPublic = useCallback(
    (on: boolean) =>
      set((p) =>
        on && p.config.blockPublicAccess
          ? { ...p, publicBlocked: true }
          : { ...p, config: { ...p.config, publicRead: on }, live: false, publicBlocked: false },
      ),
    [],
  )
  const send = useCallback(() => set((p) => ({ ...p, run: p.run + 1, live: true })), [])
  const apply = useCallback((config: AccessConfig) => set((p) => ({ config, run: p.run + 1, live: true, publicBlocked: false })), [])
  const reset = useCallback(() => set((p) => ({ config: initial, run: p.run, live: false, publicBlocked: false })), [initial])
  return useMemo(() => ({ ...s, update, tryPublic, send, apply, reset }), [s, update, tryPublic, send, apply, reset])
}

/* ----------------------------------------------------------------- People */

const LANES: Record<string, { name: string; icon: LucideIcon; target: string; note?: string }> = {
  'role-menu': { name: 'Servers', icon: Server, target: 'menu/dosa.jpg' },
  'customer-own': { name: 'Customer #1042', icon: ShoppingBag, target: 'receipts/order-1042.pdf', note: 'with link' },
  'customer-other': { name: 'Customer #1042', icon: ShoppingBag, target: 'receipts/order-1043.pdf', note: 'same link' },
  'stranger-list': { name: 'Stranger', icon: ScanSearch, target: 'lists every file' },
  'bot-receipt': { name: 'Bot', icon: Bot, target: 'receipts/order-1042.pdf', note: 'no link' },
}

/** Short reasons shown where a request lands. */
export const REASON_LABEL: Record<Reason, string> = {
  'private-by-default': 'Private by default',
  'role-allows': 'Role allows it',
  'link-ok': 'Valid link',
  'link-expired': 'Link expired',
  'link-other-file': 'Link is for another file',
  'signer-cannot-read': 'Signer can’t read it',
  public: 'Public: anyone gets in',
  'bpa-blocks-public': 'Public access blocked',
  'explicit-deny': 'Explicit deny',
}

/** The objects drawn in the bucket. */
const OBJECTS = ['menu/dosa.jpg', 'receipts/order-1042.pdf', 'receipts/order-1043.pdf']

// Timings in seconds, as in Module 2's traffic gate. Each lane starts a little after the one above it.
const STAGGER = 0.3
const IN = 1.1 // request travels to the door (and through it, or back off it)
const HIT = 0.75 // share of IN at which the request reaches the door
const PAUSE = 0.15
const BACK = 0.8 // the file (or list) travels back to whoever asked
/** Pixels a request moves past the door (into the bucket) or bounces back off it. */
const OVERSHOOT = 36
/** When the last lane has finished. */
const ALL_DONE = (REQUESTS.length - 1) * STAGGER + IN + PAUSE + BACK

/* ------------------------------------------------------------------- View */

/**
 * The bucket as a locked door. Send requests flies five requests at it; each passes (and a file comes back)
 * or bounces, with its reason. Below, the learner changes the bucket's settings, the role's policy and the link.
 * A second Send requests button sits after the controls, so on a phone you can edit and test without scrolling up.
 */
export function RequestGate({ gate, onSend, sendNote }: { gate: AccessGate; onSend: () => void; sendNote?: ReactNode }) {
  const reduce = useReducedMotion() === true
  const { config: c, run, live } = gate
  const leaked = leaks(c, GATE_NOW)
  const stageRef = useRef<HTMLDivElement>(null)
  const sendFromBelow = () => {
    onSend()
    const box = stageRef.current?.getBoundingClientRect()
    // Only scroll when the stage is not already fully in view.
    if (box && (box.top < 0 || box.bottom > window.innerHeight))
      stageRef.current?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
  }

  const summary = live
    ? REQUESTS.map((r) => {
        const d = decide(r, c, GATE_NOW)
        return `${LANES[r.id].name}, ${LANES[r.id].target}: ${d.allowed ? 'got in' : 'bounced'}, ${REASON_LABEL[d.reason].toLowerCase()}.`
      }).join(' ') + ` Files leaked: ${leaked}.`
    : ''

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Button variant="primary" onClick={onSend}>
            <Send aria-hidden />
            Send requests
          </Button>
          <span aria-live="polite">{sendNote}</span>
        </div>
        <Readout
          label="Files leaked"
          tone={!live ? 'neutral' : leaked > 0 ? 'bad' : 'ok'}
          value={
            !live ? (
              '–'
            ) : reduce ? (
              leaked
            ) : (
              <motion.span key={run} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: ALL_DONE, duration: 0.2 }}>
                {leaked}
              </motion.span>
            )
          }
          className="text-right"
        />
      </div>

      {/* The stage: lanes on the left, the bucket on the right. Tracks end on the bucket's edge. */}
      <div ref={stageRef} className="mt-4 flex items-stretch">
        <ol className="grid min-w-0 flex-1 content-center gap-2 py-1" aria-label="Requests">
          {REQUESTS.map((r, i) => {
            const d = decide(r, c, GATE_NOW)
            return <Lane key={r.id} req={r} index={i} reason={d.reason} allowed={d.allowed} live={live} run={run} reduce={reduce} />
          })}
        </ol>
        <BucketDoor config={c} />
      </div>
      <p aria-live="polite" className="sr-only">
        {summary}
      </p>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded-[3px] border border-bad bg-bad-soft" />
          should stay out
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Lock aria-hidden className="size-3.5" />
          <span>
            Every new file is <Term k="encryption">encrypted</Term> at rest by default
          </span>
        </span>
      </p>
      {reduce && <p className="mt-2 text-xs text-ink-3">Moving dots are off because your device asks for reduced motion.</p>}

      <Controls gate={gate} />

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-4">
        <Button variant="primary" onClick={sendFromBelow}>
          <Send aria-hidden />
          Send requests
        </Button>
        {sendNote}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------- Lane */

function Lane({
  req,
  index,
  allowed,
  reason,
  live,
  run,
  reduce,
}: {
  req: Req
  index: number
  allowed: boolean
  reason: Reason
  live: boolean
  run: number
  reduce: boolean
}) {
  const lane = LANES[req.id]
  const Icon = lane.icon
  const threat = !wanted(req)
  const d = index * STAGGER
  const hitAt = d + IN * HIT
  const doneAt = allowed ? d + IN + PAUSE + BACK : d + IN
  const out = req.action === 'list' ? 'list' : 'file'
  const verb = req.action === 'list' ? 'list' : 'read'
  const tone = allowed !== wanted(req) ? 'bad' : reason === 'public' ? 'warn' : 'ok'

  return (
    <li className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 items-center gap-2 sm:w-56 sm:shrink-0">
        <span
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-[4px] border [&_svg]:size-4',
            threat ? 'border-bad bg-bad-soft text-bad' : 'border-line-strong bg-sunken text-ink-2',
          )}
        >
          <Icon aria-hidden />
        </span>
        <span className="min-w-0 text-xs leading-tight">
          <span className="block text-sm font-bold text-ink">
            {lane.name}
            {threat && <span className="sr-only"> (should stay out)</span>}
          </span>
          <span className="block text-ink-3 [overflow-wrap:anywhere]">
            {req.key ? <span className="font-mono">{lane.target}</span> : lane.target}
            {lane.note && ` · ${lane.note}`}
          </span>
        </span>
      </div>

      {/* The track. The request dot rides a rail that stops one dot-width short of the bucket. */}
      <div className="relative h-12 min-w-0 sm:flex-1">
        <div aria-hidden className="absolute inset-x-0 top-3.5 border-t-2 border-dashed border-line-strong" />
        <div aria-hidden className="absolute inset-y-0 left-0 right-11">
          {!live ? (
            <Dot left="0%">{verb}</Dot>
          ) : reduce ? (
            allowed ? (
              <Dot left="0%" back={threat ? 'bad' : 'ok'}>
                {out}
              </Dot>
            ) : (
              <Dot left="100%" x={-OVERSHOOT}>
                {verb}
              </Dot>
            )
          ) : (
            <>
              <motion.span
                key={`in-${run}`}
                className={dotClass()}
                initial={{ left: '0%', opacity: 1 }}
                animate={
                  allowed
                    ? { left: ['0%', '100%', '100%'], x: [0, 0, OVERSHOOT], opacity: [1, 1, 0] }
                    : { left: ['0%', '100%', '100%'], x: [0, 0, -OVERSHOOT], opacity: [1, 1, 1] }
                }
                transition={{ delay: d, duration: IN, times: [0, HIT, 1], ease: 'easeInOut' }}
              >
                {verb}
              </motion.span>
              {allowed && (
                <motion.span
                  key={`out-${run}`}
                  className={dotClass(threat ? 'bad' : 'ok')}
                  initial={{ left: '100%', opacity: 0 }}
                  animate={{ left: '0%', opacity: 1 }}
                  transition={{
                    left: { delay: d + IN + PAUSE, duration: BACK, ease: 'easeInOut' },
                    opacity: { delay: d + IN + PAUSE, duration: 0.01 },
                  }}
                >
                  {out}
                </motion.span>
              )}
            </>
          )}
        </div>
        {live && !allowed && (
          <Appear show={!reduce} delay={hitAt} runKey={run} className="absolute right-0 top-3.5 -translate-y-1/2 translate-x-1/2">
            <span aria-hidden className={cn('grid size-5 place-items-center rounded-full text-white [&_svg]:size-3.5', threat ? 'bg-ink-3' : 'bg-bad')}>
              <X />
            </span>
          </Appear>
        )}
        {live && (
          <Appear show={!reduce} delay={doneAt} runKey={run} className="absolute bottom-0 right-3 max-w-[calc(100%-0.75rem)]">
            <Pill tone={tone} className="max-w-full">
              {allowed ? <Check aria-hidden /> : <X aria-hidden />}
              <span className="truncate">{REASON_LABEL[reason]}</span>
            </Pill>
          </Appear>
        )}
      </div>
    </li>
  )
}

const dotClass = (back?: 'ok' | 'bad') =>
  cn(
    'absolute top-3.5 inline-flex h-5 w-11 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[11px] font-bold',
    back === 'ok' && 'border-ok bg-ok-soft text-ok',
    back === 'bad' && 'border-bad bg-bad-soft text-bad',
    !back && 'border-signal bg-signal-soft text-signal',
  )

function Dot({ left, x = 0, back, children }: { left: string; x?: number; back?: 'ok' | 'bad'; children: ReactNode }) {
  return (
    <span className={dotClass(back)} style={{ left, transform: x ? `translateX(${x}px)` : undefined }}>
      {children}
    </span>
  )
}

/** Fades its child in after `delay` seconds; with reduced motion it is simply there. */
function Appear({
  show,
  delay,
  runKey,
  className,
  children,
}: {
  show: boolean
  delay: number
  runKey: number
  className?: string
  children: ReactNode
}) {
  if (!show) return <span className={className}>{children}</span>
  return (
    <motion.span
      key={runKey}
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.2 }}
    >
      {children}
    </motion.span>
  )
}

/* ----------------------------------------------------------------- Bucket */

/** The bucket, drawn as a locked door in the storage colour, with a padlock on every file. */
function BucketDoor({ config: c }: { config: AccessConfig }) {
  const open = c.publicRead && !c.blockPublicAccess
  const Door = open ? DoorOpen : DoorClosed
  return (
    <div
      className="relative flex w-[6.5rem] shrink-0 flex-col items-center gap-1.5 rounded-[3px] border-2 px-1.5 pb-3 pt-9 text-center sm:w-44"
      style={{ borderColor: 'var(--color-storage)' }}
    >
      <div className="absolute -left-0.5 -top-0.5 flex max-w-[calc(100%+4px)] items-start">
        <span className="grid size-6 shrink-0 place-items-center" style={{ background: 'var(--color-storage)' }}>
          <Archive aria-hidden className="size-3.5 text-white" />
        </span>
        <span className="px-1.5 py-[3px] text-left text-xs font-bold leading-[18px] text-ink-2">
          <Term k="bucket">Bucket</Term>
        </span>
      </div>
      <span
        className="grid size-10 place-items-center rounded-[4px] text-white [&_svg]:size-5"
        style={{ background: open ? 'var(--color-bad)' : 'var(--color-storage)' }}
      >
        <Door aria-hidden />
      </span>
      <span className="max-w-full font-mono text-[11px] leading-tight text-ink [overflow-wrap:anywhere]">{BUCKET}</span>
      <span className={cn('text-xs font-bold leading-tight', open ? 'text-bad' : 'text-ink-2')}>{open ? 'Open to anyone' : 'Private'}</span>
      <Pill tone={c.blockPublicAccess ? 'ok' : 'warn'} className="max-w-full whitespace-normal text-center leading-tight [&_svg]:shrink-0">
        {c.blockPublicAccess ? <ShieldCheck aria-hidden /> : <ShieldOff aria-hidden />}
        {c.blockPublicAccess ? 'Public access blocked' : 'Public access not blocked'}
      </Pill>
      <ul className="mt-1 grid w-full gap-1 text-left" aria-label="Files in the bucket">
        {OBJECTS.map((key) => (
          <li key={key} className="flex min-w-0 items-start gap-1 font-mono text-[11px] leading-tight text-ink-2">
            <Lock aria-hidden className="mt-px size-3 shrink-0 text-ink-3" />
            <span className="min-w-0 break-all">
              {key}
              <span className="sr-only"> (encrypted)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* --------------------------------------------------------------- Controls */

function Group({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-line bg-paper p-3">
      <h4 className="text-sm font-bold text-ink-2">{title}</h4>
      <div className="mt-2 grid gap-2">{children}</div>
    </div>
  )
}

const hint = 'text-xs text-ink-3'

function Controls({ gate }: { gate: AccessGate }) {
  const { config: c, update } = gate
  return (
    <div className="mt-5 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
      <Group title={<Term k="block-public-access">Block Public Access</Term>}>
        <Switch label="Block all public access" checked={c.blockPublicAccess} onChange={(v) => update({ blockPublicAccess: v })} />
        <p className={hint}>On for every new bucket.</p>
      </Group>

      <Group title={<Term k="bucket-policy">Bucket policy</Term>}>
        <div>
          <Switch label="Make public" checked={c.publicRead} onChange={gate.tryPublic} />
          <p aria-live="polite" className={cn(hint, 'mt-1')}>
            {gate.publicBlocked ? (
              <Pill tone="bad" className="whitespace-normal">
                <X aria-hidden />
                <span>
                  Refused: <Term k="block-public-access">Block Public Access</Term> is on
                </span>
              </Pill>
            ) : c.publicRead && c.blockPublicAccess ? (
              <span className="font-bold text-warn">
                Ignored while <Term k="block-public-access">Block Public Access</Term> is on
              </span>
            ) : (
              'A policy that lets anyone read and list files'
            )}
          </p>
        </div>
        <div>
          <Switch label="Deny everyone receipts/" checked={c.denyReceipts} onChange={(v) => update({ denyReceipts: v })} />
          <p className={cn(hint, 'mt-1')}>
            An <Term k="explicit-deny">explicit deny</Term> beats any allow
          </p>
        </div>
      </Group>

      <Group
        title={
          <>
            Server <Term k="iam-role">role</Term>’s <Term k="identity-based-policy">IAM policy</Term>
          </>
        }
      >
        <Switch label="Read menu/" checked={c.roleRead.menu} onChange={(v) => update({ roleRead: { ...c.roleRead, menu: v } })} />
        <Switch label="Read receipts/" checked={c.roleRead.receipts} onChange={(v) => update({ roleRead: { ...c.roleRead, receipts: v } })} />
      </Group>

      <Group title={<Term k="presigned-url">Presigned link</Term>}>
        <Switch label="Make a link for order 1042" checked={c.link !== null} onChange={(v) => update({ link: v ? { ...RECEIPT_LINK } : null })} />
        <p className={hint}>
          <Term k="signer">Signer</Term>: the server role · lasts {RECEIPT_LINK.minutes} min
        </p>
      </Group>
    </div>
  )
}

/* -------------------------------------------------------------- Challenge */

/** "Right people only": fix a bucket someone opened to the public, then press Send requests to test it. */
export function RightPeopleChallenge() {
  const gate = useAccessGate(challengeStart)
  const challenge = useChallenge()
  const c = checks(gate.config, GATE_NOW)
  const ok = solved(gate.config, GATE_NOW)
  // Every check is ticked but the run that proves it hasn't happened yet.
  const ready = ok && !challenge.state.solved

  const send = () => {
    gate.send()
    if (ok) challenge.solve()
    else challenge.fail()
  }
  const showMe = () => {
    gate.apply(solution)
    challenge.show()
  }
  const reset = () => {
    gate.reset()
    challenge.reset()
  }

  return (
    <Bench
      title="Try it: fix a leaky bucket"
      intro={
        <>
          Someone left this <Term k="bucket">bucket</Term> open to the public; fix the access, then press Send requests to test it.
        </>
      }
      onReset={reset}
    >
      <Challenge
        goal="Right people only"
        checks={[
          {
            label: (
              <>
                The servers read <code>menu/</code> and <code>receipts/</code> through their <Term k="iam-role">role</Term>
              </>
            ),
            done: c.serversRead,
          },
          {
            label: (
              <>
                Customer #1042 gets their own receipt through a <Term k="presigned-url">link</Term>
              </>
            ),
            done: c.customerOwnReceipt,
          },
          { label: 'Nobody else reads or lists anything (0 files leaked)', done: c.nobodyElse },
          {
            label: (
              <>
                <Term k="block-public-access">Block Public Access</Term> is on and nothing is public
              </>
            ),
            done: c.privateBucket,
          },
        ]}
        state={challenge.state}
        stale={challenge.state.solved && !ok}
        staleReason={gate.live ? 'failing' : 'changed'}
        hint="Close the bucket to the public again, then give the customer a link signed by a role that can read receipts/."
        onHint={challenge.hint}
        onShowMe={showMe}
        successNote="Only the servers’ role and one signed link get in, so the bucket stays private and nothing leaks."
      />

      <div className="mt-5">
        <RequestGate
          gate={gate}
          onSend={send}
          sendNote={
            ready && (
              <Pill tone="ok">
                <Check aria-hidden />
                All set: press Send requests
              </Pill>
            )
          }
        />
      </div>
    </Bench>
  )
}
