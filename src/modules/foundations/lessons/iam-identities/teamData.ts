import { Eye, Receipt, Server, Trash, UserCog } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/*
  Data for "Try it: set up the team".
  The policy-to-capability mapping follows the real JSON of each AWS managed
  policy (AWS Managed Policy Reference, checked October 2026). It is simplified:
  we test one sample action per capability.
*/

export type CapId = 'launch' | 'read' | 'delete' | 'bills' | 'users'
export type PolicyId =
  | 'AdministratorAccess'
  | 'PowerUserAccess'
  | 'ReadOnlyAccess'
  | 'AmazonEC2FullAccess'
  | 'AmazonS3FullAccess'
  | 'AmazonS3ReadOnlyAccess'
  | 'Billing'
export type GroupId = 'Admins' | 'Developers' | 'Analysts' | 'Finance' | 'ReadOnly'
export type PersonId = 'ada' | 'priya' | 'marcus' | 'lena' | 'sam'

export interface Capability {
  id: CapId
  label: string
  service: string
  /** The one sample API action this simulation checks */
  action: string
  icon: LucideIcon
}

export const capabilities: Capability[] = [
  { id: 'launch', label: 'Launch servers', service: 'EC2', action: 'ec2:RunInstances', icon: Server },
  { id: 'read', label: 'Read files', service: 'S3', action: 's3:GetObject', icon: Eye },
  { id: 'delete', label: 'Delete files', service: 'S3', action: 's3:DeleteObject', icon: Trash },
  { id: 'bills', label: 'View bills', service: 'Billing', action: 'billing:GetBillingData', icon: Receipt },
  { id: 'users', label: 'Manage users', service: 'IAM', action: 'iam:CreateUser', icon: UserCog },
]

export const capIds: CapId[] = capabilities.map((c) => c.id)
export const capById = Object.fromEntries(capabilities.map((c) => [c.id, c])) as Record<CapId, Capability>

export interface PolicyInfo {
  id: PolicyId
  kind: string
  /** What it allows, in plain words */
  plain: string
  /** For each capability it allows: which part of the policy matches */
  grants: Partial<Record<CapId, string>>
  /** For capabilities it does NOT allow: a short note on why (shown in explanations) */
  misses?: Partial<Record<CapId, string>>
}

export const policies: PolicyInfo[] = [
  {
    id: 'AdministratorAccess',
    kind: 'AWS managed',
    plain: 'Every action on every resource. Meant only for the account administrator.',
    grants: {
      launch: '"Action": "*" matches every action',
      read: '"Action": "*" matches every action',
      delete: '"Action": "*" matches every action',
      bills: '"Action": "*" matches every action',
      users: '"Action": "*" matches every action',
    },
  },
  {
    id: 'PowerUserAccess',
    kind: 'AWS managed',
    plain:
      'Almost every service, but it cannot manage IAM users and groups, AWS Organizations or account settings. It can still manage IAM Identity Center.',
    grants: {
      launch: 'every action is allowed except iam:*, organizations:* and account:*',
      read: 'every action is allowed except iam:*, organizations:* and account:*',
      delete: 'every action is allowed except iam:*, organizations:* and account:*',
      bills: 'every action is allowed except iam:*, organizations:* and account:*',
    },
    misses: {
      users:
        'PowerUserAccess leaves out iam:* apart from a few actions such as iam:ListRoles, so iam:CreateUser is not allowed. (It does allow IAM Identity Center actions, so it could still create Identity Center sign-ins.)',
    },
  },
  {
    id: 'ReadOnlyAccess',
    kind: 'AWS managed',
    plain: 'Look at almost everything in every service, including file contents and bills. Change nothing.',
    grants: {
      read: 's3:Get* matches s3:GetObject',
      bills: 'billing:GetBillingData is on its list',
    },
    misses: {
      delete: 'ReadOnlyAccess allows s3:Get* and s3:List*, which read but never delete.',
      launch: 'ReadOnlyAccess allows ec2:Describe* and ec2:Get*, which look at servers but cannot start one.',
      users: 'ReadOnlyAccess allows iam:Get* and iam:List*, which look at users but cannot create one.',
    },
  },
  {
    id: 'AmazonEC2FullAccess',
    kind: 'AWS managed',
    plain: 'Full control of EC2 servers and a few closely related services.',
    grants: {
      launch: 'ec2:* matches ec2:RunInstances',
    },
  },
  {
    id: 'AmazonS3FullAccess',
    kind: 'AWS managed',
    plain: 'Full control of S3 buckets and files, including deleting them.',
    grants: {
      read: 's3:* matches every S3 action',
      delete: 's3:* matches every S3 action',
    },
  },
  {
    id: 'AmazonS3ReadOnlyAccess',
    kind: 'AWS managed',
    plain: 'List and read every S3 bucket and file in the account. Nothing else.',
    grants: {
      read: 's3:Get* matches s3:GetObject',
    },
    misses: {
      delete:
        'AmazonS3ReadOnlyAccess allows only read actions (s3:Get*, s3:List*, s3:Describe* and the matching S3 Object Lambda read actions), so s3:DeleteObject is not allowed.',
    },
  },
  {
    id: 'Billing',
    kind: 'AWS managed',
    plain: 'See and manage bills, budgets and payment methods.',
    grants: {
      bills: 'billing:GetBillingData is on its list',
    },
  },
]

