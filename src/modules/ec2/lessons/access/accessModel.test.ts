import { describe, expect, it } from 'vitest'
import {
  addRule,
  challengeStart,
  checks,
  inboundAllowed,
  NEW_GROUP_RULES,
  outboundAllowedByDefault,
  removeRule,
  replyAllowed,
  REQUESTS,
  ruleMatches,
  solution,
  solved,
  type Rule,
} from './accessModel'

const byWho = (who: string) => REQUESTS.find((r) => r.who === who)!

describe('security group rules', () => {
  it('a new group lets nothing in', () => {
    expect(REQUESTS.some((r) => inboundAllowed(NEW_GROUP_RULES, r))).toBe(false)
  })

  it('a new group allows all outbound traffic', () => {
    expect(outboundAllowedByDefault).toBe(true)
  })

  it('office-only SSH blocks the bot but lets the owner in', () => {
    const rules: Rule[] = [{ port: 22, source: 'office' }]
    expect(inboundAllowed(rules, byWho('bot'))).toBe(false)
    expect(inboundAllowed(rules, byWho('owner'))).toBe(true)
  })

  it('anywhere includes the office', () => {
    expect(inboundAllowed([{ port: 22, source: 'anywhere' }], byWho('owner'))).toBe(true)
  })

  it('a rule only opens its own port', () => {
    const rules: Rule[] = [{ port: 443, source: 'anywhere' }]
    expect(inboundAllowed(rules, byWho('customer'))).toBe(true)
    expect(inboundAllowed(rules, byWho('prober'))).toBe(false)
  })

  it('replies to allowed requests go out without an outbound rule', () => {
    expect(replyAllowed([{ port: 443, source: 'anywhere' }], byWho('customer'))).toBe(true)
  })

  it('blocked requests get no reply', () => {
    expect(replyAllowed([], byWho('customer'))).toBe(false)
  })

  it('tells which requests one rule lets in', () => {
    const sshAnywhere: Rule = { port: 22, source: 'anywhere' }
    expect(REQUESTS.filter((r) => ruleMatches(sshAnywhere, r)).map((r) => r.who)).toEqual(['bot', 'owner'])
  })
})

describe('editing rules', () => {
  it('adds a rule once', () => {
    const once = addRule([], { port: 443, source: 'anywhere' })
    expect(addRule(once, { port: 443, source: 'anywhere' })).toBe(once)
    expect(once).toEqual([{ port: 443, source: 'anywhere' }])
  })

  it('removes a rule by position', () => {
    expect(removeRule(solution.rules, 0)).toEqual([{ port: 22, source: 'office' }])
  })
})

describe('the challenge', () => {
  it('SSH from anywhere fails sshOfficeOnly', () => {
    expect(
      checks(
        [
          { port: 443, source: 'anywhere' },
          { port: 22, source: 'anywhere' },
        ],
        'role',
      ).sshOfficeOnly,
    ).toBe(false)
  })

  it('an open database port fails nothingElse', () => {
    expect(checks([...solution.rules, { port: 5432, source: 'anywhere' }], 'role').nothingElse).toBe(false)
  })

  it('an extra rule nobody needs is not solved', () => {
    const extra: Rule = { port: 5432, source: 'office' }
    expect(checks([...solution.rules, extra], 'role').nothingElse).toBe(false)
    expect(solved(checks([...solution.rules, extra], 'role'))).toBe(false)
  })

  it('HTTPS from the office alone is an unused rule', () => {
    expect(solved(checks([...solution.rules, { port: 443, source: 'office' }], 'role'))).toBe(false)
  })

  it('an access key on the server fails photosWithoutKey', () => {
    expect(checks(solution.rules, 'access-key').photosWithoutKey).toBe(false)
  })

  it('no way to reach the photos fails photosWithoutKey', () => {
    expect(checks(solution.rules, null).photosWithoutKey).toBe(false)
  })

  it('a new group fails customersIn', () => {
    expect(checks(NEW_GROUP_RULES, 'role').customersIn).toBe(false)
  })

  it('starts with every check failing', () => {
    expect(Object.values(checks(challengeStart.rules, challengeStart.photos))).toEqual([false, false, false, false])
  })

  it('the solution passes', () => {
    expect(solved(checks(solution.rules, solution.photos))).toBe(true)
  })

  it('the solution lets in exactly the wanted requests', () => {
    expect(REQUESTS.map((r) => inboundAllowed(solution.rules, r))).toEqual(REQUESTS.map((r) => r.wanted))
  })
})
