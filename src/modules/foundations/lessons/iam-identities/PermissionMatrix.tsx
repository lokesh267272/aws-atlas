import { Check, TriangleAlert, X } from 'lucide-react'
import { cn } from '../../../../lib/cn'
import {
  allowed,
  capabilities,
  capById,
  people,
  personById,
  policiesFor,
  policyById,
  type CapId,
  type Effective,
  type PersonId,
  type TeamState,
} from './teamData'

export interface Cell {
  person: PersonId
  cap: CapId
}

type Verdict = 'yes' | 'extra' | 'no'

function verdictOf(eff: Effective, person: PersonId, cap: CapId): Verdict {
  if (!allowed(eff, person, cap)) return 'no'
  return personById[person].needs.includes(cap) ? 'yes' : 'extra'
}

const verdictWords: Record<Verdict, string> = {
  yes: 'allowed',
  extra: 'allowed, but the job does not need it',
  no: 'denied',
}

/** "Effective permissions" table: what each person can really do, given their groups. */
export function PermissionMatrix({
  eff,
  selected,
  onSelect,
}: {
  eff: Effective
  selected: Cell | null
  onSelect: (cell: Cell) => void
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-line">
      <table className="w-full min-w-[600px] border-collapse text-sm">
        <caption className="sr-only">
          Effective permissions, simplified. Choose a cell to see which policy allows or denies it.
        </caption>
        <thead>
          <tr className="bg-sunken text-left">
            <th scope="col" className="sticky left-0 z-[1] bg-sunken px-3 py-2 font-bold text-ink-2">
              Person
            </th>
            {capabilities.map((c) => {
              const Icon = c.icon
              return (
                <th key={c.id} scope="col" className="px-2 py-2 align-bottom font-bold text-ink-2">
                  <span className="flex items-center gap-1.5">
                    <Icon aria-hidden className="size-4 shrink-0 text-ink-3" />
                    <span className="leading-tight">
                      {c.label}
                      <span className="block text-xs font-normal text-ink-3">{c.service}</span>
                    </span>
                  </span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {people.map((p) => (
            <tr key={p.id} className="border-t border-line">
              <th scope="row" className="sticky left-0 z-[1] bg-panel px-3 py-1.5 text-left font-bold text-ink">
                {p.name}
                <span className="block text-xs font-normal text-ink-3">{p.role}</span>
              </th>
              {capabilities.map((c) => {
                const v = verdictOf(eff, p.id, c.id)
                const isSel = selected?.person === p.id && selected.cap === c.id
                return (
                  <td key={c.id} className="px-1.5 py-1.5">
                    <button
                      type="button"
                      aria-pressed={isSel}
                      aria-label={`${p.name}, ${c.label.toLowerCase()}: ${verdictWords[v]}. Show why.`}
                      onClick={() => onSelect({ person: p.id, cap: c.id })}
                      className={cn(
                        'flex h-9 w-full items-center justify-center gap-1.5 rounded-md border font-bold transition-colors [&_svg]:size-4',
                        v === 'yes' && 'border-transparent bg-ok-soft text-ok',
                        v === 'extra' && 'border-transparent bg-warn-soft text-warn',
                        v === 'no' && 'border-line bg-panel text-ink-3',
                        isSel ? 'outline-2 outline-offset-1 outline-signal' : 'hover:border-ink-3',
                      )}
                    >
                      {v === 'no' ? <X aria-hidden /> : v === 'extra' ? <TriangleAlert aria-hidden /> : <Check aria-hidden />}
                      <span aria-hidden>{v === 'no' ? 'No' : 'Yes'}</span>
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function MatrixLegend() {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-3">
      <li className="flex items-center gap-1.5">
        <Check aria-hidden className="size-3.5 text-ok" /> Allowed
      </li>
      <li className="flex items-center gap-1.5">
        <TriangleAlert aria-hidden className="size-3.5 text-warn" /> Allowed, but the job does not need it
      </li>
      <li className="flex items-center gap-1.5">
        <X aria-hidden className="size-3.5" /> Denied: no policy allows it
      </li>
    </ul>
  )
}

/** Plain explanation of one cell: which policy allows it, or why it falls to the default deny. */
export function CellExplanation({ cell, eff, state }: { cell: Cell | null; eff: Effective; state: TeamState }) {
  if (!cell) {
    return (
      <p className="text-sm text-ink-3">
        Choose any cell in the table to see which policy allows it, or why it is denied.
      </p>
    )
  }
  const person = personById[cell.person]
  const cap = capById[cell.cap]
  const grants = eff[cell.person][cell.cap]
  const groupsOf = state.members[cell.person]
  const v = verdictOf(eff, cell.person, cell.cap)
  const pols = policiesFor(state, cell.person)
  const notes = pols
    .map((pid) => policyById[pid].misses?.[cell.cap])
    .filter((note): note is string => Boolean(note))

  return (
    <div className="text-sm text-ink-2">
      <p className="font-bold text-ink">
        {person.name} · {cap.label.toLowerCase()} (<code className="font-mono text-[0.85em]">{cap.action}</code>):{' '}
        <span className={v === 'no' ? 'text-bad' : v === 'extra' ? 'text-warn' : 'text-ok'}>
          {v === 'no' ? 'Denied' : 'Allowed'}
        </span>
      </p>
      {grants.length > 0 ? (
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {grants.map((g) => (
            <li key={`${g.group}-${g.policy}`}>
              <strong className="text-ink">{g.policy}</strong>, attached to the {g.group} group, allows it:{' '}
              {policyById[g.policy].grants[cell.cap]}.
            </li>
          ))}
          {v === 'extra' && (
            <li>
              {person.name}’s job does not need this. Giving it anyway breaks least privilege.
            </li>
          )}
        </ul>
      ) : groupsOf.length === 0 ? (
        <p className="mt-1">
          {person.name} is not in any group, so no policies apply to {person.their === 'her' ? 'her' : 'him'}. With nothing
          that allows this action, AWS denies it by default.
        </p>
      ) : pols.length === 0 ? (
        <p className="mt-1">
          {groupsOf.join(' and ')} {groupsOf.length > 1 ? 'have' : 'has'} no policies yet, so AWS denies it by default.
        </p>
      ) : (
        <>
          <p className="mt-1">
            None of the policies on {groupsOf.join(' and ')} allow it, so AWS denies it by default.
          </p>
          {notes.length > 0 && (
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
