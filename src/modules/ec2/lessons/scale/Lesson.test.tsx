import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { checkTextBudget } from '../../../../test/textBudget'
import { BuildItAll } from './BuildItAll'
import { FleetLab } from './FleetLab'
import Lesson from './Lesson'
import { RegionFallback } from './RegionFallback'
import { describeRegion, EVENT_STEPS, recentRemoved, statusLine } from './RegionView'
import { DAY_EVENTS, eventsFor, simulateDay, solution, SPOT_EVENT, startConfig, type FleetConfig, type FleetEvent } from './scaleModel'

describe('scale lesson', () => {
  it('renders the Build it all goal and the Run the day button without WebGL', () => {
    const html = renderToStaticMarkup(<Lesson />)
    expect(html).toMatch(/Build it all/)
    expect(html).toMatch(/through a lunch rush and an/)
    expect(html).toMatch(/>Run the day</)
  })

  it('stays within the text budget', () => {
    expect(checkTextBudget(renderToStaticMarkup(<Lesson />))).toEqual([])
  })

  it('offers every build choice as a keyboard control', () => {
    const html = renderToStaticMarkup(<BuildItAll />)
    const radios = new Set([...html.matchAll(/type="radio"[^>]*value="([^"]+)"/g)].map((m) => m[1]))
    for (const v of ['amazon-linux', 'm7g.large', '3', 'database', 'server-disk', 'on-demand', 'spot']) expect(radios).toContain(v)
    expect(html).toMatch(/role="switch"/)
    expect(html.match(/type="range"/g)).toHaveLength(2)
    expect(html).toMatch(/Example prices/)
  })

  it('the flat view shows the same state as the 3D one', () => {
    const day = simulateDay(solution, DAY_EVENTS)
    const outage = DAY_EVENTS.find((e) => e.kind === 'az-down')!.at
    const t = day.ticks[outage]
    const html = renderToStaticMarkup(<RegionFallback tick={t} cfg={solution} label={describeRegion(t, solution)} />)
    expect(html).toMatch(/ap-south-1a down/)
    expect(html).toMatch(/Failing over: orders retry/)
    expect(html).toMatch(/Orders DB primary/)
    expect(describeRegion(t, solution)).toMatch(/ap-south-1a is down/)
  })

  it('the flat view names a failed health check and a Spot take-back next to the gone server', () => {
    const crash = simulateDay(solution, [{ at: 1, kind: 'instance-crash' }])
    const t = crash.ticks[2]
    // One step later the crashed server is still marked, beside its replacement.
    const html = renderToStaticMarkup(
      <RegionFallback tick={t} cfg={solution} label="" removed={recentRemoved(crash.ticks, 2)} />,
    )
    expect(html).toMatch(/Health check failed/)
    const spotCfg: FleetConfig = { ...solution, burst: 'spot' }
    const spot = simulateDay(spotCfg, eventsFor(spotCfg))
    const s5 = spot.ticks[SPOT_EVENT.at]
    expect(renderToStaticMarkup(<RegionFallback tick={s5} cfg={spotCfg} label="" />)).toMatch(/Spot taken back/)
  })

  it('the lab offers where orders go, and says the load balancer health checks are on', () => {
    const html = renderToStaticMarkup(<FleetLab />)
    expect(html).toMatch(/value="server-disk"/)
    expect(html).toMatch(/value="database"/)
    expect(html).toMatch(/health checks/)
    expect(html).toMatch(/Crash a server/)
  })

  it('the final challenge starts with nothing ticked and no "All set" cue', () => {
    const html = renderToStaticMarkup(<BuildItAll />)
    expect(html).not.toMatch(/All set/)
    expect(html).toMatch(/Choose an .*AMI.* first/)
    // The 1-AZ start says the load balancer still spans 2 AZs or more.
    expect(html).toMatch(/load balancer always spans at least 2 AZs/)
  })
})

describe('status line', () => {
  const lab = (events: FleetEvent[], cfg: FleetConfig = solution) => ({ cfg, ticks: simulateDay(cfg, events).ticks })
  const days = [
    { cfg: solution, ticks: simulateDay(solution, DAY_EVENTS).ticks },
    ...[
      solution,
      startConfig,
      { ...solution, burst: 'spot' as const },
      { ...solution, ordersOn: 'server-disk' as const },
      { ...solution, azCount: 1 as const },
      { ...solution, webOpen: false },
      { ...solution, instanceType: 'c7g.large' },
      { ...solution, ami: 'amazon-linux', azCount: 2 as const, min: 1 },
    ].map((cfg) => ({ cfg, ticks: simulateDay(cfg, eventsFor(cfg)).ticks })),
    lab([{ at: 1, kind: 'instance-crash' }]),
    lab([{ at: 2, kind: 'az-down' }, { at: 4, kind: 'az-down' }]),
    lab([{ at: 0, kind: 'rush' }, { at: 3, kind: 'instance-crash' }], { ...solution, ordersOn: 'server-disk' }),
  ]

  it('is one short clause at every step of every day: at most 15 words, no sentence break', () => {
    for (const { cfg, ticks } of days)
      ticks.forEach((_, at) => {
        const line = statusLine(ticks, at, cfg)
        expect(line.split(' ').length, line).toBeLessThanOrEqual(15)
        expect(line, line).not.toMatch(/[.!?](\s|$)/)
      })
  })

  it("keeps an event's line up for several steps so it can be read", () => {
    const { cfg, ticks } = lab([{ at: 1, kind: 'instance-crash' }])
    const lines = Array.from({ length: EVENT_STEPS }, (_, k) => statusLine(ticks, 1 + k, cfg))
    expect(new Set(lines).size).toBe(1)
    expect(lines[0]).toMatch(/health check/)
  })

  it('names the database failover with the AZ outage, and never says orders wait', () => {
    const { cfg, ticks } = days[0]
    const at = DAY_EVENTS.find((e) => e.kind === 'az-down')!.at
    expect(statusLine(ticks, at, cfg)).toMatch(/down: other AZs take over, the database fails over/)
    for (const { cfg: c, ticks: t } of days) t.forEach((_, i) => expect(statusLine(t, i, c)).not.toMatch(/wait/))
  })
})

