import { describe, expect, it } from 'vitest'
import { CLASSES, classById, type ClassId } from './storageClasses'
import { FILE_TYPES, PREFIX_IDS } from './story'
import { terms } from './terms'

const c = classById

describe('storage classes', () => {
  it('has the seven classes in waterfall order', () => {
    expect(CLASSES.map((x) => x.id)).toEqual(['standard', 'standard-ia', 'intelligent-tiering', 'one-zone-ia', 'glacier-ir', 'glacier-flexible', 'deep-archive'])
  })
  it('storage gets cheaper down the shelves', () => {
    const order: ClassId[] = ['standard', 'standard-ia', 'one-zone-ia', 'glacier-ir', 'glacier-flexible', 'deep-archive']
    order.slice(1).forEach((id, i) => expect(c(id).storePerGbMonth).toBeLessThan(c(order[i]).storePerGbMonth))
    expect(c('deep-archive').storePerGbMonth).toBeLessThan(c('standard').storePerGbMonth / 10)
  })
  it('only Standard and Intelligent-Tiering have no fetch fee', () => {
    expect(CLASSES.filter((x) => x.fetchPerGb === 0).map((x) => x.id)).toEqual(['standard', 'intelligent-tiering'])
  })
  it('minimum days and AZs match AWS', () => {
    expect(CLASSES.map((x) => [x.id, x.minDays, x.azs])).toEqual([
      ['standard', 0, 3], ['standard-ia', 30, 3], ['intelligent-tiering', 0, 3], ['one-zone-ia', 30, 1],
      ['glacier-ir', 90, 3], ['glacier-flexible', 90, 3], ['deep-archive', 180, 3],
    ])
  })
  it('only the two Glacier archive classes are slow', () => {
    expect(CLASSES.filter((x) => x.firstByteSeconds > 1).map((x) => x.id)).toEqual(['glacier-flexible', 'deep-archive'])
    expect(c('deep-archive').firstByteSeconds).toBe(12 * 3600)
  })
  it('every class and story term resolves in the shared terms', () => {
    CLASSES.forEach((x) => expect(terms[x.termKey]).toBeDefined())
  })
  it('only reports can be re-made', () => {
    expect(PREFIX_IDS.filter((p) => FILE_TYPES[p].recreatable)).toEqual(['reports'])
  })
})
