import { describe, expect, it } from 'vitest'
import { checkTextBudget, S3_LIMITS } from './textBudget'

describe('checkTextBudget', () => {
  it('passes a lesson with one intro and short captions', () => {
    expect(
      checkTextBudget(
        '<div class="prose-lesson"><p>Lunch rush is coming.</p></div><div data-caption="">Press Launch and watch it start.</div>',
      ),
    ).toEqual([])
  })

  it('flags a second prose block', () => {
    expect(checkTextBudget('<div class="prose-lesson"><p>A.</p></div><div class="prose-lesson"><p>B.</p></div>')).toHaveLength(1)
  })

  it('flags a 23-word caption', () => {
    expect(checkTextBudget(`<div data-caption="">${'word '.repeat(23)}</div>`)).toHaveLength(1)
  })

  it('flags a two-sentence caption', () => {
    expect(checkTextBudget('<div data-caption="">Try it. Then watch.</div>')).toHaveLength(1)
  })

  it('flags takeaways and checkpoints', () => {
    expect(checkTextBudget('<h3>What to take away</h3><h3>Check yourself</h3>')).toHaveLength(2)
  })

  const term = '<span class="term" role="button" tabindex="0">EC2</span>'

  it('counts words through a Term span: 22 pass, 23 fail', () => {
    expect(checkTextBudget(`<div data-caption="">${term} ${'word '.repeat(21)}</div>`)).toEqual([])
    expect(checkTextBudget(`<div data-caption="">${term} ${'word '.repeat(22)}</div>`)).toHaveLength(1)
  })

  it('does not end a caption early at a nested div', () => {
    const html = `<div data-caption=""><div>inner</div>${'word '.repeat(22)}</div>`
    expect(checkTextBudget(html)).toHaveLength(1)
  })

  it('counts entities as words, not sentences', () => {
    expect(checkTextBudget('<div data-caption="">don&#x27;t &amp; stop</div>')).toEqual([])
  })

  it('allows 30 prose words and flags 31', () => {
    expect(checkTextBudget(`<div class="prose-lesson"><p>${'word '.repeat(30)}</p></div>`)).toEqual([])
    expect(checkTextBudget(`<div class="prose-lesson"><p>${'word '.repeat(31)}</p></div>`)).toHaveLength(1)
  })

  it('flags "In real AWS" appearing twice, once', () => {
    expect(checkTextBudget('<b>In real AWS</b><b>In real AWS</b>')).toHaveLength(1)
    expect(checkTextBudget('<b>In real AWS</b>')).toEqual([])
  })

  describe('module 3 limits', () => {
    const ex = (t: string) => `<div data-explain="">${t}</div>`
    it('module 3 accepts a 2-sentence intro and two 4-sentence explanations', () => {
      expect(checkTextBudget(`<div class="prose-lesson"><p>One. Two.</p></div>${ex('A. B. C. D.')}${ex('A. B.')}`, S3_LIMITS)).toEqual([])
    })
    it('module 3 flags a third explanation', () => { expect(checkTextBudget(ex('A. B.').repeat(3), S3_LIMITS)).toHaveLength(1) })
    it('module 3 flags a 5-sentence explanation', () => { expect(checkTextBudget(ex('A. B. C. D. E.'), S3_LIMITS)).toHaveLength(1) })
    it('module 3 flags a 1-sentence explanation', () => { expect(checkTextBudget(ex('Only one.'), S3_LIMITS)).toHaveLength(1) })
    it('module 3 flags a 71-word explanation', () => { expect(checkTextBudget(ex(`${'word '.repeat(70)}end. Two.`), S3_LIMITS)).toHaveLength(1) })
    it('module 2 limits are unchanged and reject any explanation', () => {
      expect(checkTextBudget('<div class="prose-lesson"><p>One. Two.</p></div>')).toHaveLength(1)
      expect(checkTextBudget(ex('A. B.'))).toHaveLength(1)
    })
    it('an explanation is not counted as prose', () => {
      expect(checkTextBudget(`<div class="prose-lesson"><p>Intro.</p></div>${ex('A. B.')}`, S3_LIMITS)).toEqual([])
    })
  })
})
