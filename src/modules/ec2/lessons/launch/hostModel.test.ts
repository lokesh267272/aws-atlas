import { describe, expect, it } from 'vitest'
import { SLOTS, hostStep } from './hostModel'

describe('host server model', () => {
  it('splits a whole server, then rents the free slice', () => {
    expect(hostStep('whole', 'split')).toBe('split')
    expect(hostStep('split', 'rent')).toBe('rented')
  })

  it('renting a whole server splits it first', () => {
    expect(hostStep('whole', 'rent')).toBe('rented')
  })

  it('ignores repeated or backwards actions', () => {
    expect(hostStep('split', 'split')).toBe('split')
    expect(hostStep('rented', 'split')).toBe('rented')
    expect(hostStep('rented', 'rent')).toBe('rented')
  })

  it('has exactly one free slice for you, among other customers', () => {
    expect(SLOTS.filter((s) => s.owner === 'you')).toHaveLength(1)
    expect(SLOTS.filter((s) => s.owner === 'other').length).toBeGreaterThanOrEqual(2)
  })
})
