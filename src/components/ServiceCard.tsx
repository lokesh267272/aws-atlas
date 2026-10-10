import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { categories, scopes } from '../course/categories'
import type { Category, Scope } from '../course/types'

/**
 * The standard summary for an AWS service. Every lesson that introduces a
 * service shows one, so learners always get the same three answers:
 * what it does, how you use it, and where it fits.
 */
export function ServiceCard({
  name,
  fullName,
  category,
  scope,
  icon: Icon,
  what,
  how,
  where,
  cost,
}: {
  name: string
  fullName: string
  category: Category
  scope: Scope
  icon: LucideIcon
  what: ReactNode
  how: ReactNode
  where: ReactNode
  /** Optional one-line pricing note, e.g. "Free. You pay only for what you create with it." */
  cost?: ReactNode
}) {
  const cat = categories[category]
  const sc = scopes[scope]
  return (
    <article className="my-8 overflow-hidden rounded-lg border border-line bg-panel" aria-label={`${name} service summary`}>
      <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-line px-5 py-4" style={{ borderTop: `4px solid ${cat.color}` }}>
        <span className="grid size-12 shrink-0 place-items-center rounded-md text-white" style={{ background: cat.color }}>
          <Icon aria-hidden className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="display text-lg text-ink">{name}</h3>
          <p className="text-sm text-ink-3">{fullName}</p>
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <div>
            <dt className="text-ink-3">Category</dt>
            <dd className="font-bold text-ink">{cat.label}</dd>
          </div>
          <div>
            <dt className="text-ink-3">Scope</dt>
            <dd className="font-bold text-ink" title={sc.explain}>
              {sc.label}
            </dd>
          </div>
        </dl>
      </header>
      <div className="grid gap-px bg-line md:grid-cols-3">
        {[
          ['What it does', what],
          ['How you use it', how],
          ['Where it fits', where],
        ].map(([heading, body]) => (
          <section key={heading as string} className="bg-panel px-5 py-4">
            <h4 className="font-bold text-ink">{heading}</h4>
            <div className="mt-1.5 text-[0.98rem] text-ink-2 [&_li+li]:mt-1.5 [&_li]:ml-4 [&_li]:list-disc [&_ul]:mt-1">{body}</div>
          </section>
        ))}
      </div>
      <footer className="border-t border-line bg-paper/60 px-5 py-2.5 text-sm text-ink-3">
        <span className="font-bold text-ink-2">{sc.label} service: </span>
        {sc.explain}
        {cost && (
          <>
            {' '}
            <span className="font-bold text-ink-2">Cost: </span>
            {cost}
          </>
        )}
      </footer>
    </article>
  )
}