export const policyById = Object.fromEntries(policies.map((p) => [p.id, p])) as Record<PolicyId, PolicyInfo>

export interface GroupInfo {
  id: GroupId
  purpose: string
}

export const groups: GroupInfo[] = [
  { id: 'Admins', purpose: 'People who run the whole account' },
  { id: 'Developers', purpose: 'People who build the app' },
  { id: 'Analysts', purpose: 'People who study the data' },
  { id: 'Finance', purpose: 'People who pay the bills' },
  { id: 'ReadOnly', purpose: 'People who only look around' },
]

export const groupIds: GroupId[] = groups.map((g) => g.id)

export interface Person {
  id: PersonId
  name: string
  role: string
  job: string
  /** Possessive pronoun, for sentences like "her job" */
  their: 'her' | 'his'
  /** The most this person's job needs. Anything beyond this breaks least privilege. */
  needs: CapId[]
}

export const people: Person[] = [
  {
    id: 'ada',
    name: 'Ada',
    role: 'cloud admin',
    job: 'Runs the AWS account and creates sign-ins for new staff.',
    their: 'her',
    needs: ['launch', 'read', 'delete', 'bills', 'users'],
  },
  {
    id: 'priya',
    name: 'Priya',
    role: 'developer',
    job: 'Builds the app: starts test servers and uploads and deletes files.',
    their: 'her',
    needs: ['launch', 'read', 'delete'],
  },
  {
    id: 'marcus',
    name: 'Marcus',
    role: 'data analyst',
    job: 'Reads sales data files in S3. Never changes them.',
    their: 'his',
    needs: ['read'],
  },
  {
    id: 'lena',
    name: 'Lena',
    role: 'finance',
    job: 'Checks the monthly bill, sets budgets and keeps the payment card up to date.',
    their: 'her',
    needs: ['bills'],
  },
  {
    id: 'sam',
    name: 'Sam',
    role: 'summer intern',
    job: 'Looks around every service, including the monthly bill, to learn. Must not change anything.',
    their: 'his',
    needs: ['read', 'bills'],
  },
]

export const personById = Object.fromEntries(people.map((p) => [p.id, p])) as Record<PersonId, Person>

/* ------------------------------------------------------------------ State */

export interface TeamState {
  members: Record<PersonId, GroupId[]>
  attached: Record<GroupId, PolicyId[]>
}

export const emptyTeam = (): TeamState => ({
  members: { ada: [], priya: [], marcus: [], lena: [], sam: [] },
  attached: { Admins: [], Developers: [], Analysts: [], Finance: [], ReadOnly: [] },
})

export const suggestedTeam = (): TeamState => ({
  members: { ada: ['Admins'], priya: ['Developers'], marcus: ['Analysts'], lena: ['Finance'], sam: ['ReadOnly'] },
  attached: {
    Admins: ['AdministratorAccess'],
    Developers: ['AmazonEC2FullAccess', 'AmazonS3FullAccess'],
    Analysts: ['AmazonS3ReadOnlyAccess'],
    Finance: ['Billing'],
    ReadOnly: ['ReadOnlyAccess'],
  },
})

/** Add or remove an item, keeping the order of `order` so the UI stays stable. */
export function toggleIn<T>(list: T[], item: T, order: T[]): T[] {
  const has = list.includes(item)
  const next = has ? list.filter((x) => x !== item) : [...list, item]
  return order.filter((x) => next.includes(x))
}

