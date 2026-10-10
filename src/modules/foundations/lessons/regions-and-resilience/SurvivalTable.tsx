import { Check, TriangleAlert, X } from 'lucide-react'
import { cn } from '../../../../lib/cn'

type Cell = { mark: 'yes' | 'gap' | 'no'; text: string }

const columns = ['One server, one AZ', 'Two AZs and a load balancer', 'Two Regions and DNS failover']

const rows: { label: string; cells: Cell[] }[] = [
  {
    label: 'A server crashes',
    cells: [
      { mark: 'no', text: 'Offline until repaired' },
      { mark: 'gap', text: 'Survives after a short gap' },
      { mark: 'gap', text: 'Survives after a short gap' },
    ],
  },
  {
    label: 'One Availability Zone fails',
    cells: [
      { mark: 'no', text: 'Offline until repaired' },
      { mark: 'gap', text: 'Survives after a short gap' },
      { mark: 'gap', text: 'Survives after a short gap' },
    ],
  },
  {
    label: 'A whole Region has a problem',
    cells: [
      { mark: 'no', text: 'Offline' },
      { mark: 'no', text: 'Offline' },
      { mark: 'gap', text: 'Survives after a longer gap' },
    ],
  },
]

const markStyle = {
  yes: { icon: Check, cls: 'text-ok' },
  gap: { icon: TriangleAlert, cls: 'text-warn' },
  no: { icon: X, cls: 'text-bad' },
}

/** What each design from the simulation survives, as an accessible table. */
export function SurvivalTable() {
  return (
    <div className="my-6">
      <p className="mb-2 text-xs text-ink-3 sm:hidden">This table is wide. Scroll it sideways to see all three designs.</p>
      {/* Focusable, so keyboard users can scroll it too */}
      <div
        role="region"
        aria-label="What each design survives"
        tabIndex={0}
        className="overflow-x-auto rounded-lg border border-line bg-panel"
      >
        <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
          <caption className="border-b border-line px-4 py-2.5 text-left font-bold text-ink">
            What each design survives
          </caption>
          <thead>
            <tr className="border-b border-line bg-paper">
              <th scope="col" className="px-4 py-2 font-bold text-ink-2">
                Incident
              </th>
              {columns.map((c) => (
                <th key={c} scope="col" className="px-4 py-2 font-bold text-ink">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-line last:border-b-0">
                <th scope="row" className="px-4 py-2.5 font-bold text-ink">
                  {r.label}
                </th>
                {r.cells.map((c, i) => {
                  const m = markStyle[c.mark]
                  const Icon = m.icon
                  return (
                    <td key={i} className="px-4 py-2.5 text-ink-2">
                      <span className="inline-flex items-start gap-1.5">
                        <Icon aria-hidden className={cn('mt-0.5 size-4 shrink-0', m.cls)} />
                        {c.text}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
            <tr className="bg-paper">
              <th scope="row" className="px-4 py-2.5 font-bold text-ink">
                Running cost (rough)
              </th>
              <td className="px-4 py-2.5 text-ink-2">1×</td>
              <td className="px-4 py-2.5 text-ink-2">About 2×</td>
              <td className="px-4 py-2.5 text-ink-2">About 4×, less with a smaller standby</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
