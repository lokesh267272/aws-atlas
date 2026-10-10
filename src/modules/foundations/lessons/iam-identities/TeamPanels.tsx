import { Check, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { Segmented } from '../../../../components/controls'
import { cn } from '../../../../lib/cn'
import { groupIds, groups, people, policies, type GroupId, type PersonId, type PolicyId, type TeamState } from './teamData'

/** A small on/off button. The icon (tick or plus) shows the state, not only the colour. */
function ToggleChip({
  pressed,
  onClick,
  label,
  children,
}: {
  pressed: boolean
  onClick: () => void
  /** Full accessible name, e.g. "Priya in Developers" */
  label: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-sm font-bold transition-colors [&_svg]:size-3.5 [&_svg]:shrink-0',
        pressed
          ? 'border-signal bg-signal-soft text-ink'
          : 'border-line bg-panel text-ink-3 hover:border-ink-3 hover:text-ink',
      )}
    >
      {pressed ? <Check aria-hidden /> : <Plus aria-hidden />}
      {children}
    </button>
  )
}

/* ------------------------------------------------------------ People panel */

export function PeoplePanel({
  state,
  onToggle,
}: {
  state: TeamState
  onToggle: (person: PersonId, group: GroupId) => void
}) {
  return (
    <div className="min-w-0">
      <h4 className="font-bold text-ink">1. Put people in groups</h4>
      <p className="text-sm text-ink-3">Press a group to add or remove that person. A person can be in more than one group.</p>
      <ul className="mt-2 divide-y divide-line">
        {people.map((p) => {
          const mine = state.members[p.id]
          return (
            <li key={p.id} className="py-3">
              <p className="text-ink">
                <span className="font-bold">{p.name}</span>
                <span className="text-ink-3">, {p.role}</span>
              </p>
              <p className="text-sm text-ink-3">{p.job}</p>
              <div role="group" aria-label={`Groups for ${p.name}`} className="mt-2 flex flex-wrap gap-1.5">
                {groupIds.map((g) => (
                  <ToggleChip
                    key={g}
                    pressed={mine.includes(g)}
                    onClick={() => onToggle(p.id, g)}
                    label={`${p.name} in ${g} group`}
                  >
                    {g}
                  </ToggleChip>
                ))}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* ------------------------------------------------------ Group policy panel */

export function GroupPolicyPanel({
  state,
  editing,
  onEditing,
  onToggle,
}: {
  state: TeamState
  editing: GroupId
  onEditing: (g: GroupId) => void
  onToggle: (group: GroupId, policy: PolicyId) => void
}) {
  const attached = state.attached[editing]
  const members = people.filter((p) => state.members[p.id].includes(editing))
  const info = groups.find((g) => g.id === editing)
  return (
    <div className="min-w-0">
      <h4 className="font-bold text-ink">2. Attach policies to groups</h4>
      <p className="text-sm text-ink-3">Pick a group, then tick the AWS managed policies it should have.</p>
      <Segmented
        className="mt-3"
        size="sm"
        label="Group to edit"
        value={editing}
        onChange={onEditing}
        options={groups.map((g) => {
          const n = state.attached[g.id].length
          return {
            value: g.id,
            label: (
              <>
                {g.id}
                <span className="tabular-nums text-ink-3" aria-hidden>
                  {n}
                </span>
              </>
            ),
            description: `${n} ${n === 1 ? 'policy' : 'policies'} attached`,
          }
        })}
      />
      <p className="mt-3 text-sm text-ink-3">
        <span className="font-bold text-ink-2">{editing}</span>: {info?.purpose.toLowerCase()}. Members:{' '}
        {members.length ? members.map((m) => m.name).join(', ') : 'nobody yet'}.
      </p>
      <fieldset className="mt-2">
        <legend className="sr-only">Policies attached to the {editing} group</legend>
        <ul className="space-y-1.5">
          {policies.map((pol) => {
            const on = attached.includes(pol.id)
            return (
              <li key={pol.id}>
                <label
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal',
                    on ? 'border-signal bg-signal-soft' : 'border-line hover:border-ink-3',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => onToggle(editing, pol.id)}
                    className="mt-1 size-4 shrink-0 accent-[var(--color-signal)]"
                  />
                  <span className="min-w-0">
                    <span className="block break-words text-sm font-bold text-ink">
                      {pol.id}
                      {pol.kind !== 'AWS managed' && <span className="font-normal text-ink-3"> ({pol.kind})</span>}
                    </span>
                    <span className="block text-sm text-ink-3">{pol.plain}</span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      </fieldset>
    </div>
  )
}
