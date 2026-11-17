import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { baseGlossary } from '../../course/glossary'
import { getLesson, getModule } from '../../course/registry'
import { foundations } from '../foundations'
import { ec2 } from '../ec2'
import { checkTextBudget, S3_LIMITS } from '../../test/textBudget'
import { s3 } from './index'
import { FileStoreDiagram } from './FileStoreDiagram'
import { s3Story } from './story'
import { terms as sharedTerms } from './terms'
import { terms as bucketsTerms } from './lessons/buckets/terms'
import { terms as accessTerms } from './lessons/access/terms'
import { terms as classesTerms } from './lessons/classes/terms'
import { terms as versioningTerms } from './lessons/versioning/terms'
import { terms as lifecycleTerms } from './lessons/lifecycle/terms'
import { terms as finalTerms } from './lessons/final/terms'

/** Inner HTML of the element carrying data-part="<part>", balancing nested divs. */
function partHtml(html: string, part: string): string {
  const open = new RegExp(`<div\\b[^>]*data-part="${part}"[^>]*>`).exec(html)
  if (!open) return ''
  const start = open.index + open[0].length
  const tag = /<(\/?)div\b[^>]*>/g
  tag.lastIndex = start
  let depth = 1
  let t: RegExpExecArray | null
  while ((t = tag.exec(html))) {
    depth += t[1] ? -1 : 1
    if (depth === 0) return html.slice(start, t.index)
  }
  return ''
}

const isInside = (html: string, inner: string, outer: string) =>
  partHtml(html, outer).includes(`data-part="${inner}"`)

describe('s3 module skeleton', () => {
  it('registers s3 as module 3 with six 10-minute lessons', () => {
    const m = getModule('s3')!
    expect(m.number).toBe(3)
    expect(m.lessons.map((l) => l.id)).toEqual(['buckets', 'access', 'classes', 'versioning', 'lifecycle', 'final'])
    expect(m.lessons.every((l) => l.minutes === 10)).toBe(true)
    expect(m.covers).toEqual(['s3'])
  })

  it('never redefines an existing glossary key', () => {
    const taken = new Set([...Object.keys(baseGlossary), ...Object.keys(foundations.terms), ...Object.keys(ec2.terms)])
    expect(Object.keys(s3.terms).filter((k) => taken.has(k))).toEqual([])
  })

  it.each(s3.lessons.map((l) => l.id))('%s stays within the Module 3 text budget', async (id) => {
    const { default: Lesson } = await getLesson('s3', id)!.lesson.load()
    expect(checkTextBudget(renderToStaticMarkup(<Lesson />), S3_LIMITS)).toEqual([])
  })

  it.each(s3.lessons.map((l) => l.id))('%s keeps glossary terms out of every label', async (id) => {
    const { default: Lesson } = await getLesson('s3', id)!.lesson.load()
    const html = renderToStaticMarkup(<Lesson />)
    // A glossary term is a button: inside a label, tapping it would toggle the control.
    const labels = html.match(/<label[\s>][\s\S]*?<\/label>/g) ?? []
    expect(labels.filter((l) => /class="(?:[^"]* )?term[ "]/.test(l))).toEqual([])
  })

  it('the bucket is in the Region but outside the VPC', () => {
    const html = renderToStaticMarkup(<FileStoreDiagram step={1} />)
    expect(isInside(html, 'bucket', 'region')).toBe(true)
    expect(isInside(html, 'bucket', 'vpc')).toBe(false)
  })

  it('draws the bucket across all three AZs and says what each step adds', () => {
    const html = renderToStaticMarkup(<FileStoreDiagram step={3} />)
    for (const az of s3Story.azs) expect(html).toContain(az)
    expect(html).toMatch(/New in this step: a storage class/)
    expect(html).toMatch(/aria-current="true"/)
  })

  it('server role is outside the Region and appears from step 2', () => {
    expect(renderToStaticMarkup(<FileStoreDiagram step={1} />)).not.toContain('Server role')
    const html = renderToStaticMarkup(<FileStoreDiagram step={2} />)
    expect(html.indexOf('Server role')).toBeLessThan(html.indexOf(s3Story.regionName))
  })

  it('grows one piece per step', () => {
    const at = (n: 1 | 2 | 3 | 4 | 5 | 6) => renderToStaticMarkup(<FileStoreDiagram step={n} />)
    expect(at(1)).not.toMatch(/Block Public Access/)
    expect(at(2)).toMatch(/Block Public Access/)
    expect(at(2)).not.toMatch(/One Zone-IA/)
    expect(at(3)).toMatch(/One Zone-IA/)
    expect(at(3)).not.toMatch(/Versioning on/)
    expect(at(4)).toMatch(/Versioning on/)
    expect(at(4)).not.toMatch(/lifecycle/i)
    expect(at(5)).toMatch(/lifecycle/i)
  })

  it('step 6 highlights nothing and reads complete', () => {
    const html = renderToStaticMarkup(<FileStoreDiagram step={6} />)
    // Nothing highlighted: not a tile or pill, not an outlined or ringed Boundary, no aria-current.
    expect(html).not.toMatch(/bg-signal-soft|outline-signal|ring-4|aria-current/)
    expect(html).toMatch(/Complete/)
  })

  it('no two s3 lessons (or the shared terms) define the same glossary key', () => {
    const sets = { sharedTerms, bucketsTerms, accessTerms, classesTerms, versioningTerms, lifecycleTerms, finalTerms }
    const owners = new Map<string, string[]>()
    for (const [name, t] of Object.entries(sets)) {
      for (const k of Object.keys(t)) owners.set(k, [...(owners.get(k) ?? []), name])
    }
    const dupes = [...owners].filter(([, o]) => o.length > 1).map(([k, o]) => `${k}: ${o.join(', ')}`)
    expect(dupes).toEqual([])
  })

  it('every <Term> key used by an s3 lesson resolves', async () => {
    expect(import.meta.env.DEV).toBe(true)
    // Term warns once per key per module instance, so load fresh copies of everything
    // (React included, to keep one renderer and one React) or earlier tests would swallow the warning.
    vi.resetModules()
    const { renderToStaticMarkup: render } = await import('react-dom/server')
    const { createElement } = await import('react')
    const registry = await import('../../course/registry')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      // Only Terms rendered on first render are covered (not ones revealed after interaction).
      for (const { id } of s3.lessons) {
        const { default: Lesson } = await registry.getLesson('s3', id)!.lesson.load()
        render(createElement(Lesson))
      }
      // The diagram at every step too, since stubs only show one step each.
      const { FileStoreDiagram: Diagram } = await import('./FileStoreDiagram')
      for (const n of [1, 2, 3, 4, 5, 6] as const) render(createElement(Diagram, { step: n }))
      const missing = warn.mock.calls.map((c) => String(c[0])).filter((m) => m.includes('[Term] No glossary entry'))
      expect(missing).toEqual([])
    } finally {
      warn.mockRestore()
    }
  })
})
