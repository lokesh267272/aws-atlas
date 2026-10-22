import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Challenge } from './Challenge'
import { initialChallenge, type ChallengeState } from './challengeState'

const noop = () => {}
const render = (state: ChallengeState, stale?: boolean, tone?: 'light' | 'screen', staleReason?: 'changed' | 'failing') =>
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
      staleReason={staleReason}
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

  it('marks the stale line with a warning icon, in both tones', () => {
    for (const tone of ['light', 'screen'] as const) {
      const html = render(solved, true, tone)
      expect(html).toMatch(/<svg[^>]*lucide-triangle-alert[^>]*aria-hidden="true"[^>]*>.*?You changed it/)
    }
  })

  it('says what failed when the setup is failing, in both tones', () => {
    for (const tone of ['light', 'screen'] as const) {
      const html = render(solved, true, tone, 'failing')
      expect(html).toMatch(/<svg[^>]*lucide-triangle-alert[^>]*aria-hidden="true"[^>]*>.*?This setup doesn(?:'|&#x27;)t pass yet\./)
      expect(html).not.toContain('You changed it')
      expect(html).not.toContain('SUCCESS-NOTE')
    }
  })

  it("defaults the reason to 'changed'", () => {
    expect(render(solved, true, undefined, 'changed')).toContain('You changed it: run it again to check.')
    expect(render(solved, true)).not.toMatch(/pass yet/)
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

  it('makes the revealed hint focusable so focus can move there when the Hint button goes', () => {
    const html = render({ ...failed, hinted: true })
    expect(html).toMatch(/<p[^>]*tabindex="-1"[^>]*>The hint text/)
  })

  it('does not hard-code the accent colour', () => {
    expect(render({ ...failed, tries: 3 }, false, 'screen')).not.toContain('#5fb3e6')
  })
})
