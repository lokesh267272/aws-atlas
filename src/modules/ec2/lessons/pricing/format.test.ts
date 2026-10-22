import { describe, expect, it } from 'vitest'
import { story } from '../../story'
import { dollars, fineMoney, hourName, money } from './format'

describe('pricing format helpers', () => {
  it('uses the story currency everywhere', () => {
    expect(money(0.1)).toBe(`${story.currency}0.10`)
    expect(dollars(259.6)).toBe(`${story.currency}260`)
    expect(fineMoney(0.0005)).toBe(`${story.currency}0.00050`)
    expect(fineMoney(12.4)).toBe(`${story.currency}12.40`)
  })
  it('names hours', () => {
    expect([0, 3, 12, 19].map(hourName)).toEqual(['12 am', '3 am', 'noon', '7 pm'])
  })
})