/* ------------------------------------------------------------ Evaluation */

export interface Grant {
  group: GroupId
  policy: PolicyId
}

export type Effective = Record<PersonId, Record<CapId, Grant[]>>

/** For every person and capability, the group-policy pairs that allow it. */
export function computeEffective(state: TeamState): Effective {
  const out = {} as Effective
  for (const p of people) {
    const row: Record<CapId, Grant[]> = { launch: [], read: [], delete: [], bills: [], users: [] }
    for (const g of state.members[p.id]) {
      for (const pol of state.attached[g]) {
        for (const cap of capIds) {
          if (policyById[pol].grants[cap]) row[cap].push({ group: g, policy: pol })
        }
      }
    }
    out[p.id] = row
  }
  return out
}

export const allowed = (eff: Effective, person: PersonId, cap: CapId) => eff[person][cap].length > 0

/** Capabilities a person has that their job does not need. */
export function extras(eff: Effective, person: PersonId): CapId[] {
  const needs = personById[person].needs
  return capIds.filter((c) => allowed(eff, person, c) && !needs.includes(c))
}

/** Every policy that reaches a person through their groups. */
export function policiesFor(state: TeamState, person: PersonId): PolicyId[] {
  const set = new Set<PolicyId>()
  for (const g of state.members[person]) for (const p of state.attached[g]) set.add(p)
  return policies.map((p) => p.id).filter((id) => set.has(id))
}

/* --------------------------------------------------------------- Missions */

export interface Mission {
  id: string
  text: string
  check: (eff: Effective) => boolean
}

const a = allowed

export const missions: Mission[] = [
  {
    id: 'ada',
    text: 'Ada can manage users, and nobody else can.',
    check: (e) => a(e, 'ada', 'users') && people.every((p) => p.id === 'ada' || !a(e, p.id, 'users')),
  },
  {
    id: 'priya',
    text: 'Priya can launch servers, read files and delete files.',
    check: (e) => a(e, 'priya', 'launch') && a(e, 'priya', 'read') && a(e, 'priya', 'delete'),
  },
  {
    id: 'marcus',
    text: 'Marcus can read files but cannot delete them.',
    check: (e) => a(e, 'marcus', 'read') && !a(e, 'marcus', 'delete'),
  },
  {
    id: 'lena',
    text: 'Lena can view the bills.',
    check: (e) => a(e, 'lena', 'bills'),
  },
  {
    id: 'sam',
    text: 'Sam can look but not change anything: he can read files, but cannot launch servers, delete files or manage users.',
    check: (e) => a(e, 'sam', 'read') && !a(e, 'sam', 'launch') && !a(e, 'sam', 'delete') && !a(e, 'sam', 'users'),
  },
]

/* -------------------------------------------------------- Least privilege */

export interface LpWarning {
  person: PersonId
  severity: 'high' | 'medium'
  text: string
}

const list = (items: string[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`

export function leastPrivilegeWarnings(state: TeamState, eff: Effective): LpWarning[] {
  const out: LpWarning[] = []
  for (const p of people) {
    if (p.id === 'ada') continue
    const pols = policiesFor(state, p.id)
    const extra = extras(eff, p.id).map((c) => capById[c].label.toLowerCase())
    if (pols.includes('AdministratorAccess')) {
      out.push({
        person: p.id,
        severity: 'high',
        text: `${p.name} has AdministratorAccess. ${p.their === 'her' ? 'She' : 'He'} can do almost anything in the account, including deleting every file and creating new sign-ins. If ${p.their} password leaks, an attacker gets all of that too.`,
      })
      continue
    }
    if (extra.length > 0) {
      let text = `${p.name} can also ${list(extra)}, which ${p.their} job does not need.`
      if (pols.includes('PowerUserAccess')) text += ' PowerUserAccess also opens almost every other AWS service, far beyond this table.'
      out.push({ person: p.id, severity: 'medium', text })
    } else if (pols.includes('PowerUserAccess')) {
      out.push({
        person: p.id,
        severity: 'medium',
        text: `${p.name} has PowerUserAccess, which opens almost every AWS service. A narrower policy would cover ${p.their} job.`,
      })
    }
  }
  return out
}
