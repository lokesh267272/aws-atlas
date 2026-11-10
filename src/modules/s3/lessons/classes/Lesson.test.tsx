import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { checkTextBudget, S3_LIMITS } from '../../../../test/textBudget'
import { CLASSES } from '../../storageClasses'
import Lesson from './Lesson'
import { MonthBoard } from './MonthBoard'
import { ShelfReadouts, Shelves } from './Shelves'

describe('classes lesson', () => {
  it('renders the challenge goal, the Run the month button and the example-price tag', () => {
    const html = renderToStaticMarkup(<Lesson />)
    expect(html).toMatch(/Run a month of Mealhop&#x27;s files for \$38 or less/)
    expect(html).toMatch(/>Run the month</)
    expect(html).toMatch(/Example prices/)
  })

  it('stays within the Module 3 text budget, with two explanations', () => {
    const html = renderToStaticMarkup(<Lesson />)
    expect(checkTextBudget(html, S3_LIMITS)).toEqual([])
    expect(html.match(/data-explain/g)).toHaveLength(2)
  })

  it('says One Zone data is lost only when the AZ is destroyed', () => {
    expect(renderToStaticMarkup(<Lesson />)).toMatch(/destroyed/i)
  })

  it('never calls One Zone-IA a single copy: it is stored redundantly, but in one AZ', () => {
    const html = renderToStaticMarkup(<Lesson />) + renderToStaticMarkup(<ShelfReadouts id="one-zone-ia" />)
    expect(html).not.toMatch(/(single|only|one) copy/i)
  })

  it('compares S3 to a restaurant and to a gym', () => {
    const html = renderToStaticMarkup(<Lesson />)
    expect(html).toMatch(/restaurant/)
    expect(html).toMatch(/gym/)
  })
})

describe('shelves', () => {
  it('offers all seven classes as keyboard choices, starting on Standard', () => {
    const html = renderToStaticMarkup(<Shelves />)
    const values = [...html.matchAll(/type="radio"[^>]*value="([^"]+)"/g)].map((m) => m[1])
    expect(new Set(values)).toEqual(new Set(CLASSES.map((c) => c.id)))
    expect(html).toMatch(/type="radio"[^>]*value="standard"[^>]*checked=""|checked=""[^>]*value="standard"/)
    expect(html).toMatch(/Example prices/)
  })

  it('reads the four numbers for the backup from the shared table', () => {
    const std = renderToStaticMarkup(<ShelfReadouts id="standard" />)
    expect(std).toMatch(/\$0\.50/)
    expect(std).toMatch(/Free/)
    expect(std).toMatch(/milliseconds/)
    expect(std).toMatch(/At least 3/)
    const deep = renderToStaticMarkup(<ShelfReadouts id="deep-archive" />)
    expect(deep).toMatch(/\$0\.04/)
    expect(deep).toMatch(/\$0\.40/)
    expect(deep).toMatch(/within 12 hours/)
    expect(deep).toMatch(/180 days/)
  })

  it('warns that a One Zone-IA file is in one AZ and lost if that AZ is destroyed', () => {
    const html = renderToStaticMarkup(<ShelfReadouts id="one-zone-ia" />)
    expect(html).toMatch(/>1</)
    expect(html).toMatch(/destroyed/)
  })

  it('says Intelligent-Tiering starts at the Standard price', () => {
    expect(renderToStaticMarkup(<ShelfReadouts id="intelligent-tiering" />)).toMatch(/30 days/)
  })
})

describe('month board', () => {
  it('has one shelf select per file type, each offering all seven classes, starting on Standard', () => {
    const html = renderToStaticMarkup(<MonthBoard />)
    const selects = html.match(/<select[\s\S]*?<\/select>/g) ?? []
    expect(selects).toHaveLength(5)
    for (const s of selects) {
      expect(s.match(/<option/g)).toHaveLength(7)
      expect(s).toMatch(/<option value="standard" selected="">/)
    }
  })

  it('starts over budget, unsolved, with the month not yet run', () => {
    const html = renderToStaticMarkup(<MonthBoard />)
    expect(html).toMatch(/\$58\.75/)
    expect(html).not.toMatch(/Solved/)
    expect(html).toMatch(/run the month to check/)
  })

  it('lists the six events, ending with an AZ destroyed', () => {
    const html = renderToStaticMarkup(<MonthBoard />)
    for (const text of ['menu photos all month', 'one delivery photo', 'last night&#x27;s backup', 'a few reports', 'receipts'])
      expect(html).toContain(text)
    expect(html).toMatch(/ap-south-1a is destroyed/)
  })
})
