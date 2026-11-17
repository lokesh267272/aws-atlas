import { describe, expect, it } from 'vitest'
import {
  challengeStart,
  checks,
  decide,
  leaks,
  LINK_CHOICES,
  linkExpiresAt,
  NEW_BUCKET,
  OWN_RECEIPT,
  REQUESTS,
  ROLE_LINK_MAX_MINUTES,
  solution,
  solved,
  wanted,
  type AccessConfig,
  type Req,
} from './accessModel'

const at = 30
const closed: AccessConfig = NEW_BUCKET
const byId = (id: string) => REQUESTS.find((r) => r.id === id)!
const roleReq = byId('role-menu')
const customerReq = byId('customer-own')
const otherFileReq = byId('customer-other')
const strangerReq = byId('stranger-list')
const botReq = byId('bot-receipt')
const publicOpen: AccessConfig = { ...closed, publicRead: true, blockPublicAccess: false }

describe('the requests', () => {
  it('are the five from the story, in order', () => {
    expect(REQUESTS.map((r) => [r.who, r.action, r.key ?? null, r.viaLink ?? false])).toEqual([
      ['server-role', 'get', 'menu/dosa.jpg', false],
      ['customer-1042', 'get', 'receipts/order-1042.pdf', true],
      ['customer-1042', 'get', 'receipts/order-1043.pdf', true],
      ['stranger', 'list', null, false],
      ['bot', 'get', 'receipts/order-1042.pdf', false],
    ])
  })

  it('only the servers and the customer’s own receipt should get in', () => {
    expect(REQUESTS.filter(wanted).map((r) => r.id)).toEqual(['role-menu', 'customer-own'])
  })
})

describe('decide', () => {
  it('a new bucket lets nobody in', () => {
    REQUESTS.forEach((r) => expect(decide(r, closed, at).allowed).toBe(false))
    REQUESTS.forEach((r) => expect(decide(r, closed, at).reason).toBe('private-by-default'))
  })

  it('a new bucket has Block Public Access on and no public policy', () => {
    expect(closed.blockPublicAccess).toBe(true)
    expect(closed.publicRead).toBe(false)
  })

  it('Block Public Access stops a public policy', () => {
    expect(leaks({ ...closed, publicRead: true }, at)).toBe(0)
    expect(decide(botReq, { ...closed, publicRead: true }, at).reason).toBe('bpa-blocks-public')
  })

  it('public with Block Public Access off leaks receipts', () => {
    expect(leaks(publicOpen, at)).toBeGreaterThan(0)
    expect(decide(botReq, publicOpen, at)).toEqual({ allowed: true, reason: 'public' })
  })

  it('a public bucket lets a stranger list every file and a customer read another receipt', () => {
    expect(decide(strangerReq, publicOpen, at).allowed).toBe(true)
    expect(decide(otherFileReq, publicOpen, at).allowed).toBe(true)
    expect(leaks(publicOpen, at)).toBe(3)
  })

  it('the role reads only the prefixes its policy names', () => {
    expect(decide(roleReq, { ...closed, roleRead: { menu: false, receipts: true } }, at).reason).toBe('private-by-default')
    expect(decide(roleReq, { ...closed, roleRead: { menu: true, receipts: false } }, at)).toEqual({ allowed: true, reason: 'role-allows' })
  })

  it('the role’s access lets no one else in', () => {
    const c = { ...closed, roleRead: { menu: true, receipts: true } }
    expect(REQUESTS.filter((r) => decide(r, c, at).allowed).map((r) => r.id)).toEqual(['role-menu'])
  })

  it('a customer with no link stays out', () => {
    expect(decide(customerReq, { ...solution, link: null }, at).reason).toBe('private-by-default')
  })

  it('a link opens its own file', () => {
    expect(decide(customerReq, solution, at)).toEqual({ allowed: true, reason: 'link-ok' })
  })

  it('a link only opens its own file', () => {
    expect(decide(otherFileReq, solution, at).reason).toBe('link-other-file')
  })

  it('a link dies when it expires', () => {
    expect(decide(customerReq, solution, solution.link!.minutes + 1).reason).toBe('link-expired')
  })

  it('a link works up to its last minute and is dead at its lifetime', () => {
    expect(decide(customerReq, solution, solution.link!.minutes - 1).reason).toBe('link-ok')
    expect(decide(customerReq, solution, solution.link!.minutes).reason).toBe('link-expired')
  })

  it('a link signed by a role that cannot read receipts fails', () => {
    expect(decide(customerReq, { ...solution, roleRead: { menu: true, receipts: false } }, at).reason).toBe('signer-cannot-read')
  })

  it('an explicit deny beats the role and the link', () => {
    const c = { ...solution, denyReceipts: true }
    expect(decide(customerReq, c, at).reason).toBe('explicit-deny')
  })

  it('an explicit deny beats a public policy too', () => {
    expect(decide(botReq, { ...publicOpen, denyReceipts: true }, at).reason).toBe('explicit-deny')
  })

  it('a deny on receipts/ leaves menu/ alone', () => {
    expect(decide(roleReq, { ...solution, denyReceipts: true }, at).reason).toBe('role-allows')
  })

  it('a bot without a link gets nothing from a correct setup', () => {
    expect(decide(botReq, solution, at).reason).toBe('private-by-default')
  })
})

