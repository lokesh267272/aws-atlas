import { useEffect, useId, useMemo, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import { Check, CloudOff, Info, Pause, Play, ServerCrash, Wrench, X, ZapOff } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Button, Readout, Segmented } from '../../../../components/controls'
import { cn } from '../../../../lib/cn'
import { ResilienceDiagram, type DiagramState } from './ResilienceDiagram'
import { PRIMARY, STANDBY, archInfo } from './messages'
import { WINDOW, hasLoadBalancer, successRate, type Arch, type Pending, type Sim } from './resilienceSim'
import { useResilienceSim } from './useResilienceSim'

const archOptions: { value: Arch; label: string; description: string }[] = [
  { value: 'single', label: archInfo.single.label, description: archInfo.single.long },
  { value: 'multi-az', label: archInfo['multi-az'].label, description: archInfo['multi-az'].long },
  { value: 'multi-region', label: archInfo['multi-region'].label, description: archInfo['multi-region'].long },
]

export function BreakTheDataCenter() {
  const reduced = useReducedMotion() === true
  const { sim, arch, setArch, playing, setPlaying, message, trigger, reset } = useResilienceSim('single', reduced)

  // Read the values the static diagram needs as primitives, so it only re-renders when they change.
  const { crashed, azDown, regionDown, lbOut, lbPending, dnsTarget, dnsPending } = sim
  const lbOutA = lbOut.a
  const lbOutB = lbOut.b
  const lbCheckingA = lbPending.a !== null && !lbOut.a
  const dnsChecking = dnsPending !== null
  const diagramState = useMemo<DiagramState>(
    () => ({ arch, crashed, azDown, regionDown, lbOutA, lbOutB, lbCheckingA, dnsTarget, dnsChecking }),
    [arch, crashed, azDown, regionDown, lbOutA, lbOutB, lbCheckingA, dnsTarget, dnsChecking],
  )

  // Pause the requests when the bench scrolls out of view, so nothing keeps running unseen.
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = rootRef.current
    if (!playing || !el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => {
      if (entry && !entry.isIntersecting) setPlaying(false)
    })
    io.observe(el)
    return () => io.disconnect()
  }, [playing, setPlaying])

  const incidentLabelId = useId()
  const rate = successRate(sim)
  const rateTone = rate === null ? 'neutral' : rate >= 95 ? 'ok' : rate >= 60 ? 'warn' : 'bad'
  const rateText = { neutral: 'text-ink', ok: 'text-ok', warn: 'text-warn', bad: 'text-bad' }[rateTone]
  const info = archInfo[arch]

  return (
    <Bench
      title="Try it: break the data center"
      intro="Pick a design and press Play to send user requests. Then cause an incident. Watch which requests fail, how long recovery takes, and what each design costs."
      onReset={reset}
    >
      <div ref={rootRef}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <Segmented label="Design" value={arch} options={archOptions} onChange={setArch} />
            <p className="mt-1.5 max-w-[60ch] text-sm text-ink-3">{info.long}</p>
          </div>
          <Button variant="primary" onClick={() => setPlaying(!playing)}>
            {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
            {playing ? 'Pause requests' : 'Play requests'}
          </Button>
        </div>

        <div className="mt-5">
          <p className="mb-1.5 text-sm font-bold text-ink-2" id={incidentLabelId}>
            Cause an incident
          </p>
          <div role="group" aria-labelledby={incidentLabelId} className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => trigger('crash')}>
              <ServerCrash aria-hidden />
              Server A crashes
            </Button>
            <Button size="sm" onClick={() => trigger('az')}>
              <ZapOff aria-hidden />
              Power cut in AZ a
            </Button>
            <Button size="sm" onClick={() => trigger('region')}>
              <CloudOff aria-hidden />
              {arch === 'multi-region' ? 'Primary Region has a problem' : 'Whole Region has a problem'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => trigger('repair')}>
              <Wrench aria-hidden />
              Repair everything
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2.5 rounded-md border border-line bg-paper px-3.5 py-3" aria-live="polite">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-signal" />
          <p className="text-ink-2">
            {message || (playing ? 'Requests are flowing. Now break something.' : 'Press Play requests, then break something.')}
          </p>
        </div>

        {/* The diagram comes straight after the buttons and the message, so on phones a button and its effect fit on screen together. */}
        <div className="mt-5">
          {arch === 'multi-region' && (
            <p className="mb-2 text-xs text-ink-3 md:hidden">This diagram is wide. Scroll it sideways to see the standby Region.</p>
          )}
          <ResilienceDiagram state={diagramState} requests={sim.inflight} t={sim.t} animate={!reduced} />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-[repeat(3,minmax(0,1fr))]">
          {/* Not a live region: it changes with almost every request and would drown out the message above. */}
          <div className="min-w-0">
            <div className="text-sm text-ink-3">Success rate (last {WINDOW} requests)</div>
            <div className={cn('display text-xl tabular-nums', rateText)}>{rate === null ? '–' : `${rate}%`}</div>
            {rate === null && <div className="text-xs text-ink-3">No requests yet</div>}
          </div>
          <div className="min-w-0">
            <div className="text-sm text-ink-3">All requests so far</div>
            <div className="display text-xl tabular-nums text-ink">
              <span className="text-ok">{sim.answered}</span> answered, <span className="text-bad">{sim.failed}</span> failed
            </div>
          </div>
          <Readout label="Running cost compared with one server" value={info.cost} hint={info.costHint} />
        </div>

        <RecentStrip recent={sim.recent} />

        <TrafficDirectors sim={sim} />

        <p className="mt-4 text-xs text-ink-3">
          Simplified: timings are shortened so you can watch them. Real load balancer health checks run every 30 seconds by
          default, need 2 failures in a row to take a server out of service and 5 passes in a row before a repaired server
          gets requests again. Route 53 checks every 30 seconds by default and needs 3 failures, and saved DNS answers last
          until their TTL runs out. Requests are drawn passing through Route 53, but a browser really asks
          Route 53 for an address first and then connects to the load balancer. Networks and databases are left out. Cost
          counts only servers and helpers, roughly.
          {reduced && ' Moving dots are turned off because your device asks for reduced motion.'}
        </p>
      </div>
    </Bench>
  )
}

