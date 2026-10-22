import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Challenge } from './Challenge.tsx'
import { initialChallenge, type ChallengeState } from './challenge'

const noop = () => {}
const render = (state: ChallengeState, stale?: boolean, tone?: 'light' | 'screen') =>
  renderToStaticMarkup(
    <Challenge
      goal="Goal"
      checks={[{ label: 'One', done: false }]}
      state={state}
      hint="The hint text"
      onHint={noop}
      onShowMe={noop}
      successNote="SUCCESS-NOTE"
      stale={stale}
      tone={tone}
    />,
  )

const solved: ChallengeState = { ...initialChallenge, solved: true }

describe('Challenge stale state', () => {
  it('solved and not stale shows the success note', () => {
    const html = render(solved)
    expect(html).toContain('SUCCESS-NOTE')
    expect(html).toContain('Solved')
    expect(html).not.toContain('You changed it')
  })

  it('solved and stale shows one warn line instead of the success row', () => {
    const html = render(solved, true)
    expect(html).toContain('You changed it: run it again to check.')
    expect(html).not.toContain('SUCCESS-NOTE')
    expect(html).not.toContain('Solved')
  })

  it('stale while unsolved changes nothing', () => {
    const html = render(initialChallenge, true)
    expect(html).not.toContain('You changed it')
  })

  it('keeps Hint and Show me hidden while solved and stale', () => {
    const html = render({ ...solved, tries: 5 }, true)
    expect(html).not.toContain('Show me')
    expect(html).not.toContain('Hint<')
  })
})

describe('Challenge hint', () => {
  const failed: ChallengeState = { ...initialChallenge, tries: 2 }

  it('offers the Hint button before it is used', () => {
    const html = render(failed)
    expect(html).toContain('Hint')
    expect(html).not.toContain('The hint text')
  })

  it('shows the hint inside the live region and hides the Hint button once revealed', () => {
    const html = render({ ...failed, hinted: true })
    const live = html.slice(html.indexOf('aria-live'))
    expect(live).toContain('The hint text')
    expect(html).not.toMatch(/<button[^>]*>(<svg[^>]*>.*?<\/svg>)?Hint<\/button>/)
  })

  it('does not hard-code the accent colour', () => {
    expect(render({ ...failed, tries: 3 }, false, 'screen')).not.toContain('#5fb3e6')
  })
})
