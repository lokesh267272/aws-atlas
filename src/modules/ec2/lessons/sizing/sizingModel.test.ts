import { describe, expect, it } from 'vitest'
import {
  BUDGET_PER_HOUR,
  CATALOG,
  JOBS,
  fit,
  parseTypeName,
  result,
  solution,
  type InstanceType,
  type JobId,
} from './sizingModel'

const byName = (name: string): InstanceType => {
  const t = CATALOG.find((x) => x.name === name)
  if (!t) throw new Error(`missing ${name}`)
  return t
}

const fits = (job: (typeof JOBS)[number], t: InstanceType) => {
  const f = fit(job, t)
  return f.cpu !== 'over' && f.memory !== 'over'
}

describe('sizing model', () => {
  it('decodes m7g.large', () => {
    expect(parseTypeName('m7g.large')).toEqual({ family: 'm', generation: 7, extras: 'g', size: 'large' })
  })

  it('decodes c7gd.2xlarge', () => {
    expect(parseTypeName('c7gd.2xlarge')).toEqual({ family: 'c', generation: 7, extras: 'gd', size: '2xlarge' })
  })

  it('rejects something that is not a type name', () => {
    expect(() => parseTypeName('large')).toThrow()
  })

  it('each size step doubles vCPU and memory', () => {
    for (const fam of ['m7g', 'c7g', 'r7g']) {
      const large = byName(`${fam}.large`)
      const xlarge = byName(`${fam}.xlarge`)
      const xxlarge = byName(`${fam}.2xlarge`)
      expect(xlarge.vcpu).toBe(2 * large.vcpu)
      expect(xxlarge.vcpu).toBe(2 * xlarge.vcpu)
      expect(xlarge.memoryGiB).toBe(2 * large.memoryGiB)
      expect(xxlarge.memoryGiB).toBe(2 * xlarge.memoryGiB)
    }
  })

  it('uses the real vCPU and memory figures', () => {
    expect(CATALOG).toHaveLength(9)
    expect(byName('m7g.large')).toMatchObject({ family: 'general', vcpu: 2, memoryGiB: 8 })
    expect(byName('c7g.large')).toMatchObject({ family: 'compute', vcpu: 2, memoryGiB: 4 })
    expect(byName('r7g.large')).toMatchObject({ family: 'memory', vcpu: 2, memoryGiB: 16 })
    expect(byName('r7g.2xlarge')).toMatchObject({ vcpu: 8, memoryGiB: 64 })
  })

  it('example prices keep realistic ratios: c < m < r, and each size step doubles the price', () => {
    for (const size of ['large', 'xlarge', '2xlarge']) {
      expect(byName(`c7g.${size}`).pricePerHour).toBeLessThan(byName(`m7g.${size}`).pricePerHour)
      expect(byName(`m7g.${size}`).pricePerHour).toBeLessThan(byName(`r7g.${size}`).pricePerHour)
    }
    for (const fam of ['m7g', 'c7g', 'r7g']) {
      expect(byName(`${fam}.xlarge`).pricePerHour).toBeCloseTo(2 * byName(`${fam}.large`).pricePerHour)
      expect(byName(`${fam}.2xlarge`).pricePerHour).toBeCloseTo(2 * byName(`${fam}.xlarge`).pricePerHour)
    }
  })

  it("flags 'over' when the job needs more than the type has, and 'waste' at 4 times the need or more", () => {
    const job = { id: 'routes' as JobId, needVcpu: 3, needMemoryGiB: 4 }
    expect(fit(job, byName('m7g.large'))).toEqual({ cpu: 'over', memory: 'ok' })
    expect(fit(job, byName('m7g.xlarge'))).toEqual({ cpu: 'ok', memory: 'waste' })
    expect(fit(job, byName('c7g.xlarge'))).toEqual({ cpu: 'ok', memory: 'ok' })
  })

  it('the solution passes', () => {
    expect(result(solution).solved).toBe(true)
  })

  it('the solution wastes nothing', () => {
    for (const job of JOBS) {
      expect(fit(job, byName(solution[job.id]))).toEqual({ cpu: 'ok', memory: 'ok' })
    }
  })

  it('each job is cheapest in a different family', () => {
    const families = JOBS.map((job) => {
      const fitting = CATALOG.filter((t) => fits(job, t))
      return fitting.reduce((a, b) => (b.pricePerHour < a.pricePerHour ? b : a)).family
    })
    expect(new Set(families).size).toBe(3)
  })

  it('only the right-shaped picks fit the budget', () => {
    const winners: string[] = []
    for (const w of CATALOG) for (const r of CATALOG) for (const c of CATALOG) {
      const res = result({ website: w.name, routes: r.name, cache: c.name })
      if (res.solved) winners.push(`${w.name} ${r.name} ${c.name}`)
    }
    expect(winners).toEqual([`${solution.website} ${solution.routes} ${solution.cache}`])
  })

  it('all 2xlarge fits but is over budget', () => {
    const r = result({ website: 'm7g.2xlarge', routes: 'c7g.2xlarge', cache: 'r7g.2xlarge' })
    expect(r.allFit).toBe(true)
    expect(r.withinBudget).toBe(false)
  })

  it('one general type for everything overloads something', () => {
    expect(result({ website: 'm7g.large', routes: 'm7g.large', cache: 'm7g.large' }).allFit).toBe(false)
  })

  it('adds up the cost in whole cents', () => {
    expect(result(solution).cost).toBe(0.33)
    expect(result(solution).cost).toBeLessThanOrEqual(BUDGET_PER_HOUR)
  })
})
