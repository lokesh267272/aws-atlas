import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { Pause, Play } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Button, Segmented, Slider } from '../../../../components/controls'
import { cn } from '../../../../lib/cn'
import { CapacityChart, CapacityLegend } from './CapacityChart'
import { MIN_RENDER_W, labelSizeFor, playheadFraction } from './chartGeometry'
import {
  CLOUD_PRICE_PER_SERVER_DAY,
  DAYS,
  SERVER_PRICE,
  UPKEEP_PER_SERVER_YEAR,
  VISITORS_PER_SERVER,
  buildDemand,
  cloudServers,
  dayLabel,
  planTotals,
  summaryAt,
  type PlanMode,
} from './capacityModel'

const PLAY_MS = 7000
const LAST_DAY = DAYS - 1
const DEFAULT_SERVERS = 8

const num = (n: number) => n.toLocaleString('en-US')
const money = (n: number) => `$${num(n)}`

type Tone = 'neutral' | 'ok' | 'bad' | 'warn'
const toneClass: Record<Tone, string> = { neutral: 'text-ink', ok: 'text-ok', bad: 'text-bad', warn: 'text-warn' }

/**
 * A number in the simulation. Like the kit's Readout, but without its own
 * aria-live, because these change every frame while the year plays.
 * One summary sentence below is announced instead.
 */
function Stat({ label, value, hint, tone = 'neutral' }: { label: string; value: string; hint: string; tone?: Tone }) {
  return (
    <div className="min-w-0 rounded-md border border-line bg-paper/60 px-3 py-2.5">
      <div className="text-sm text-ink-3">{label}</div>
      <div className={cn('display text-lg tabular-nums sm:text-xl', toneClass[tone])}>{value}</div>
      <div className="text-xs text-ink-3">{hint}</div>
    </div>
  )
}

