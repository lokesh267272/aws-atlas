import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Bot, Laptop, Play, Plus, ScanSearch, Server, ShieldCheck, ShoppingBag, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button, Pill, Segmented, Switch } from '../../../../components/controls'
import { Term } from '../../../../components/Term'
import { cn } from '../../../../lib/cn'
import {
  addRule,
  inboundAllowed,
  OFFICE_IP,
  PORTS,
  portName,
  removeRule,
  REQUESTS,
  ruleMatches,
  sameRule,
  SOURCES,
  type Req,
  type Rule,
  type Source,
} from './accessModel'

/* ------------------------------------------------------------------ State */

export interface Gate {
  rules: Rule[]
  /** Counts presses of Start traffic; a new number replays the dots. */
  run: number
  /** True while the results on screen match the current rules (any edit clears them). */
  live: boolean
  /** The new group's default outbound rule (allow all) is in place. */
  outbound: boolean
  add: (rule: Rule) => void
  remove: (index: number) => void
  setOutbound: (on: boolean) => void
  start: () => void
  /** Replace the rules and send traffic straight away (used by Show me). */
  apply: (rules: Rule[]) => void
  reset: () => void
}

/** Rules plus the traffic run. `initial` must be a stable array (a module constant). */
export function useGate(initial: Rule[]): Gate {
  const [s, set] = useState({ rules: initial, run: 0, live: false, outbound: true })
  const add = useCallback(
    (rule: Rule) =>
      set((p) => {
        const rules = addRule(p.rules, rule)
        return rules === p.rules ? p : { ...p, rules, live: false }
      }),
    [],
  )
  const remove = useCallback((i: number) => set((p) => ({ ...p, rules: removeRule(p.rules, i), live: false })), [])
  const setOutbound = useCallback((outbound: boolean) => set((p) => ({ ...p, outbound, live: false })), [])
  const start = useCallback(() => set((p) => ({ ...p, run: p.run + 1, live: true })), [])
  const apply = useCallback((rules: Rule[]) => set((p) => ({ ...p, rules, run: p.run + 1, live: true })), [])
  const reset = useCallback(() => set((p) => ({ rules: initial, run: p.run, live: false, outbound: true })), [initial])
  return useMemo(() => ({ ...s, add, remove, setOutbound, start, apply, reset }), [s, add, remove, setOutbound, start, apply, reset])
}

/* ----------------------------------------------------------------- People */

const WHO: Record<string, { name: string; icon: LucideIcon }> = {
  customer: { name: 'Customer', icon: ShoppingBag },
  bot: { name: 'Bot', icon: Bot },
  owner: { name: 'You', icon: Laptop },
  prober: { name: 'Prober', icon: ScanSearch },
}

const protocol = (port: number): ReactNode =>
  port === 443 ? <Term k="https">HTTPS</Term> : port === 22 ? <Term k="ssh-protocol">SSH</Term> : portName(port)

// Timings in seconds. Each lane starts a little after the one above it.
const STAGGER = 0.35
const IN = 1.1 // request travels to the gate (and through it, or back off it)
const HIT = 0.75 // share of IN at which the request reaches the gate
const PAUSE = 0.15
const REPLY = 0.8
/** Pixels a request moves past the gate (into the ring) or bounces back off it. */
const OVERSHOOT = 36

/* ------------------------------------------------------------------- View */

/**
 * A server inside a security group. Start traffic sends four requests at it; each passes or bounces,
 * and allowed ones get a reply back out. Below, the learner adds and removes inbound rules.
 */
