import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import Lesson from './Lesson'
import { SizingChallenge } from './SizingChallenge'

describe('sizing lesson', () => {
  it('renders the challenge with its goal, Run button and example-price tag', () => {
    const html = renderToStaticMarkup(<Lesson />)
    expect(html).toMatch(/Run all three jobs for \$0\.34 an hour or less/)
    expect(html).toMatch(/>Run the jobs</)
    expect(html).toMatch(/Example prices/)
  })

  it('keeps the t family out of the challenge choices', () => {
    const html = renderToStaticMarkup(<SizingChallenge />)
    const families = [...html.matchAll(/type="radio"[^>]*value="([a-z0-9]+)"/g)].map((m) => m[1])
    expect(new Set(families)).toEqual(new Set(['m', 'c', 'r', 'large', 'xlarge', '2xlarge']))
  })

  it('starts with one general type for every job, so the gauges show red', () => {
    const html = renderToStaticMarkup(<SizingChallenge />)
    expect(html).toMatch(/Not enough CPU/)
    expect(html).toMatch(/Not enough memory/)
  })
})
