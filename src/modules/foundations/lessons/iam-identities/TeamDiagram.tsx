import { useMemo } from 'react'
import { groupIds, people, policies, type GroupId, type PersonId, type PolicyId, type TeamState } from './teamData'

/*
  Live wiring diagram: people > groups > policies.
  Solid lines mean "is a member of", dashed lines mean "has this policy attached".
  When a person is traced, only their path stays at full strength.
*/

const W = 780
const TOP = 34
const ROW = 42
const H = TOP + policies.length * ROW + 8

const COL = {
  user: { x: 8, w: 168 },
  group: { x: 300, w: 150 },
  policy: { x: 574, w: 198 },
}

const centerY = (i: number, count: number) => TOP + ((i + 0.5) * (policies.length * ROW)) / count

const curve = (x1: number, y1: number, x2: number, y2: number) => {
  const mx = (x1 + x2) / 2
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`
}

export function TeamDiagram({ state, trace }: { state: TeamState; trace: PersonId | null }) {
  const { tracedGroups, tracedPolicies } = useMemo(() => {
    const g = new Set<GroupId>(trace ? state.members[trace] : [])
    const p = new Set<PolicyId>()
    g.forEach((gid) => state.attached[gid].forEach((pid) => p.add(pid)))
    return { tracedGroups: g, tracedPolicies: p }
  }, [state, trace])

  const summary = useMemo(() => {
    const parts: string[] = []
    for (const person of people) {
      const gs = state.members[person.id]
      parts.push(gs.length ? `${person.name} is in ${gs.join(' and ')}.` : `${person.name} is in no group.`)
    }
    for (const g of groupIds) {
      const ps = state.attached[g]
      if (ps.length) parts.push(`${g} has ${ps.join(' and ')}.`)
    }
    return parts.join(' ')
  }, [state])

  const userY = (id: PersonId) => centerY(people.findIndex((p) => p.id === id), people.length)
  const groupY = (id: GroupId) => centerY(groupIds.indexOf(id), groupIds.length)
  const policyY = (id: PolicyId) => centerY(policies.findIndex((p) => p.id === id), policies.length)

  const dim = (on: boolean) => (trace && !on ? 0.18 : 1)

  return (
    <div className="overflow-x-auto rounded-md border border-line bg-paper/60">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Diagram of people, groups and policies. ${summary}`}
        className="block w-full min-w-[640px]"
      >
        {/* Column headings */}
        <text x={COL.user.x} y={18} className="fill-ink-3 text-[13px] font-bold">
          People (IAM users)
        </text>
        <text x={COL.group.x} y={18} className="fill-ink-3 text-[13px] font-bold">
          IAM groups
        </text>
        <text x={COL.policy.x} y={18} className="fill-ink-3 text-[13px] font-bold">
          Policies
        </text>

        {/* Member lines: person > group */}
        {people.flatMap((p) =>
          state.members[p.id].map((g) => {
            const on = trace === p.id
            return (
              <path
                key={`${p.id}-${g}`}
                d={curve(COL.user.x + COL.user.w, userY(p.id), COL.group.x, groupY(g))}
                fill="none"
                stroke={on ? 'var(--color-signal)' : 'var(--color-ink-3)'}
                strokeWidth={on ? 3 : 1.75}
                opacity={dim(on)}
                className="transition-opacity"
              />
            )
          }),
        )}

        {/* Attachment lines: group > policy */}
        {groupIds.flatMap((g) =>
          state.attached[g].map((pid) => {
            const on = tracedGroups.has(g)
            return (
              <path
                key={`${g}-${pid}`}
                d={curve(COL.group.x + COL.group.w, groupY(g), COL.policy.x, policyY(pid))}
                fill="none"
                stroke={on ? 'var(--color-signal)' : 'var(--color-security)'}
                strokeWidth={on ? 3 : 1.75}
                strokeDasharray="6 4"
                opacity={dim(on)}
                className="transition-opacity"
              />
            )
          }),
        )}

        {/* People */}
        {people.map((p) => {
          const y = userY(p.id)
          const lonely = state.members[p.id].length === 0
          const on = trace === p.id
          return (
            <g key={p.id} opacity={dim(on)} className="transition-opacity">
              <rect
                x={COL.user.x}
                y={y - 17}
                width={COL.user.w}
                height={34}
                rx={5}
                fill="var(--color-panel)"
                stroke={on ? 'var(--color-signal)' : 'var(--color-line-strong)'}
                strokeWidth={on ? 2.5 : 1.25}
                strokeDasharray={lonely ? '4 3' : undefined}
              />
              <text x={COL.user.x + 10} y={y - 2} className="fill-ink text-[13px] font-bold">
                {p.name}
              </text>
              <text x={COL.user.x + 10} y={y + 12} className="fill-ink-3 text-[11px]">
                {lonely ? 'no group: no access' : p.role}
              </text>
            </g>
          )
        })}

        {/* Groups */}
        {groupIds.map((g) => {
          const y = groupY(g)
          const on = tracedGroups.has(g)
          const count = state.attached[g].length
          return (
            <g key={g} opacity={dim(on)} className="transition-opacity">
              <rect
                x={COL.group.x}
                y={y - 17}
                width={COL.group.w}
                height={34}
                rx={5}
                fill="var(--color-panel)"
                stroke={on ? 'var(--color-signal)' : 'var(--color-line-strong)'}
                strokeWidth={on ? 2.5 : 1.25}
                strokeDasharray="5 3"
              />
              <text x={COL.group.x + 10} y={y - 2} className="fill-ink text-[13px] font-bold">
                {g}
              </text>
              <text x={COL.group.x + 10} y={y + 12} className="fill-ink-3 text-[11px]">
                {count === 0 ? 'no policies' : count === 1 ? '1 policy' : `${count} policies`}
              </text>
            </g>
          )
        })}

        {/* Policies */}
        {policies.map((pol) => {
          const y = policyY(pol.id)
          const on = tracedPolicies.has(pol.id)
          return (
            <g key={pol.id} opacity={dim(on)} className="transition-opacity">
              <rect
                x={COL.policy.x}
                y={y - 15}
                width={COL.policy.w}
                height={30}
                rx={4}
                fill="var(--color-panel)"
                stroke={on ? 'var(--color-signal)' : 'var(--color-security)'}
                strokeWidth={on ? 2.5 : 1.25}
              />
              <rect x={COL.policy.x} y={y - 15} width={5} height={30} rx={2} fill="var(--color-security)" />
              <text x={COL.policy.x + 13} y={y + 4.5} className="fill-ink text-[12.5px] font-bold">
                {pol.id}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/** Legend for the line styles, drawn in HTML so it wraps on small screens. */
export function DiagramLegend() {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-3">
      <li className="flex items-center gap-2">
        <svg width="28" height="8" aria-hidden>
          <line x1="0" y1="4" x2="28" y2="4" stroke="var(--color-ink-3)" strokeWidth="2" />
        </svg>
        Member of the group
      </li>
      <li className="flex items-center gap-2">
        <svg width="28" height="8" aria-hidden>
          <line x1="0" y1="4" x2="28" y2="4" stroke="var(--color-security)" strokeWidth="2" strokeDasharray="6 4" />
        </svg>
        Policy attached to the group
      </li>
      <li className="flex items-center gap-2">
        <svg width="28" height="8" aria-hidden>
          <line x1="0" y1="4" x2="28" y2="4" stroke="var(--color-signal)" strokeWidth="3" />
        </svg>
        The traced person’s path
      </li>
    </ul>
  )
}
