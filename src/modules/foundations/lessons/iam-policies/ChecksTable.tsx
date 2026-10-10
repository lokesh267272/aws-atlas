import { useId } from 'react'
import { Check, Minus, X } from 'lucide-react'
import { cn } from '../../../../lib/cn'
import type { Evaluation } from './evaluate'

function Cell({ value }: { value: boolean | null }) {
  if (value === null)
    return (
      <span className="inline-flex items-center gap-1 text-ink-3">
        <Minus aria-hidden className="size-3.5" />
        None
      </span>
    )
  return value ? (
    <span className="inline-flex items-center gap-1 font-bold text-ok">
      <Check aria-hidden className="size-3.5" />
      Yes
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-ink-3">
      <X aria-hidden className="size-3.5" />
      No
    </span>
  )
}

/** Shows, for each statement, which of its parts matched the request. */
export function ChecksTable({ evaluation, className }: { evaluation: Evaluation; className?: string }) {
  const titleId = useId()
  const effectClass = (effect: string) => (effect === 'Deny' ? 'text-bad' : 'text-ok')

  return (
    <div className={cn('@container rounded-lg border border-line', className)}>
      <p id={titleId} className="border-b border-line bg-paper px-4 py-2.5 font-bold text-ink">
        How each statement compared with the request
      </p>

      {/* Narrow screens: one short list per statement, so the deciding answer is never off-screen. */}
      <ul aria-labelledby={titleId} className="divide-y divide-line text-sm @lg:hidden">
        {evaluation.checks.map((c) => (
          <li key={c.statement.id} className="px-4 py-2.5">
            <p className="font-bold text-ink">
              Statement {c.index + 1} <span className={effectClass(c.statement.effect)}>({c.statement.effect})</span>
            </p>
            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
              <dt className="text-ink-3">Statement matches?</dt>
              <dd>
                <Cell value={c.matches} />
              </dd>
              <dt className="text-ink-3">Action matches?</dt>
              <dd>
                <Cell value={c.action} />
              </dd>
              <dt className="text-ink-3">Resource matches?</dt>
              <dd>
                <Cell value={c.resource} />
              </dd>
              <dt className="text-ink-3">Condition true?</dt>
              <dd>
                <Cell value={c.condition} />
              </dd>
            </dl>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto @lg:block">
        <table aria-labelledby={titleId} className="w-full text-left text-sm">
          <thead className="text-ink-3">
            <tr className="border-b border-line">
              <th scope="col" className="px-4 py-2 font-bold">Statement</th>
              <th scope="col" className="px-3 py-2 font-bold">Action matches?</th>
              <th scope="col" className="px-3 py-2 font-bold">Resource matches?</th>
              <th scope="col" className="px-3 py-2 font-bold">Condition true?</th>
              <th scope="col" className="px-3 py-2 font-bold">Statement matches?</th>
            </tr>
          </thead>
          <tbody>
            {evaluation.checks.map((c) => (
              <tr key={c.statement.id} className="border-b border-line last:border-0">
                <th scope="row" className="px-4 py-2 font-bold text-ink">
                  Statement {c.index + 1} <span className={effectClass(c.statement.effect)}>({c.statement.effect})</span>
                </th>
                <td className="px-3 py-2">
                  <Cell value={c.action} />
                </td>
                <td className="px-3 py-2">
                  <Cell value={c.resource} />
                </td>
                <td className="px-3 py-2">
                  <Cell value={c.condition} />
                </td>
                <td className="px-3 py-2">
                  <Cell value={c.matches} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-line px-4 py-2 text-xs text-ink-3">
        A statement matches only when its action, its resource and its condition (if it has one) all match.
      </p>
    </div>
  )
}
