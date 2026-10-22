import { describe, expect, it } from 'vitest'
import { canHint, canShow, challengeReducer, initialChallenge } from './challengeState'

describe('challengeReducer', () => {
  it('offers a hint after 2 failed tries and Show me after 3', () => {
    let s = initialChallenge
    s = challengeReducer(s, { type: 'fail' })
    expect(canHint(s)).toBe(false)
    s = challengeReducer(s, { type: 'fail' })
    expect(canHint(s)).toBe(true)
    expect(canShow(s)).toBe(false)
    s = challengeReducer(s, { type: 'fail' })
    expect(canShow(s)).toBe(true)
  })
  it('fail after solve does nothing', () => {
    const s = challengeReducer(challengeReducer(initialChallenge, { type: 'solve' }), { type: 'fail' })
    expect(s).toEqual({ tries: 0, solved: true, shown: false, hinted: false })
  })
  it('show marks solved and shown; reset clears everything', () => {
    const s = challengeReducer(initialChallenge, { type: 'show' })
    expect(s.solved && s.shown).toBe(true)
    expect(challengeReducer(s, { type: 'reset' })).toEqual(initialChallenge)
  })
  it('no hint or show once solved', () => {
    const s = challengeReducer({ tries: 5, solved: false, shown: false, hinted: false }, { type: 'solve' })
    expect(canHint(s) || canShow(s)).toBe(false)
  })
  it('hint is ignored before 2 tries', () => {
    const s = challengeReducer(challengeReducer(initialChallenge, { type: 'fail' }), { type: 'hint' })
    expect(s.hinted).toBe(false)
  })
  it('hint after 2 tries sets hinted', () => {
    let s = challengeReducer(initialChallenge, { type: 'fail' })
    s = challengeReducer(challengeReducer(s, { type: 'fail' }), { type: 'hint' })
    expect(s.hinted).toBe(true)
  })
  it('reset clears hinted', () => {
    let s = challengeReducer(initialChallenge, { type: 'fail' })
    s = challengeReducer(challengeReducer(s, { type: 'fail' }), { type: 'hint' })
    expect(challengeReducer(s, { type: 'reset' })).toEqual(initialChallenge)
  })
})
