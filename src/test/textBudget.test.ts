import { describe, expect, it } from 'vitest'
import { checkTextBudget } from './textBudget'

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
})
