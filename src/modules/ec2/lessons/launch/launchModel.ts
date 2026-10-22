/** The five parts the learner chooses before pressing Launch, in the order the builder shows them. */
export type LaunchPart = 'ami' | 'instanceType' | 'keyPair' | 'securityGroup' | 'storage'

export const PARTS: LaunchPart[] = ['ami', 'instanceType', 'keyPair', 'securityGroup', 'storage']

/** A launch being put together. `null` means "not chosen yet". `keyPair: 'none'` is a real choice (launch without a key). */
export interface LaunchConfig {
  ami: string | null
  instanceType: string | null
  keyPair: string | 'none' | null
  securityGroup: { web: boolean; sshFromAnywhere: boolean } | null
  storageGiB: number | null
}

/**
 * The real launch page fills in defaults; the builder starts empty so the learner chooses each part.
 * Nothing here claims AWS refuses a launch: a missing part is simply a choice still to make.
 */
export const emptyConfig: LaunchConfig = {
  ami: null,
  instanceType: null,
  keyPair: null,
  securityGroup: null,
  storageGiB: null,
}

/** Parts not chosen yet, in builder order. */
export function missingParts(c: LaunchConfig): LaunchPart[] {
  const chosen: Record<LaunchPart, boolean> = {
    ami: c.ami !== null,
    instanceType: c.instanceType !== null,
    keyPair: c.keyPair !== null,
    securityGroup: c.securityGroup !== null,
    storage: c.storageGiB !== null,
  }
  return PARTS.filter((p) => !chosen[p])
}

/** The instance's life in this lesson. Later states (stopped, terminated) come in lesson 3. */
export type InstanceState = 'not-launched' | 'pending' | 'running'

/** Launch starts a complete, not-yet-launched config; boot-complete finishes a pending one. Anything else is ignored. */
export function transition(s: InstanceState, a: 'launch' | 'boot-complete', c: LaunchConfig): InstanceState {
  if (a === 'launch') return s === 'not-launched' && missingParts(c).length === 0 ? 'pending' : s
  return s === 'pending' ? 'running' : s
}

/** Customers' browsers reach the menu page only when the instance runs and its security group lets web traffic in. */
export function menuReachable(c: LaunchConfig, s: InstanceState): boolean {
  return s === 'running' && c.securityGroup?.web === true
}

/** What "Show me" applies. Any AMI, type, key choice and size works; the security group must let web traffic in. */
export const solution: LaunchConfig = {
  ami: 'amazon-linux',
  instanceType: 't3.micro',
  keyPair: 'mealhop-key',
  securityGroup: { web: true, sshFromAnywhere: false },
  storageGiB: 8,
}

/* ------------------------------------------------------------- Choices */

export const AMIS = [
  { value: 'amazon-linux', label: 'Amazon Linux' },
  { value: 'ubuntu', label: 'Ubuntu' },
  { value: 'debian', label: 'Debian' },
] as const

/** Real sizes (virtual CPUs, memory in GiB). Each step up roughly doubles, which lesson 2 explores. */
export const INSTANCE_TYPES = [
  { value: 't3.micro', vcpu: 2, memGiB: 1 },
  { value: 'm5.large', vcpu: 2, memGiB: 8 },
  { value: 'm5.xlarge', vcpu: 4, memGiB: 16 },
] as const

export const KEY_PAIR_NAME = 'mealhop-key'

/** Security group choices, as the inbound rules they create. */
export const SECURITY_GROUPS = {
  nothing: { web: false, sshFromAnywhere: false },
  ssh: { web: false, sshFromAnywhere: true },
  web: { web: true, sshFromAnywhere: false },
  'web-ssh': { web: true, sshFromAnywhere: true },
} as const satisfies Record<string, NonNullable<LaunchConfig['securityGroup']>>

export type SecurityGroupChoice = keyof typeof SECURITY_GROUPS

/** Which named choice a config's security group matches, or '' when none is chosen. */
export function securityGroupChoice(sg: LaunchConfig['securityGroup']): SecurityGroupChoice | '' {
  if (!sg) return ''
  if (sg.web) return sg.sshFromAnywhere ? 'web-ssh' : 'web'
  return sg.sshFromAnywhere ? 'ssh' : 'nothing'
}

/** Root volume sizes in GiB. The Linux images above start from an 8 GiB root volume, so all of these fit. */
export const STORAGE_SIZES = [8, 20, 50] as const