describe('link lifetimes', () => {
  it('no link can outlive the role limit', () => {
    expect(Math.max(...LINK_CHOICES)).toBeLessThanOrEqual(ROLE_LINK_MAX_MINUTES)
  })

  it('the role limit is 6 hours', () => {
    expect(ROLE_LINK_MAX_MINUTES).toBe(360)
  })

  it('a role-signed link asked to last longer still dies at 6 hours', () => {
    const week: AccessConfig = { ...solution, link: { key: OWN_RECEIPT, minutes: 7 * 24 * 60 } }
    expect(linkExpiresAt(week.link!)).toBe(ROLE_LINK_MAX_MINUTES)
    expect(decide(customerReq, week, ROLE_LINK_MAX_MINUTES - 1).reason).toBe('link-ok')
    expect(decide(customerReq, week, ROLE_LINK_MAX_MINUTES + 1).reason).toBe('link-expired')
  })
})

describe('the challenge', () => {
  it('the solution is solved with zero leaks', () => {
    expect(solved(solution, at)).toBe(true)
    expect(leaks(solution, at)).toBe(0)
  })

  it('the solution keeps the bucket private: Block Public Access on, nothing public, no deny needed', () => {
    expect(solution.blockPublicAccess).toBe(true)
    expect(solution.publicRead).toBe(false)
    expect(solution.denyReceipts).toBe(false)
  })

  it('the solution lets in exactly the wanted requests', () => {
    expect(REQUESTS.map((r) => decide(r, solution, at).allowed)).toEqual(REQUESTS.map(wanted))
  })

  it('starts leaky, with every check failing', () => {
    expect(leaks(challengeStart, at)).toBeGreaterThan(0)
    expect(Object.values(checks(challengeStart, at))).toEqual([false, false, false, false])
  })

  it('making the bucket public never counts as success', () => {
    const everything: AccessConfig = { ...solution, blockPublicAccess: false, publicRead: true }
    expect(solved(everything, at)).toBe(false)
    expect(checks(everything, at).nobodyElse).toBe(false)
    expect(checks(everything, at).privateBucket).toBe(false)
  })

  it('a public policy left behind fails even when Block Public Access hides it', () => {
    const c = { ...solution, publicRead: true }
    expect(leaks(c, at)).toBe(0)
    expect(solved(c, at)).toBe(false)
  })

  it('denying receipts breaks the servers and the customer', () => {
    const c = checks({ ...solution, denyReceipts: true }, at)
    expect(c.serversRead).toBe(false)
    expect(c.customerOwnReceipt).toBe(false)
  })

  it('a role that cannot read receipts fails the servers check and the link', () => {
    const c = checks({ ...solution, roleRead: { menu: true, receipts: false } }, at)
    expect(c.serversRead).toBe(false)
    expect(c.customerOwnReceipt).toBe(false)
  })

  it('an expired link fails the customer check', () => {
    expect(checks(solution, solution.link!.minutes).customerOwnReceipt).toBe(false)
  })

  it('every request in the set is decided without throwing for any config', () => {
    const configs: AccessConfig[] = [closed, publicOpen, solution, challengeStart, { ...publicOpen, denyReceipts: true }]
    const extra: Req = { id: 'role-list', who: 'server-role', action: 'list' }
    configs.forEach((c) => [...REQUESTS, extra].forEach((r) => expect(typeof decide(r, c, at).allowed).toBe('boolean')))
  })
})
