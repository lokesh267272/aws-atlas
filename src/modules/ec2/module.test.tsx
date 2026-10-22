import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { baseGlossary } from '../../course/glossary'
import { getLesson, getModule } from '../../course/registry'
import { foundations } from '../foundations'
import { checkTextBudget } from '../../test/textBudget'
import { ec2 } from './index'
import { SetupDiagram } from './SetupDiagram'

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

  it('keeps the server role outside the VPC', () => {
    const html = renderToStaticMarkup(<SetupDiagram step={4} />)
    expect(html.indexOf('Server role')).toBeGreaterThan(html.indexOf('Snapshot'))
  })
})
