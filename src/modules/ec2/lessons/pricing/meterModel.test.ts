import { describe, expect, it } from 'vitest'
import { billEbs, billInstance } from './pricingModel'
import { initialMeter, meterReducer, meterTotals, type MeterAction, type MeterState } from './meterModel'

const play = (...actions: MeterAction[]): MeterState => actions.reduce(meterReducer, initialMeter)
const tick = (seconds: number): MeterAction => ({ type: 'tick', seconds })

describe('lifecycle meter', () => {
  it('bills at least 60 seconds for each start', () => {
    const s = play({ type: 'start' }, tick(20), { type: 'stop' })
    expect(meterTotals(s).serverSeconds).toBe(60)
    expect(meterTotals(s).serverCost).toBeCloseTo(billInstance('running', 60), 10)
  })
  it('charges the minimum again on every start', () => {
    const s = play({ type: 'start' }, tick(10), { type: 'stop' }, { type: 'start' }, tick(10), { type: 'stop' })
    expect(meterTotals(s).serverSeconds).toBe(120)
  })
  it('bills per second after the first minute', () => {
    expect(meterTotals(play({ type: 'start' }, tick(90), { type: 'stop' })).serverSeconds).toBe(90)
  })
  it('shows the minimum as soon as the server starts', () => {
    expect(meterTotals(play({ type: 'start' })).serverSeconds).toBe(60)
  })
  it('stop freezes the server meter while the disk keeps billing', () => {
    const stopped = play({ type: 'start' }, tick(100), { type: 'stop' })
    const later = meterReducer(stopped, tick(500))
    expect(meterTotals(later).serverSeconds).toBe(meterTotals(stopped).serverSeconds)
    expect(meterTotals(later).serverCost).toBe(meterTotals(stopped).serverCost)
    expect(meterTotals(later).diskSeconds).toBe(600)
    expect(meterTotals(later).diskCost).toBeGreaterThan(meterTotals(stopped).diskCost)
    expect(meterTotals(later).diskCost).toBeCloseTo(billEbs(8, 600 / 3600), 12)
  })
  it('terminate stops both meters and the server cannot start again', () => {
    const ended = play({ type: 'start' }, tick(100), { type: 'terminate' })
    const later = play({ type: 'start' }, tick(100), { type: 'terminate' }, tick(500), { type: 'start' })
    expect(later.life).toBe('terminated')
    expect(meterTotals(later)).toEqual(meterTotals(ended))
  })
  it('does not tick before the first start', () => {
    expect(meterTotals(play(tick(100))).diskSeconds).toBe(0)
  })
})
