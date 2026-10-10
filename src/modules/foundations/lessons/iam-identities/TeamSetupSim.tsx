import { useMemo, useState } from 'react'
import { Circle, CircleCheck, Info, ShieldCheck, TriangleAlert, WandSparkles } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Button, Pill, Segmented } from '../../../../components/controls'
import { Term } from '../../../../components/Term'
import { cn } from '../../../../lib/cn'
import { GroupPolicyPanel, PeoplePanel } from './TeamPanels'
import { DiagramLegend, TeamDiagram } from './TeamDiagram'
import { CellExplanation, MatrixLegend, PermissionMatrix, type Cell } from './PermissionMatrix'
import {
  computeEffective,
  emptyTeam,
  groupIds,
  leastPrivilegeWarnings,
  missions,
  people,
  policies,
  suggestedTeam,
  toggleIn,
  type GroupId,
  type PersonId,
  type PolicyId,
  type TeamState,
} from './teamData'

const policyOrder = policies.map((p) => p.id)

export function TeamSetupSim() {
  const [state, setState] = useState<TeamState>(emptyTeam)
  const [editing, setEditing] = useState<GroupId>('Admins')
  const [trace, setTrace] = useState<PersonId | 'none'>('none')
  const [cell, setCell] = useState<Cell | null>(null)

  const eff = useMemo(() => computeEffective(state), [state])
  const warnings = useMemo(() => leastPrivilegeWarnings(state, eff), [state, eff])
  const results = useMemo(() => missions.map((m) => ({ ...m, done: m.check(eff) })), [eff])
  const doneCount = results.filter((r) => r.done).length
  const allDone = doneCount === missions.length
  const untouched = useMemo(
    () => people.every((p) => state.members[p.id].length === 0) && groupIds.every((g) => state.attached[g].length === 0),
    [state],
  )

  const toggleMember = (person: PersonId, group: GroupId) =>
    setState((s) => ({ ...s, members: { ...s.members, [person]: toggleIn(s.members[person], group, groupIds) } }))

  const togglePolicy = (group: GroupId, policy: PolicyId) =>
    setState((s) => ({ ...s, attached: { ...s.attached, [group]: toggleIn(s.attached[group], policy, policyOrder) } }))

  const reset = () => {
    setState(emptyTeam())
    setEditing('Admins')
    setTrace('none')
    setCell(null)
  }

  return (
    <Bench
      title="Try it: set up the team"
      intro={
        <>
          Read the five missions, then put each person in a group and attach policies to the groups. The permissions
          table right below fills in as you go. Try to complete every mission without giving anyone more than their
          job needs.
        </>
      }
      onReset={reset}
    >
      {/* Missions first, so the goals are clear before the learner starts */}
      <div className="rounded-md bg-sunken/70 px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h4 className="font-bold text-ink">Missions</h4>
          <p className="text-sm text-ink-3" aria-live="polite">
            {doneCount} of {missions.length} complete
          </p>
        </div>
        <ul className="mt-2 space-y-1.5">
          {results.map((r) => (
            <li key={r.id} className="flex gap-2.5 text-sm">
              {r.done ? (
                <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-ok" />
              ) : (
                <Circle aria-hidden className="mt-0.5 size-4 shrink-0 text-line-strong" />
              )}
              <span className={r.done ? 'text-ink' : 'text-ink-2'}>
                <span className="sr-only">{r.done ? 'Done: ' : 'Not yet: '}</span>
                {r.text}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 grid gap-x-8 gap-y-6 lg:grid-cols-2">
        <PeoplePanel state={state} onToggle={toggleMember} />
        <GroupPolicyPanel state={state} editing={editing} onEditing={setEditing} onToggle={togglePolicy} />
      </div>

      {/* Effective permissions, right under the controls */}
      <div className="mt-8 border-t border-line pt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="font-bold text-ink">Effective permissions</h4>
          <Pill>Simplified</Pill>
        </div>
        <p className="text-sm text-ink-3">
          What each person can really do once all their groups’ policies are added up.
          {untouched && ' Right now nobody has any policy, so every cell is denied.'}
        </p>
        <div className="mt-3">
          <PermissionMatrix eff={eff} selected={cell} onSelect={setCell} />
          <MatrixLegend />
        </div>
        <div className="mt-3 rounded-md bg-sunken/70 px-4 py-3" aria-live="polite">
          <CellExplanation cell={cell} eff={eff} state={state} />
        </div>
      </div>

      {/* Least-privilege check */}
      <div className="mt-8 border-t border-line pt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h4 className="font-bold text-ink">Least-privilege check</h4>
          <p className="text-sm text-ink-3">
            Missions: {doneCount} of {missions.length} complete
          </p>
        </div>
        <div aria-live="polite">
          {warnings.length === 0 ? (
            <p
              className={cn(
                'mt-2 flex gap-2.5 rounded-md px-3 py-2.5 text-sm',
                allDone ? 'bg-ok-soft text-ink' : 'text-ink-3',
              )}
            >
              {allDone ? (
                <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-ok" />
              ) : (
                <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
              )}
              {allDone
                ? 'All missions done, and nobody has more access than this table can see. Real least privilege goes further, as the next section shows.'
                : 'No warnings yet. A warning appears when someone gets access their job does not need.'}
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {warnings.map((w) => (
                <li
                  key={w.person}
                  className={cn(
                    'flex gap-2.5 rounded-md px-3 py-2.5 text-sm text-ink',
                    w.severity === 'high' ? 'bg-bad-soft' : 'bg-warn-soft',
                  )}
                >
                  <TriangleAlert
                    aria-hidden
                    className={cn('mt-0.5 size-4 shrink-0', w.severity === 'high' ? 'text-bad' : 'text-warn')}
                  />
                  <span>
                    <span className="sr-only">{w.severity === 'high' ? 'Serious warning: ' : 'Warning: '}</span>
                    {w.text}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Wiring diagram */}
      <div className="mt-8 border-t border-line pt-5">
        <h4 className="font-bold text-ink">How it connects</h4>
        <p className="text-sm text-ink-3">
          A person gets every policy attached to every group they are in. Trace one person to see only their path.
        </p>
        <Segmented
          className="mt-3"
          size="sm"
          label="Trace a person"
          value={trace}
          onChange={setTrace}
          options={[{ value: 'none', label: 'Nobody' }, ...people.map((p) => ({ value: p.id, label: p.name }))]}
        />
        <div className="mt-3">
          <p className="mb-2 text-xs text-ink-3 sm:hidden">Scroll the diagram sideways to see the policies.</p>
          <TeamDiagram state={state} trace={trace === 'none' ? null : trace} />
          <DiagramLegend />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-start gap-x-6 gap-y-3 border-t border-line pt-4">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setState(suggestedTeam())
            setTrace('none')
            setCell(null)
          }}
        >
          <WandSparkles aria-hidden />
          Fill in a suggested setup
        </Button>
        <p className="min-w-0 flex-1 basis-72 text-xs text-ink-3">
          Simplified: the table checks one sample action per column (choose a cell to see it) against the real{' '}
          <Term k="json">JSON</Term> of each AWS managed policy. Real AWS checks every action separately and can also
          apply other kinds of policy. Viewing bills in the console also needs IAM access to billing to be turned on
          for the account (in a standalone account, the root user does this once); here we assume it is on.
        </p>
      </div>
    </Bench>
  )
}