/* ------------------------------------------------------------------ Parts */

function RecentStrip({ recent }: { recent: boolean[] }) {
  const slots = Array.from({ length: WINDOW }, (_, i) => recent[i - (WINDOW - recent.length)])
  const ok = recent.filter(Boolean).length
  return (
    <div className="mt-3">
      <p className="sr-only">
        Last {recent.length} requests: {ok} answered, {recent.length - ok} failed.
      </p>
      <div aria-hidden className="flex flex-wrap gap-1">
        {slots.map((r, i) => (
          <span
            key={i}
            className={cn(
              'grid size-5 place-items-center rounded-[3px] border [&_svg]:size-3.5',
              r === undefined && 'border-dashed border-line bg-panel',
              r === true && 'border-ok bg-ok-soft text-ok',
              r === false && 'border-bad bg-bad-soft text-bad',
            )}
          >
            {r === true && <Check />}
            {r === false && <X />}
          </span>
        ))}
      </div>
      <p aria-hidden className="mt-1 text-xs text-ink-3">
        Last {WINDOW} requests, newest on the right
      </p>
    </div>
  )
}

function Countdown({ t, pending }: { t: number; pending: Pending }) {
  const total = pending.at - pending.start
  const frac = Math.min(1, Math.max(0, (t - pending.start) / total))
  const left = Math.max(0, Math.ceil(pending.at - t))
  return (
    <span className="mt-1.5 flex items-center gap-2">
      <span aria-hidden className="h-1.5 w-28 overflow-hidden rounded-full bg-sunken">
        <span className="block h-full rounded-full bg-warn" style={{ width: `${frac * 100}%` }} />
      </span>
      <span className="text-xs text-ink-3">about {left} s left (simplified)</span>
    </span>
  )
}

function TrafficDirectors({ sim }: { sim: Sim }) {
  const rows: { who: string; text: string; pending: Pending | null }[] = []
  // Only the primary Region's load balancer matters here; name it so it is not confused with the standby one.
  const lbName = sim.arch === 'multi-region' ? 'Primary load balancer' : 'Load balancer'

  if (!hasLoadBalancer(sim.arch)) {
    rows.push({
      who: 'No traffic director',
      text: 'Users connect straight to Server A. If it stops, nothing can send them anywhere else.',
      pending: null,
    })
  } else if (sim.regionDown) {
    rows.push({ who: lbName, text: 'Not working: it lives in the Region that is down.', pending: null })
  } else {
    const p = sim.lbPending.a
    let text = 'Sharing requests between Server A and Server B.'
    if (p && !sim.lbOut.a)
      text = 'Server A is failing health checks, but it must fail a set number of checks in a row first, so it still gets some requests.'
    else if (p && sim.lbOut.a) text = 'Server A passes health checks again. Waiting for enough passes before sending it requests.'
    else if (sim.lbOut.a) text = 'Server A is out of service. Every request goes to Server B.'
    rows.push({ who: lbName, text, pending: p })
  }

  if (sim.arch === 'multi-region') {
    const p = sim.dnsPending
    let text = `Answering with ${PRIMARY.region} (primary).`
    if (p && sim.dnsTarget === 'primary') text = `The primary Region is failing health checks. Still answering with ${PRIMARY.region} until failover.`
    else if (p) text = `The primary Region passes health checks again. Switching back to ${PRIMARY.region} soon.`
    else if (sim.dnsTarget === 'standby') text = `Answering with ${STANDBY.region} (standby), so users go there.`
    rows.push({ who: 'Route 53', text, pending: p })
  }

  return (
    <div className="mt-5 rounded-md border border-line">
      <h4 className="border-b border-line px-3.5 py-2 text-sm font-bold text-ink">What the traffic directors believe</h4>
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.who} className="px-3.5 py-2.5 text-sm">
            <span className="font-bold text-ink">{r.who}: </span>
            <span className="text-ink-2">{r.text}</span>
            {r.pending && <Countdown t={sim.t} pending={r.pending} />}
          </li>
        ))}
      </ul>
    </div>
  )
}
