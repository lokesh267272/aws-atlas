import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { checkTextBudget, S3_LIMITS } from '../../../../test/textBudget'
import Lesson from './Lesson'

const html = renderToStaticMarkup(<Lesson />)
/** Visible text; tags are dropped without adding spaces so "key</span>: up" reads "key: up". */
const text = (h: string) => h.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

/** Every switch in the page, in order: its visible label and whether it is on. */
const switches = (h: string) =>
  (h.match(/<label[\s>][\s\S]*?<\/label>/g) ?? [])
    .filter((l) => l.includes('role="switch"'))
    .map((l) => ({ label: text(l), on: /\schecked=""/.test(l) }))
const switchStates = (label: string) => switches(html).filter((s) => s.label === label).map((s) => s.on)

describe('access lesson', () => {
  it('renders the challenge goal and the Send requests button', () => {
    expect(html).toMatch(/Right people only/)
    expect(html).toMatch(/>Send requests</)
  })

  it('stays within the Module 3 text budget', () => {
    expect(checkTextBudget(html, S3_LIMITS)).toEqual([])
  })

  it('has two explanations, with a locked-room and a cinema-ticket comparison', () => {
    expect(html.match(/data-explain=""/g)).toHaveLength(2)
    expect(html).toMatch(/locked room/)
    expect(html).toMatch(/cinema ticket/)
  })

  it('never presents a public bucket as the way to share', () => {
    expect(html).not.toMatch(/make (the bucket|it) public to/i)
  })

  it('does not claim role-signed links last 7 days', () => {
    expect(html).not.toMatch(/role[^.]*7 days/i)
  })

  it('shows the 7-day user-key limit as a tag and the 6-hour role limit', () => {
    expect(text(html)).toMatch(/long-term user key: up to 7 days/i)
    expect(text(html)).toMatch(/about 6 hours at most/)
  })

  it('shows that every new file is encrypted by default', () => {
    expect(text(html)).toMatch(/encrypted at rest by default/i)
  })

  it('shows the five requests and a files-leaked counter in both gates', () => {
    for (const who of ['Servers', 'Customer #1042', 'Stranger', 'Bot']) expect(html).toContain(who)
    expect(html.match(/Files leaked/g)).toHaveLength(2)
  })

  it('the free-play gate starts as a new bucket; the challenge starts open to the public', () => {
    expect(switchStates('Block all public access')).toEqual([true, false])
    expect(switchStates('Make public')).toEqual([false, true])
    expect(switchStates('Make a link for order 1042')).toEqual([false, false])
  })

  it('offers link lifetimes of 15 minutes, 1 hour and 6 hours, with 1 hour picked', () => {
    const radios = html.match(/<input[^>]*type="radio"[^>]*>/g) ?? []
    expect(radios.map((r) => /value="(\d+)"/.exec(r)?.[1])).toEqual(['15', '60', '360'])
    expect(radios.filter((r) => /\schecked=""/.test(r)).map((r) => /value="(\d+)"/.exec(r)?.[1])).toEqual(['60'])
  })

  it('ends with the file store diagram at step 2', () => {
    expect(html).toMatch(/The server role and a link that expires are the only ways in/)
  })
})
