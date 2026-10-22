import type { ReactNode } from 'react'
import { Database, Network, Users, X } from 'lucide-react'
import { Boundary } from '../../../../components/diagram'
import { Pill } from '../../../../components/controls'
import { cn } from '../../../../lib/cn'
import { story } from '../../story'
import { payStyle } from './look'
import { DB_HOME, REGION_AZS, type FleetConfig, type Tick } from './scaleModel'

/** Coloured square with a white icon, as service tiles draw it. */
function Icon({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="grid size-6 shrink-0 place-items-center rounded-[3px] text-white [&_svg]:size-3.5" style={{ background: color }}>
      {children}
    </span>
  )
}

function DbChip({ role, unused, failing }: { role: 'primary' | 'standby' | 'gone'; unused: boolean; failing: boolean }) {
  const faded = unused || role === 'gone'
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className={cn('flex items-center gap-1.5', faded && 'opacity-50')}>
        <Icon color="var(--color-database)">
          <Database aria-hidden />
        </Icon>
        <span className="text-xs leading-tight">
          <span className="block font-bold text-ink">
            {unused ? 'Orders DB: not used' : role === 'primary' ? 'Orders DB primary' : role === 'standby' ? 'Orders DB standby' : 'Orders DB: lost with the AZ'}
          </span>
          <span className="block text-ink-3">later module</span>
        </span>
      </span>
      {failing && <Pill tone="warn">Failing over: orders wait</Pill>}
    </div>
  )
}

/**
 * The flat version of the Region scene, used without WebGL. Same state, same meaning:
 * customers, the load balancer, a Region with three AZs, servers coloured by how they are paid for,
 * and the orders database's primary and standby.
 */
export function RegionFallback({ tick, cfg, label, live = true }: { tick: Tick; cfg: FleetConfig; label: string; live?: boolean }) {
  const usesDb = cfg.ordersOn === 'database'
  const dbRole = (a: number): 'primary' | 'standby' | 'gone' =>
    tick.dbPrimary === a ? 'primary' : tick.dbStandby === a ? 'standby' : 'gone'

  return (
    <div className="p-3 sm:p-4">
      <div role="img" aria-label={label} className="rounded-md bg-panel p-2.5 text-ink sm:p-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <Icon color="var(--color-ink-3)">
            <Users aria-hidden />
          </Icon>
          <span className="font-bold">Customers</span>
          {live && <span className="tabular-nums text-ink-3">{tick.demand} orders this step</span>}
          {live && tick.turnedAway > 0 && <Pill tone="bad">{tick.turnedAway} turned away</Pill>}
        </div>

        <div
          className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[3px] border-2 px-2 py-1.5 text-sm"
          style={{ borderColor: 'var(--color-networking)' }}
        >
          <Icon color="var(--color-networking)">
            <Network aria-hidden />
          </Icon>
          <span className="font-bold">Load balancer</span>
          {cfg.webOpen ? (
            <span className="text-ink-3">sends orders to healthy servers only</span>
          ) : (
            <Pill tone="bad">Web port closed</Pill>
          )}
        </div>

        <Boundary kind="region" label={`Region ${story.regionCode}`} className="mt-2">
          <div className="grid gap-2 sm:grid-cols-3">
            {Array.from({ length: REGION_AZS }, (_, a) => {
              const inGroup = a < cfg.azCount
              const down = tick.azDown[a]
              const here = tick.instances.filter((i) => i.az === a).sort((p, q) => p.id - q.id)
              const gone = tick.removed.filter((r) => r.az === a && r.reason !== 'scale-in')
              const lost = tick.removed.filter((r) => r.az === a).reduce((n, r) => n + r.orders, 0)
              return (
                <Boundary
                  key={a}
                  kind="az"
                  label={down ? `${story.azs[a]} down` : inGroup ? story.azs[a] : `${story.azs[a]}: not used`}
                  muted={!inGroup || down}
                  highlighted={down}
                >
                  {here.length + gone.length > 0 && (
                    <ul className="flex flex-wrap gap-1" aria-hidden>
                      {here.map((i) => (
                        <li key={i.id} className="size-5 rounded-[3px] border-2" style={payStyle(i.pay, i.booting)} />
                      ))}
                      {gone.map((r) => (
                        <li
                          key={r.id}
                          className="grid size-5 place-items-center rounded-[3px] border-2 border-bad bg-bad-soft text-bad [&_svg]:size-3.5"
                        >
                          <X />
                        </li>
                      ))}
                    </ul>
                  )}
                  {here.length === 0 && gone.length === 0 && (
                    <p className="text-xs text-ink-3">{down ? 'no servers left' : 'no servers'}</p>
                  )}
                  {lost > 0 && <p className="mt-1 text-xs font-bold text-bad">{lost} orders lost with servers</p>}
                  {(a === DB_HOME.primary || a === DB_HOME.standby) && (
                    <DbChip role={dbRole(a)} unused={!usesDb} failing={usesDb && tick.dbFailingOver && tick.dbPrimary === a} />
                  )}
                </Boundary>
              )
            })}
          </div>
        </Boundary>
      </div>
    </div>
  )
}
