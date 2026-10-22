/**
 * Lesson 4 model: who can reach the server, and how the app reaches its photos.
 * Lesson 6 imports `inboundAllowed`; keep its signature stable.
 */

export type Source = 'anywhere' | 'office'

/** An inbound allow rule. Security groups only allow: there is no deny rule. */
export interface Rule {
  port: number
  source: Source
}

/** One request knocking on the server. `from: 'office'` is the office address; the office is also part of "anywhere". */
export interface Req {
  id: string
  who: string
  port: number
  from: 'internet' | 'office'
  /** Should this request get in? */
  wanted: boolean
}

/** How the app on the server gets into the S3 bucket of menu photos. */
export type PhotosAccess = 'access-key' | 'role' | null

/** The office's public address: an RFC 5737 documentation address, never a real one. */
export const OFFICE_IP = '203.0.113.10'

export const SOURCES: Record<Source, { label: string; cidr: string }> = {
  anywhere: { label: 'Anywhere', cidr: '0.0.0.0/0' },
  office: { label: 'Office', cidr: `${OFFICE_IP}/32` },
}

/** The ports the rule builder offers, one per kind of request. */
export const PORTS: { port: number; name: string }[] = [
  { port: 443, name: 'HTTPS' },
  { port: 22, name: 'SSH' },
  { port: 5432, name: 'Database' },
]

export const portName = (port: number) => PORTS.find((p) => p.port === port)?.name ?? 'Port'

export const REQUESTS: Req[] = [
  { id: 'customer', who: 'customer', port: 443, from: 'internet', wanted: true },
  { id: 'bot', who: 'bot', port: 22, from: 'internet', wanted: false },
  { id: 'owner', who: 'owner', port: 22, from: 'office', wanted: true },
  { id: 'prober', who: 'prober', port: 5432, from: 'internet', wanted: false },
]

/** A security group you create starts with no inbound rules. */
export const NEW_GROUP_RULES: Rule[] = []

/** …and one outbound rule that allows all traffic out. */
export const outboundAllowedByDefault = true as const

/** Does this one rule let `r` in? Same port, and a source that covers where `r` comes from. */
export function ruleMatches(rule: Rule, r: Req): boolean {
  return rule.port === r.port && (rule.source === 'anywhere' || r.from === 'office')
}

/** Rules only allow: a request gets in when at least one rule matches it. Anything else is blocked. */
export function inboundAllowed(rules: Rule[], r: Req): boolean {
  return rules.some((rule) => ruleMatches(rule, r))
}

/** Security groups are stateful: the reply to an allowed request goes back out, whatever the outbound rules say. */
export function replyAllowed(rules: Rule[], r: Req): boolean {
  return inboundAllowed(rules, r)
}

export const sameRule = (a: Rule, b: Rule) => a.port === b.port && a.source === b.source

/** Adds a rule unless an identical one is already there (then returns the same array). */
export function addRule(rules: Rule[], rule: Rule): Rule[] {
  return rules.some((r) => sameRule(r, rule)) ? rules : [...rules, rule]
}

export function removeRule(rules: Rule[], index: number): Rule[] {
  return rules.filter((_, i) => i !== index)
}

const byId = (id: string) => REQUESTS.find((r) => r.id === id)!

export interface Checks {
  customersIn: boolean
  sshOfficeOnly: boolean
  nothingElse: boolean
  photosWithoutKey: boolean
}

/** True when the rule lets in at least one request that should get in. A rule that doesn't is an open door nobody needs. */
export const ruleNeeded = (rule: Rule) => REQUESTS.some((r) => r.wanted && ruleMatches(rule, r))

/** The challenge's live checklist. */
export function checks(rules: Rule[], photos: PhotosAccess): Checks {
  return {
    customersIn: inboundAllowed(rules, byId('customer')),
    sshOfficeOnly: inboundAllowed(rules, byId('owner')) && !inboundAllowed(rules, byId('bot')),
    // Nothing unwanted gets in, and no rule opens a door that no wanted request uses.
    nothingElse: REQUESTS.every((r) => r.wanted || !inboundAllowed(rules, r)) && rules.every(ruleNeeded),
    photosWithoutKey: photos === 'role',
  }
}

export function solved(c: Checks): boolean {
  return c.customersIn && c.sshOfficeOnly && c.nothingElse && c.photosWithoutKey
}

export const solution: { rules: Rule[]; photos: 'role' } = {
  rules: [
    { port: 443, source: 'anywhere' },
    { port: 22, source: 'office' },
  ],
  photos: 'role',
}

/** Where the challenge starts: a setup someone left too open, with a key pasted on the server. */
export const challengeStart: { rules: Rule[]; photos: Exclude<PhotosAccess, null> } = {
  rules: [
    { port: 22, source: 'anywhere' },
    { port: 5432, source: 'anywhere' },
  ],
  photos: 'access-key',
}
