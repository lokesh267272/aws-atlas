import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { ThreeElements } from '@react-three/fiber'
import { Scene3DView } from '../../../../components/Scene3D'
import { checkTextBudget, S3_LIMITS } from '../../../../test/textBudget'
import { BucketMaker } from './BucketMaker'
import { CopiesFallback } from './CopiesFallback'
import { CopiesView, describeCopies, statusLine } from './CopiesView'
import Lesson from './Lesson'
import { terms } from './terms'
import type { Break } from './bucketsModel'

// Keeps r3f's JSX intrinsic types (<mesh />) in scope for this file.
export type _Three = ThreeElements

describe('buckets lesson', () => {
  it('works without WebGL: goal and "Open the app" render in SSR', () => {
    const html = renderToStaticMarkup(<Lesson />); expect(html).toMatch(/Stock the menu/i); expect(html).toMatch(/>Open the app</)
  })

  it('says 50 TB, never 5 TB', () => { const html = renderToStaticMarkup(<Lesson />); expect(html).toMatch(/50 TB/); expect(html).not.toMatch(/\b5 TB/) })

  it('stays within the Module 3 text budget, with two explanations', () => {
    const html = renderToStaticMarkup(<Lesson />)
    expect(checkTextBudget(html, S3_LIMITS)).toEqual([])
    expect(html.match(/data-explain/g)).toHaveLength(2)
  })

  it('keeps glossary terms out of every label', () => {
    const html = renderToStaticMarkup(<Lesson />)
    const labels = html.match(/<label[\s>][\s\S]*?<\/label>/g) ?? []
    expect(labels.filter((l) => /class="(?:[^"]* )?term[ "]/.test(l))).toEqual([])
  })

  it('compares buckets to a cupboard and copies to something everyday, and contrasts EBS', () => {
    const html = renderToStaticMarkup(<Lesson />)
    expect(html).toMatch(/cupboard/)
    expect(html).toMatch(/EBS volume/)
  })

  it('states durability as AWS does', () => {
    const html = renderToStaticMarkup(<CopiesView />)
    expect(html).toMatch(/99\.999999999% \(11 nines\)/)
    expect(html).toMatch(/10,000,000 objects/)
    expect(html).toMatch(/once every 10,000 years/)
  })

  it('falls back to the 2D picture without WebGL', () => {
    const breaks: Break[] = [{ kind: 'az', az: 0 }]
    const label = describeCopies('s3-standard', true, breaks)
    const html = renderToStaticMarkup(
      <Scene3DView webgl={false} label={label} fallback={<CopiesFallback where="s3-standard" stored breaks={breaks} label={label} />}>
        <mesh />
      </Scene3DView>,
    )
    expect(html).toMatch(/ap-south-1a out/)
    expect(html).toMatch(/ap-south-1b/)
    expect(html).toMatch(/ap-south-1c/)
    expect(html).toMatch(/Reads from ap-south-1b/)
  })

  it('the flat view shows an EBS volume that cannot be read once its AZ is out', () => {
    const breaks: Break[] = [{ kind: 'az', az: 0 }]
    const html = renderToStaticMarkup(<CopiesFallback where="ebs" stored breaks={breaks} label="" />)
    expect(html).toMatch(/Can&#x27;t be read|Can't be read/)
    expect(html).toMatch(/No copy here/)
  })

  it('describes the scene for screen readers', () => {
    expect(describeCopies('s3-standard', false, [])).toMatch(/No photo stored yet/)
    expect(describeCopies('ebs', true, [{ kind: 'az', az: 0 }])).toMatch(/ap-south-1a is out.*can't be read/)
    expect(describeCopies('s3-standard', true, [{ kind: 'device', az: 1 }])).toMatch(/ap-south-1b: 1 device broken, 1 copy\./)
  })

  it('the status line is one short sentence in every state', () => {
    const cases: [Parameters<typeof statusLine>[0], boolean, Break[]][] = [
      ['s3-standard', false, []],
      ['s3-standard', true, []],
      ['ebs', true, []],
      ['s3-standard', true, [{ kind: 'device', az: 0 }]],
      ['ebs', true, [{ kind: 'device', az: 0 }]],
      ['ebs', true, [{ kind: 'az', az: 0 }]],
      ['s3-standard', true, [{ kind: 'az', az: 0 }, { kind: 'az', az: 1 }, { kind: 'az', az: 2 }]],
    ]
    for (const [where, stored, breaks] of cases) {
      const line = statusLine(where, stored, breaks)
      expect(line.split(' ').length, line).toBeLessThanOrEqual(16)
      expect((line.match(/[.!?](\s|$)/g) ?? []).length, line).toBe(1)
    }
    expect(statusLine('ebs', true, [{ kind: 'az', az: 0 }])).toMatch(/can't be read/)
    expect(statusLine('s3-standard', true, [{ kind: 'az', az: 0 }])).toMatch(/Still loads/)
    // EBS keeps copies on several servers inside its AZ, so one broken device does not stop reads.
    expect(statusLine('ebs', true, [{ kind: 'device', az: 0 }])).toMatch(/Still loads/)
  })

  it('offers two kinds of break only (a device, a whole AZ) and makes no data-center claims', () => {
    const view = renderToStaticMarkup(<CopiesView />)
    expect(view).toMatch(/>Break a device</)
    expect(view).toMatch(/>Take out the AZ</)
    expect(view).not.toMatch(/data center is out|Data center out|Break its data center/i)
    expect(view).toMatch(/one or more data centers/)
    const flat = renderToStaticMarkup(<CopiesFallback where="ebs" stored breaks={[{ kind: 'device', az: 0 }]} label="" />)
    expect(flat).not.toMatch(/Data center out/)
    expect(flat).toMatch(/Reads from ap-south-1a/)
    for (const b of [[], [{ kind: 'device', az: 0 }], [{ kind: 'az', az: 0 }]] as Break[][])
      for (const where of ['s3-standard', 'ebs'] as const) {
        expect(describeCopies(where, true, b)).not.toMatch(/data center is out|drawn as one data center/)
        expect(statusLine(where, true, b)).not.toMatch(/data center/i)
      }
  })

  it('offers every bucket step as a keyboard control, with drag only as an extra', () => {
    const html = renderToStaticMarkup(<BucketMaker />)
    expect(html).toMatch(/<input[^>]*id="[^"]+"/)
    const radios = new Set([...html.matchAll(/type="radio"[^>]*value="([^"]*)"/g)].map((m) => m[1]))
    for (const v of ['', 'menu/', 'receipts/', 'delivery/']) expect(radios).toContain(v)
    expect(html).toMatch(/role="switch"/)
    expect(html).toMatch(/>Upload</)
    expect(html).toMatch(/draggable="true"/)
  })

  it('adds only its own glossary keys', () => {
    expect(Object.keys(terms).sort()).toEqual(['globally-unique-name', 'metadata'])
  })
})
