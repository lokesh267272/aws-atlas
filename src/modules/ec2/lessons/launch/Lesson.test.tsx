import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { checkTextBudget } from '../../../../test/textBudget'
import Lesson from './Lesson'

describe('launch lesson', () => {
  it('lesson works without WebGL: goal and Launch button render in SSR', async () => {
    const html = renderToStaticMarkup(<Lesson />)
    expect(html).toMatch(/menu page online/i); expect(html).toMatch(/>Launch</)
  })

  it('stays within the text budget', () => {
    expect(checkTextBudget(renderToStaticMarkup(<Lesson />))).toEqual([])
  })

  it('never says AWS refuses to launch without a part', () => {
    const html = renderToStaticMarkup(<Lesson />)
    expect(html).not.toMatch(/(required|must choose|won.t launch|can.t launch|refuse)/i)
  })

  it('states the audited facts: web server assumption, Nitro hardware, no instance-only wording', () => {
    const html = renderToStaticMarkup(<Lesson />)
    expect(html).toMatch(/hardware \+ .*hypervisor.* layer/)
    expect(html).not.toMatch(/turned away/)
    expect(html).not.toMatch(/No key to log in with/)
  })
})