export function CapacitySim() {
  const reduce = useReducedMotion()
  const [mode, setMode] = useState<PlanMode>('buy')
  const [bought, setBought] = useState(DEFAULT_SERVERS)
  const [day, setDay] = useState(LAST_DAY)
  const [playing, setPlaying] = useState(false)
  const frame = useRef<number | undefined>(undefined)
  const chartBox = useRef<HTMLDivElement>(null)
  const [boxWidth, setBoxWidth] = useState(0)

  const demand = useMemo(() => buildDemand(), [])
  const rented = useMemo(() => cloudServers(demand), [demand])
  const ranges = useMemo(
    () => ({ peakDemand: Math.max(...demand), minRented: Math.min(...rented), maxRented: Math.max(...rented) }),
    [demand, rented],
  )
  const totals = useMemo(() => planTotals(demand, mode, bought, rented), [demand, mode, bought, rented])
  const s = summaryAt(totals, day)

  const stop = useCallback(() => {
    if (frame.current !== undefined) cancelAnimationFrame(frame.current)
    frame.current = undefined
    setPlaying(false)
  }, [])

  const play = useCallback(() => {
    if (frame.current !== undefined) cancelAnimationFrame(frame.current)
    // Start from the beginning, or carry on from where the learner paused.
    const startDay = day >= LAST_DAY ? 0 : day
    const startTime = performance.now() - (startDay / LAST_DAY) * PLAY_MS
    setDay(startDay)
    setPlaying(true)
    const tick = (now: number) => {
      const d = Math.min(LAST_DAY, Math.floor(((now - startTime) / PLAY_MS) * LAST_DAY))
      setDay(d)
      if (d < LAST_DAY) {
        frame.current = requestAnimationFrame(tick)
      } else {
        frame.current = undefined
        setPlaying(false)
      }
    }
    frame.current = requestAnimationFrame(tick)
  }, [day])

  // Never leave an animation frame running after the lesson closes.
  useEffect(() => () => {
    if (frame.current !== undefined) cancelAnimationFrame(frame.current)
  }, [])

  // Measure the chart box, so labels can grow when the chart is drawn small and we know when it scrolls.
  useLayoutEffect(() => {
    const el = chartBox.current
    if (!el) return
    const measure = () => setBoxWidth(el.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // On narrow screens the chart scrolls sideways: keep the playhead in view. For the whole year
  // the playhead is 31 Dec, so the chart opens on the holiday spike instead of January.
  const keepPlayheadInView = useCallback((d: number, force = false) => {
    const el = chartBox.current
    if (!el || el.scrollWidth <= el.clientWidth) return
    const px = playheadFraction(d) * el.scrollWidth
    if (force || px < el.scrollLeft + 24 || px > el.scrollLeft + el.clientWidth - 24) {
      el.scrollLeft = px - el.clientWidth / 2
    }
  }, [])
  useLayoutEffect(() => {
    keepPlayheadInView(day)
  }, [day, keepPlayheadInView])

  // If the learner switches on reduced motion mid-play, stop and show the whole year.
  useEffect(() => {
    if (reduce && playing) {
      stop()
      setDay(LAST_DAY)
    }
  }, [reduce, playing, stop])

  const reset = () => {
    stop()
    setMode('buy')
    setBought(DEFAULT_SERVERS)
    setDay(LAST_DAY)
    keepPlayheadInView(LAST_DAY, true)
  }

  const wholeYear = day >= LAST_DAY
  const chartScrolls = boxWidth > 0 && boxWidth < MIN_RENDER_W
  const period = day === 0 ? 'on 1 Jan' : wholeYear ? 'this year' : `1 Jan to ${dayLabel(day)}`

  let insight: string
  if (mode === 'cloud') {
    insight = `Capacity rose for each rush and fell after it, from ${ranges.minRented} up to ${ranges.maxRented} servers. You stopped paying for the extra servers as soon as each rush ended. The ${s.idlePct}% idle is mostly the 20% spare room you kept for safety. A few visitors were turned away on the first day of each rush, before the extra servers arrived.`
  } else if (s.lost > 0 && s.idlePct >= 40) {
    insight = `You paid for idle servers most of the time and still turned visitors away at the busiest moments. That is the cost of guessing capacity.`
  } else if (s.lost === 0) {
    insight = `Nobody was turned away, but ${s.idlePct}% of the capacity you paid for sat idle. You bought for the busiest days and paid for that all year.`
  } else if (s.idlePct < 10) {
    insight = `Little capacity was wasted, but ${num(s.lost)} visitors were turned away when the site was too busy.`
  } else {
    insight = `${s.idlePct}% of the capacity you paid for sat idle, and ${num(s.lost)} visitors were still turned away when the site was too busy.`
  }

  const liveSummary = playing
    ? ''
    : `${mode === 'buy' ? `${bought} server${bought === 1 ? '' : 's'} bought` : 'Renting from the cloud'}, ${period}: ${money(
        s.upfront,
      )} up front, ${money(s.ongoing)} ongoing, ${s.idlePct}% idle, ${num(s.lost)} visitors turned away. ${
        wholeYear ? insight : ''
      }`

  // Announce the summary only once the learner stops moving a slider, not on every step.
  const [announced, setAnnounced] = useState(liveSummary)
  useEffect(() => {
    const t = window.setTimeout(() => setAnnounced(liveSummary), 600)
    return () => window.clearTimeout(t)
  }, [liveSummary])

  return (
    <Bench
      title="Try it: plan your shop's capacity"
      intro={
        <>
          {reduce
            ? 'Buy servers or rent them, then drag the date slider through the year.'
            : 'Buy servers or rent them, then play the year.'}{' '}
          Hatched areas are money spent on idle servers; solid red areas are customers turned away.
        </>
      }
      onReset={reset}
    >
      <div className="grid gap-5 md:grid-cols-[auto_minmax(0,1fr)] md:items-end">
        <Segmented<PlanMode>
          label="How you get servers"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'buy', label: 'Buy your own servers' },
            { value: 'cloud', label: 'Rent from the cloud' },
          ]}
        />
        {mode === 'buy' ? (
          <Slider
            label="Servers you buy"
            value={bought}
            min={1}
            max={24}
            onChange={setBought}
            format={(v) => `${v} server${v === 1 ? '' : 's'} (${num(v * VISITORS_PER_SERVER)} visitors a day)`}
          />
        ) : (
          <p className="rounded-md bg-sunken px-3 py-2 text-sm text-ink-2">
            Nothing to buy. Each day you rent enough servers for yesterday’s visitors plus 20% spare, and stop paying for
            the rest.
          </p>
        )}
      </div>

      <div className="mt-5">
        <CapacityLegend />
        <div
          role="img"
          aria-label={`Chart of visitors per day across one year. Normal days have about 3,000 to 4,000 visitors, with spikes near Valentine’s Day and Mother’s Day and a peak of about ${num(ranges.peakDemand)} visitors just before 25 December. ${
            mode === 'buy'
              ? `Your capacity is a flat line at ${num(bought * VISITORS_PER_SERVER)} visitors a day.`
              : `Your capacity steps up and down with demand, between ${ranges.minRented} and ${ranges.maxRented} servers.`
          }`}
          ref={chartBox}
          tabIndex={0}
          className="mt-3 overflow-x-auto rounded-md border border-line bg-panel"
        >
          <CapacityChart
            demand={demand}
            servers={totals.servers}
            mode={mode}
            day={day}
            labelSize={labelSizeFor(boxWidth)}
            scrolls={chartScrolls}
          />
        </div>
        {chartScrolls && (
          <p className="mt-1.5 text-xs text-ink-3">Scroll the chart sideways to see the whole year.</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-3">
        {!reduce && (
          <Button variant="primary" onClick={playing ? stop : play} className="min-w-28">
            {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
            {playing ? 'Pause' : wholeYear ? 'Play' : 'Play from here'}
          </Button>
        )}
        <Slider
          className="min-w-[14rem] flex-1"
          label="Show the year up to"
          value={day}
          min={0}
          max={LAST_DAY}
          onChange={(v) => {
            stop()
            setDay(v)
          }}
          format={(v) => (v >= LAST_DAY ? '31 Dec (whole year)' : dayLabel(v))}
        />
      </div>

      <div className="mt-5">
        <p className="text-sm font-bold text-ink-2">Results, {period}</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <Stat
            label="Paid up front"
            value={money(s.upfront)}
            hint={mode === 'buy' ? `Buying ${bought} × ${money(SERVER_PRICE)}` : 'Nothing to buy'}
          />
          <Stat
            label="Ongoing costs"
            value={money(s.ongoing)}
            hint={
              mode === 'buy'
                ? `Upkeep: ${money(UPKEEP_PER_SERVER_YEAR)} per server a year`
                : `Rent: ${money(CLOUD_PRICE_PER_SERVER_DAY)} per server per day`
            }
          />
          <Stat label="Total spent" value={money(s.total)} hint="Up front plus ongoing" />
          <Stat
            label="Idle capacity"
            value={`${s.idlePct}%`}
            hint="Paid for but not used"
            tone={s.idlePct >= 50 ? 'warn' : 'neutral'}
          />
          <Stat
            label="Visitors turned away"
            value={num(s.lost)}
            hint="The site was too busy"
            tone={s.lost > 10000 ? 'bad' : s.lost === 0 ? 'ok' : 'neutral'}
          />
        </div>
        {wholeYear && <p className="mt-3 max-w-[72ch] text-ink-2">{insight}</p>}
        <p className="sr-only" aria-live="polite">
          {announced}
        </p>
      </div>

      <p className="mt-4 border-t border-line pt-3 text-xs text-ink-3">
        Illustrative numbers, not real prices. Simplified: we charge the full price of bought servers in year one, but
        real servers last several years. Real auto scaling reacts within minutes, not a day; we exaggerate the delay so
        you can see it. We also bill rented servers by the whole day to keep the maths simple; real EC2 servers are
        billed by the second or by the hour. AWS also offers lower prices if you commit to steady use.
      </p>
    </Bench>
  )
}