export function TrafficGate({
  gate,
  onStart,
  outboundToggle = false,
  serverBadge,
}: {
  gate: Gate
  onStart: () => void
  /** Free play: let the learner switch off the default outbound rule to test statefulness. */
  outboundToggle?: boolean
  /** Extra state drawn under the server, inside the ring. */
  serverBadge?: ReactNode
}) {
  const reduce = useReducedMotion() === true
  const { rules, run, live, outbound } = gate
  const anyIn = REQUESTS.some((r) => inboundAllowed(rules, r))

  const summary = live
    ? REQUESTS.map((r) => `${WHO[r.id].name}: ${inboundAllowed(rules, r) ? 'let in, reply sent back' : 'blocked'}.`).join(' ')
    : ''

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Button variant="primary" onClick={onStart}>
          <Play aria-hidden />
          Start traffic
        </Button>
        <p className="flex items-center gap-1.5 text-xs text-ink-3">
          <span aria-hidden className="size-3 rounded-[3px] border border-bad bg-bad-soft" />
          should stay out · each dot shows its <Term k="network-port">port</Term>
        </p>
      </div>

      {/* The stage: lanes on the left, the security group ring on the right. Tracks end on the ring's edge. */}
      <div className="mt-4 flex items-stretch">
        <ol className="grid min-w-0 flex-1 content-center gap-2 pb-1 pt-1 sm:pt-7" aria-label="Requests">
          {REQUESTS.map((r, i) => (
            <Lane key={r.id} req={r} index={i} allowed={inboundAllowed(rules, r)} live={live} run={run} reduce={reduce} />
          ))}
        </ol>
        <Ring count={rules.length}>{serverBadge}</Ring>
      </div>
      <p aria-live="polite" className="sr-only">
        {summary}
      </p>
      {reduce && <p className="mt-2 text-xs text-ink-3">Moving dots are off because your device asks for reduced motion.</p>}

      <RuleEditor gate={gate} />

      <div className="mt-4">
        <h4 className="text-sm font-bold text-ink-2">
          <Term k="sg-outbound-rule">Outbound rules</Term>
        </h4>
        {outbound ? (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink">
            <span>
              <b>All traffic</b> to Anywhere <span className="font-mono text-xs text-ink-3">{SOURCES.anywhere.cidr}</span>
            </span>
            <Pill>new group default</Pill>
          </p>
        ) : (
          <p className="mt-1.5 rounded-md border border-dashed border-line-strong px-3 py-2 text-sm text-ink-3">
            None.{' '}
            {!live ? (
              'Start traffic: do replies still get out?'
            ) : anyIn ? (
              <>
                Replies got out anyway: the group is <Term k="sg-stateful">stateful</Term>.
              </>
            ) : (
              'Nothing got in, so there was nothing to reply to. Add a rule first.'
            )}
          </p>
        )}
        {outboundToggle && (
          <Switch className="mt-2" label="Default outbound rule" checked={outbound} onChange={gate.setOutbound} />
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------- Lane */

function Lane({
  req,
  index,
  allowed,
  live,
  run,
  reduce,
}: {
  req: Req
  index: number
  allowed: boolean
  live: boolean
  run: number
  reduce: boolean
}) {
  const who = WHO[req.id]
  const Icon = who.icon
  const threat = !req.wanted
  const d = index * STAGGER
  const hitAt = d + IN * HIT
  const doneAt = allowed ? d + IN + PAUSE + REPLY : d + IN

  return (
    <li className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 items-center gap-2 sm:w-52 sm:shrink-0">
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
            {who.name}
            {threat && <span className="sr-only"> (should stay out)</span>}
          </span>
          <span className="block text-ink-3">
            {protocol(req.port)} {req.port} · {req.from === 'office' ? `office ${OFFICE_IP}` : 'internet'}
          </span>
        </span>
      </div>

      {/* The track. The request dot rides a rail that stops one dot-width short of the ring. */}
      <div className="relative h-12 min-w-0 sm:flex-1">
        <div aria-hidden className="absolute inset-x-0 top-3.5 border-t-2 border-dashed border-line-strong" />
        <div aria-hidden className="absolute inset-y-0 left-0 right-11">
          {!live ? (
            <Dot left="0%">{req.port}</Dot>
          ) : reduce ? (
            allowed ? (
              <Dot left="0%" reply>
                reply
              </Dot>
            ) : (
              <Dot left="100%" x={-OVERSHOOT}>
                {req.port}
              </Dot>
            )
          ) : (
            <>
              <motion.span
                key={`in-${run}`}
                className={dotClass(false)}
                initial={{ left: '0%', opacity: 1 }}
                animate={
                  allowed
                    ? { left: ['0%', '100%', '100%'], x: [0, 0, OVERSHOOT], opacity: [1, 1, 0] }
                    : { left: ['0%', '100%', '100%'], x: [0, 0, -OVERSHOOT], opacity: [1, 1, 1] }
                }
                transition={{ delay: d, duration: IN, times: [0, HIT, 1], ease: 'easeInOut' }}
              >
                {req.port}
              </motion.span>
              {allowed && (
                <motion.span
                  key={`out-${run}`}
                  className={dotClass(true)}
                  initial={{ left: '100%', opacity: 0 }}
                  animate={{ left: '0%', opacity: 1 }}
                  transition={{
                    left: { delay: d + IN + PAUSE, duration: REPLY, ease: 'easeInOut' },
                    opacity: { delay: d + IN + PAUSE, duration: 0.01 },
                  }}
                >
                  reply
                </motion.span>
              )}
            </>
          )}
        </div>
        {live && !allowed && (
          <Appear show={!reduce} delay={hitAt} runKey={run} className="absolute right-0 top-3.5 -translate-y-1/2 translate-x-1/2">
            <span aria-hidden className="grid size-5 place-items-center rounded-full bg-bad text-white [&_svg]:size-3.5">
              <X />
            </span>
          </Appear>
        )}
        {live && (
          <Appear show={!reduce} delay={doneAt} runKey={run} className="absolute bottom-0 right-3">
            <Pill tone={allowed ? 'ok' : 'bad'}>{allowed ? 'In, reply out' : 'Blocked'}</Pill>
          </Appear>
        )}
      </div>
    </li>
  )
}

const dotClass = (reply: boolean) =>
  cn(
    'absolute top-3.5 inline-flex h-5 w-11 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[10px] font-bold tabular-nums',
    reply ? 'border-ok bg-ok-soft text-ok' : 'border-signal bg-signal-soft text-signal',
  )

function Dot({ left, x = 0, reply = false, children }: { left: string; x?: number; reply?: boolean; children: ReactNode }) {
  return (
    <span className={dotClass(reply)} style={{ left, transform: x ? `translateX(${x}px)` : undefined }}>
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

/* ------------------------------------------------------------------- Ring */

/** The security group, drawn as AWS diagrams draw it: a red dashed box around the instance. */
function Ring({ count, children }: { count: number; children?: ReactNode }) {
  return (
    <div
      className="relative flex w-[5.75rem] shrink-0 flex-col items-center justify-center gap-2 rounded-[3px] border-2 border-dashed px-1.5 pb-3 pt-12 text-center sm:w-40 sm:pt-9"
      style={{ borderColor: 'var(--color-security)' }}
    >
      <div className="absolute -left-0.5 -top-0.5 flex max-w-[calc(100%+4px)] items-start">
        <span className="grid size-6 shrink-0 place-items-center" style={{ background: 'var(--color-security)' }}>
          <ShieldCheck aria-hidden className="size-3.5 text-white" />
        </span>
        <span className="px-1.5 py-[3px] text-left text-xs font-bold leading-[18px] text-ink-2">
          <Term k="security-group">Security group</Term>
        </span>
      </div>
      <span
        className="grid size-10 place-items-center rounded-[4px] text-white [&_svg]:size-5"
        style={{ background: 'var(--color-compute)' }}
      >
        <Server aria-hidden />
      </span>
      <span className="text-xs font-bold leading-tight text-ink">
        <Term k="instance">Server</Term>
      </span>
      <span className="text-xs leading-tight text-ink-3">
        {count} inbound {count === 1 ? 'rule' : 'rules'}
      </span>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------ Rule editor */

type PortValue = `${number}`

function RuleEditor({ gate }: { gate: Gate }) {
  const [port, setPort] = useState<PortValue>('443')
  const [source, setSource] = useState<Source>('anywhere')
  const listRef = useRef<HTMLHeadingElement>(null)
  const draft: Rule = { port: Number(port), source }
  const duplicate = gate.rules.some((r) => sameRule(r, draft))

  return (
    <div className="mt-5 grid gap-4 border-t border-line pt-4 md:grid-cols-2">
      <div className="min-w-0">
        <h4 className="text-sm font-bold text-ink-2">
          Add an <Term k="sg-inbound-rule">inbound rule</Term>
        </h4>
        <p className="text-xs text-ink-3">Rules can only allow. No matching rule, no entry.</p>
        <div className="mt-2 grid gap-3">
          <Segmented<PortValue>
            label="Port"
            size="sm"
            value={port}
            onChange={setPort}
            options={PORTS.map((p) => ({ value: `${p.port}` as PortValue, label: `${p.name} ${p.port}` }))}
          />
          <div className="min-w-0">
            <Segmented<Source>
              label="Source"
              size="sm"
              value={source}
              onChange={setSource}
              options={(['anywhere', 'office'] as const).map((s) => ({
                value: s,
                label: (
                  <>
                    {SOURCES[s].label}
                    <span className="font-mono text-xs font-normal">{SOURCES[s].cidr}</span>
                  </>
                ),
              }))}
            />
            <p className="mt-1 text-xs text-ink-3">
              <Term k="cidr-block">/32</Term> is one address, /0 is every address
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => !duplicate && gate.add(draft)}
              aria-disabled={duplicate}
              className="aria-disabled:cursor-not-allowed"
            >
              <Plus aria-hidden />
              Add rule
            </Button>
            <span aria-live="polite" className="text-xs text-ink-3">
              {duplicate ? 'Already in the list' : ''}
            </span>
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <h4 ref={listRef} tabIndex={-1} className="text-sm font-bold text-ink-2 outline-none">
          <Term k="sg-inbound-rule">Inbound rules</Term>
        </h4>
        {gate.rules.length === 0 ? (
          <p className="mt-1.5 rounded-md border border-dashed border-line-strong px-3 py-2 text-sm text-ink-3">
            None, so nothing can get in
          </p>
        ) : (
          <ul className="mt-1.5 grid gap-1.5">
            {gate.rules.map((rule, i) => {
              const name = `${portName(rule.port)} ${rule.port} from ${SOURCES[rule.source].label}`
              const letIn = REQUESTS.filter((r) => ruleMatches(rule, r))
              return (
                <li
                  key={`${rule.port}-${rule.source}`}
                  className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-md border border-line bg-paper py-1.5 pl-3 pr-1.5"
                >
                  <span className="min-w-0 text-sm text-ink">
                    <b>
                      {portName(rule.port)} {rule.port}
                    </b>{' '}
                    from {SOURCES[rule.source].label}{' '}
                    <span className="font-mono text-xs text-ink-3">{SOURCES[rule.source].cidr}</span>
                    {gate.live && (
                      <span className="block text-xs text-ink-3">
                        Let in:{' '}
                        {letIn.length === 0
                          ? 'nobody'
                          : letIn.map((r, j) => (
                              <span key={r.id} className={cn(!r.wanted && 'font-bold text-bad')}>
                                {j > 0 && ', '}
                                {WHO[r.id].name}
                              </span>
                            ))}
                      </span>
                    )}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove rule: ${name}`}
                    onClick={() => {
                      gate.remove(i)
                      listRef.current?.focus()
                    }}
                  >
                    <X aria-hidden />
                    Remove
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
