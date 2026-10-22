import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { checkTextBudget } from '../../../../test/textBudget'
import { BuildItAll } from './BuildItAll'
import Lesson from './Lesson'
import { RegionFallback } from './RegionFallback'
import { describeRegion } from './RegionView'
import { DAY_EVENTS, simulateDay, solution } from './scaleModel'

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
    expect(html).toMatch(/Failing over: orders wait/)
    expect(html).toMatch(/Orders DB primary/)
    expect(describeRegion(t, solution)).toMatch(/ap-south-1a is down/)
  })
})
