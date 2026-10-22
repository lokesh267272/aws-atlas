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
})
