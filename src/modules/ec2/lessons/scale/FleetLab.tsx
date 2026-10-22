import { useMemo, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { Tag } from 'lucide-react'
import { Pill, Readout } from '../../../../components/controls'
import { Bench } from '../../../../components/lesson'
import { Term } from '../../../../components/Term'
import { DayStrip } from './DayStrip'
import { EventButtons, FleetControls, withLimits, type Knobs } from './FleetControls'
import { RegionView, screenTerms, statusLine } from './RegionView'
import { DAY_TICKS, RUSH, simulateDay, solution, type FleetConfig, type FleetEvent } from './scaleModel'
import { useDayPlayer } from './useDayPlayer'

/** Free play starts from a healthy fleet: three AZs, orders in the database. */
const START: FleetConfig = solution

/** Steps to keep playing after an event so its effect settles. */
const SETTLE: Record<FleetEvent['kind'], number> = {
  rush: RUSH.length + 1,
  'instance-crash': 2,
  'az-down': 3,
  'spot-interruption': 2,
}

const money = (n: number) => `$${n.toFixed(2)}`

/** Visual A: a live fleet across three AZs. The learner triggers events and watches Auto Scaling and the load balancer react. */
export function FleetLab() {
  const reduced = useReducedMotion() ?? false
  const [cfg, setCfg] = useState<FleetConfig>(START)
  const [events, setEvents] = useState<FleetEvent[]>([])
  const player = useDayPlayer(reduced)

  const day = useMemo(() => simulateDay(cfg, events), [cfg, events])
  const at = Math.min(player.tick, DAY_TICKS - 1)
  const tick = day.ticks[at]
  const dayOver = at >= DAY_TICKS - 1 && !player.playing
  const sofar = day.ticks.slice(0, at + 1)
  const turnedAway = sofar.reduce((n, t) => n + t.turnedAway, 0)
  const cost = sofar.reduce((n, t) => n + t.cost, 0)
  const started = events.length > 0

  const trigger = (kind: FleetEvent['kind']) => {
    // After the day ends, an event starts a new day.
    const fresh = dayOver
    const when = fresh ? 0 : at
    const next = [...(fresh ? [] : events), { at: when, kind }]
    setEvents(next)
    const to = Math.min(DAY_TICKS - 1, when + SETTLE[kind])
    if (player.playing) player.extend(to)
    else player.play(when, to)
  }

  const change = (next: Partial<Knobs>) => setCfg((c) => withLimits(c, next))

  const reset = () => {
    setCfg(START)
    setEvents([])
    player.jump(0)
  }

  const status = !started
    ? `A quiet morning: ${tick.inService} servers take every order. Make something happen.`
    : dayOver
      ? `Day over: ${turnedAway} customers turned away. Press an event to start a new day.`
      : statusLine(day.ticks, at, cfg)

  return (
    <Bench
      tone="screen"
      title="Try it: break it and watch it heal"
      intro={
        <>
          Trigger an event below and watch <Term k="auto-scaling">Auto Scaling</Term> add or replace servers while the{' '}
          <Term k="application-load-balancer">load balancer</Term> routes around trouble.
        </>
      }
      onReset={reset}
      className={screenTerms}
    >
      <RegionView tick={tick} cfg={cfg} playing={player.playing} reduced={reduced} />

      <div className="mt-3">
        {/* Once the day is over, any event starts a new day, so every button works again. */}
        <EventButtons
          onEvent={trigger}
          canCrash={dayOver || tick.inService > 0}
          canAzDown={dayOver || !tick.azDown.some(Boolean)}
        />
      </div>

      <p aria-live="polite" className="mt-3 min-h-[3em] text-screen-text sm:min-h-[1.5em]">
        {status}
      </p>

      <div className="mt-3 grid gap-5 rounded-md bg-panel p-3 text-ink sm:p-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Readout
            label={<Term k="desired-capacity">Desired servers</Term>}
            value={tick.desired}
            hint={`min ${cfg.min} · max ${cfg.max}`}
          />
          <Readout
            label={<Term k="cpu-utilization">Average CPU</Term>}
            value={`${tick.cpu}%`}
            hint={`target ${cfg.targetCpu}%`}
            tone={tick.cpu > 90 ? 'bad' : 'neutral'}
          />
          <Readout label="Turned away today" value={turnedAway} tone={turnedAway > 0 ? 'bad' : 'neutral'} />
          <Readout
            label="Cost so far"
            value={money(cost)}
            hint={
              <Pill className="mt-0.5">
                <Tag aria-hidden />
                Example prices
              </Pill>
            }
          />
        </div>

        <DayStrip ticks={day.ticks} events={events} at={at} revealed={started ? at : -1} playing={player.playing} />

        <FleetControls cfg={cfg} onChange={change} />
      </div>
    </Bench>
  )
}
