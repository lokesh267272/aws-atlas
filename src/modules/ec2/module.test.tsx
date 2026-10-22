import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { baseGlossary } from '../../course/glossary'
import { getLesson, getModule } from '../../course/registry'
import { foundations } from '../foundations'
import { checkTextBudget } from '../../test/textBudget'
import { ec2 } from './index'
import { SetupDiagram } from './SetupDiagram'
import { story } from './story'
import { terms as launchTerms } from './lessons/launch/terms'
import { terms as sizingTerms } from './lessons/sizing/terms'
import { terms as storageTerms } from './lessons/storage/terms'
import { terms as accessTerms } from './lessons/access/terms'
import { terms as pricingTerms } from './lessons/pricing/terms'
import { terms as scaleTerms } from './lessons/scale/terms'

describe('ec2 module skeleton', () => {
  it('registers ec2 as module 2 with six 10-minute lessons', () => {
    const m = getModule('ec2')!
    expect(m.number).toBe(2)
    expect(m.lessons.map((l) => l.id)).toEqual(['launch', 'sizing', 'storage', 'access', 'pricing', 'scale'])
    expect(m.lessons.every((l) => l.minutes === 10)).toBe(true)
    expect(m.covers).toEqual(['ec2', 'ebs', 'elb'])
  })

  it('never redefines an existing glossary key', () => {
    const taken = new Set([...Object.keys(baseGlossary), ...Object.keys(foundations.terms)])
    expect(Object.keys(ec2.terms).filter((k) => taken.has(k))).toEqual([])
  })

  it.each(['launch', 'sizing', 'storage', 'access', 'pricing', 'scale'])('%s stays within the text budget', async (id) => {
    const { default: Lesson } = await getLesson('ec2', id)!.lesson.load()
    expect(checkTextBudget(renderToStaticMarkup(<Lesson />))).toEqual([])
  })

  it('setup diagram grows: no load balancer before step 6', () => {
    expect(renderToStaticMarkup(<SetupDiagram step={5} />)).not.toMatch(/load balancer/i)
    expect(renderToStaticMarkup(<SetupDiagram step={6} />)).toMatch(/load balancer/i)
  })

  it('draws the Auto Scaling group once at step 6', () => {
    const html = renderToStaticMarkup(<SetupDiagram step={6} />)
    expect(html.match(/Auto Scaling group/g)).toHaveLength(1)
  })

  const highlighted = (html: string) => (html.match(/bg-signal-soft/g) ?? []).length

  it('highlights what each step adds', () => {
    const at = (n: 1 | 2 | 3 | 4) => renderToStaticMarkup(<SetupDiagram step={n} />)
    // step 3: disk and snapshot highlighted, server no longer is
    expect(highlighted(at(3))).toBe(2)
    // step 4: only the security group is highlighted (the server role too)
    expect(highlighted(at(4))).toBe(2)
    expect(at(4)).toMatch(/Security group/)
  })

  it('keeps the server role (IAM is global) outside the Region', () => {
    const html = renderToStaticMarkup(<SetupDiagram step={4} />)
    expect(html).toContain('Server role')
    expect(html.indexOf('Server role')).toBeLessThan(html.indexOf(story.regionName))
    expect(html.indexOf('Snapshot')).toBeGreaterThan(html.indexOf(story.regionName))
  })

  it('does not draw the server role before step 4', () => {
    expect(renderToStaticMarkup(<SetupDiagram step={3} />)).not.toContain('Server role')
  })

  it('no two ec2 lessons define the same glossary key', () => {
    const sets = { launchTerms, sizingTerms, storageTerms, accessTerms, pricingTerms, scaleTerms }
    const owners = new Map<string, string[]>()
    for (const [name, t] of Object.entries(sets)) {
      for (const k of Object.keys(t)) owners.set(k, [...(owners.get(k) ?? []), name])
    }
    const dupes = [...owners].filter(([, o]) => o.length > 1).map(([k, o]) => `${k}: ${o.join(', ')}`)
    expect(dupes).toEqual([])
  })

  it('every <Term> key used by an ec2 lesson resolves', async () => {
    expect(import.meta.env.DEV).toBe(true)
    // Term warns once per key per module instance, so load fresh copies of everything
    // (React included, to keep one renderer and one React) or earlier tests would swallow the warning.
    vi.resetModules()
    const { renderToStaticMarkup: render } = await import('react-dom/server')
    const { createElement } = await import('react')
    const registry = await import('../../course/registry')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      for (const id of ['launch', 'sizing', 'storage', 'access', 'pricing', 'scale']) {
        const { default: Lesson } = await registry.getLesson('ec2', id)!.lesson.load()
        render(createElement(Lesson))
      }
      const missing = warn.mock.calls.map((c) => String(c[0])).filter((m) => m.includes('[Term] No glossary entry'))
      expect(missing).toEqual([])
    } finally {
      warn.mockRestore()
    }
  })
})
