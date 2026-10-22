/** Where the "rent a slice of a server" visual is: one whole server, split into instances, or one of them rented by you. */
export type HostStage = 'whole' | 'split' | 'rented'

export type HostAction = 'split' | 'rent'

/** Split turns a whole server into instances; Rent takes the free one (splitting first if needed). Never goes backwards. */
export function hostStep(stage: HostStage, action: HostAction): HostStage {
  if (action === 'rent') return 'rented'
  return stage === 'whole' ? 'split' : stage
}

/** One instance on the host. `units` is its width: instances come in different sizes. */
export interface Slot {
  id: string
  owner: 'other' | 'you'
  /** Short label drawn on the block. The free slot shows "Free" until you rent it. */
  label: string
  units: number
}

/** Left to right on the host. Yours sits between strangers' instances, kept apart by the hypervisor. */
export const SLOTS: Slot[] = [
  { id: 'a', owner: 'other', label: 'A', units: 2 },
  { id: 'b', owner: 'other', label: 'B', units: 1 },
  { id: 'you', owner: 'you', label: 'You', units: 1 },
  { id: 'c', owner: 'other', label: 'C', units: 1 },
]

export const TOTAL_UNITS = SLOTS.reduce((n, s) => n + s.units, 0)
