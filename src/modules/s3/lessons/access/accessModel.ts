/**
 * Lesson 2 model: who can read Mealhop's files.
 * Lesson 6 may import `decide`, `leaks` and `solution`; keep their signatures stable.
 */

export type Who = 'server-role' | 'customer-1042' | 'stranger' | 'bot'

/** One request knocking on the bucket. `viaLink` means it carries the presigned link for order 1042. */
export interface Req {
  id: string
  who: Who
  action: 'get' | 'list'
  key?: string
  viaLink?: boolean
}

/** Customer #1042's own receipt: the one file the link is for. */
export const OWN_RECEIPT = 'receipts/order-1042.pdf'

export const REQUESTS: Req[] = [
  { id: 'role-menu', who: 'server-role', action: 'get', key: 'menu/dosa.jpg' },
  { id: 'customer-own', who: 'customer-1042', action: 'get', key: OWN_RECEIPT, viaLink: true },
  { id: 'customer-other', who: 'customer-1042', action: 'get', key: 'receipts/order-1043.pdf', viaLink: true },
  { id: 'stranger-list', who: 'stranger', action: 'list' },
  { id: 'bot-receipt', who: 'bot', action: 'get', key: OWN_RECEIPT },
]

/** Should this request get in? Only the servers, and customer #1042 for their own receipt. */
export const wanted = (r: Req): boolean => r.who === 'server-role' || (r.who === 'customer-1042' && r.key === OWN_RECEIPT)

export type Prefix = 'menu' | 'receipts'

export interface AccessConfig {
  /** The bucket-level safety switch. On for every new bucket. */
  blockPublicAccess: boolean
  /** A bucket policy statement letting anyone read and list. Works only with Block Public Access off. */
  publicRead: boolean
  /** The server role's IAM policy: which prefixes it may read. */
  roleRead: Record<Prefix, boolean>
  /** A bucket policy statement denying everyone `receipts/`. */
  denyReceipts: boolean
  /** A presigned link the servers signed with their role, for one key. `minutes` is how long it was asked to last. */
  link: { key: string; minutes: number } | null
}

/**
 * Links signed with an EC2 instance profile's temporary credentials (Mealhop's server role) are valid
 * for up to 6 hours, because a link stops working when the credentials that signed it expire.
 * (A long-term IAM user key allows up to 7 days; Mealhop never stores one.)
 */
export const ROLE_LINK_MAX_MINUTES = 360

/** Lifetimes the learner can pick for a link: 15 minutes, 1 hour, 6 hours. */
export const LINK_CHOICES = [15, 60, 360] as const
export type LinkChoice = (typeof LINK_CHOICES)[number]

export type Reason =
  | 'private-by-default'
  | 'role-allows'
  | 'link-ok'
  | 'link-expired'
  | 'link-other-file'
  | 'signer-cannot-read'
  | 'public'
  | 'bpa-blocks-public'
  | 'explicit-deny'

export interface Decision {
  allowed: boolean
  reason: Reason
}

/** A brand-new bucket: Block Public Access on, nothing public, nobody given access. */
export const NEW_BUCKET: AccessConfig = {
  blockPublicAccess: true,
  publicRead: false,
  roleRead: { menu: false, receipts: false },
  denyReceipts: false,
  link: null,
}

/** The link the servers sign for customer #1042 in the request gate. */
export const RECEIPT_LINK = { key: OWN_RECEIPT, minutes: 60 } as const

export function prefixOf(key: string | undefined): Prefix | null {
  if (key?.startsWith('menu/')) return 'menu'
  if (key?.startsWith('receipts/')) return 'receipts'
  return null
}

/** The minute a link stops working: its own lifetime, but never past the role's limit. */
export const linkExpiresAt = (link: { minutes: number }) => Math.min(link.minutes, ROLE_LINK_MAX_MINUTES)

/** Can the server role itself read this prefix? Its IAM policy must allow it and no explicit deny may cover it. */
export const roleCanRead = (c: AccessConfig, p: Prefix) => c.roleRead[p] && !(p === 'receipts' && c.denyReceipts)

const allow = (reason: Reason): Decision => ({ allowed: true, reason })
const deny = (reason: Reason): Decision => ({ allowed: false, reason })

/**
 * Does this request get in, and why? `nowMinutes` is minutes since the link was signed.
 * Rules, in order:
 *  1. An explicit deny wins.
 *  2. A public policy only works with Block Public Access off.
 *  3. The role reads by prefix.
 *  4. A link works only for its own key, before it expires, and only if the role (the signer) can read that prefix.
 *  5. Anything else is denied ("private by default"); a public policy that Block Public Access stopped is named.
 */
export function decide(r: Req, c: AccessConfig, nowMinutes: number): Decision {
  const prefix = prefixOf(r.key)

  if (c.denyReceipts && prefix === 'receipts') return deny('explicit-deny')

  if (c.publicRead && !c.blockPublicAccess) return allow('public')

  if (r.who === 'server-role' && r.action === 'get' && prefix && c.roleRead[prefix]) return allow('role-allows')

  if (r.viaLink && c.link) {
    if (r.key !== c.link.key) return deny('link-other-file')
    if (nowMinutes >= linkExpiresAt(c.link)) return deny('link-expired')
    const signed = prefixOf(c.link.key)
    if (!signed || !c.roleRead[signed]) return deny('signer-cannot-read')
    return allow('link-ok')
  }

  return deny(c.publicRead ? 'bpa-blocks-public' : 'private-by-default')
}

/** How many requests got in that should have stayed out. */
export const leaks = (c: AccessConfig, nowMinutes: number) =>
  REQUESTS.filter((r) => !wanted(r) && decide(r, c, nowMinutes).allowed).length

export const requestById = (id: string) => REQUESTS.find((r) => r.id === id)!

export interface Checks {
  /** The servers read menu/ and receipts/ through their role. */
  serversRead: boolean
  /** Customer #1042 downloads their own receipt through a link the servers signed. */
  customerOwnReceipt: boolean
  /** Nobody else reads or lists anything: 0 leaked. */
  nobodyElse: boolean
  /** Block Public Access is on and no public policy is in place. */
  privateBucket: boolean
}

/** The challenge's live checklist ("Right people only"). */
export function checks(c: AccessConfig, nowMinutes: number): Checks {
  return {
    serversRead: roleCanRead(c, 'menu') && roleCanRead(c, 'receipts'),
    customerOwnReceipt: decide(requestById('customer-own'), c, nowMinutes).reason === 'link-ok',
    nobodyElse: leaks(c, nowMinutes) === 0,
    privateBucket: c.blockPublicAccess && !c.publicRead,
  }
}

export function solved(c: AccessConfig, nowMinutes: number): boolean {
  return Object.values(checks(c, nowMinutes)).every(Boolean)
}

export const solution: AccessConfig = {
  blockPublicAccess: true,
  publicRead: false,
  roleRead: { menu: true, receipts: true },
  denyReceipts: false,
  link: { ...RECEIPT_LINK },
}

/** Where the challenge starts: someone opened the bucket to the public to share receipts. */
export const challengeStart: AccessConfig = {
  blockPublicAccess: false,
  publicRead: true,
  roleRead: { menu: true, receipts: false },
  denyReceipts: false,
  link: null,
}

/** Minutes after the link is signed at which the request gate's requests arrive. */
export const GATE_NOW = 5
