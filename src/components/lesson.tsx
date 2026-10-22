import type { ReactNode } from 'react'
import { Lightbulb, Monitor, Pin, RotateCcw, SquareMousePointer, TriangleAlert, Info } from 'lucide-react'
import { cn } from '../lib/cn'
import { Button } from './controls'

/* ---------------------------------------------------------------- Section */

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** A major part of a lesson. Renders an h2. Lessons are a sequence of Sections. */
export function Section({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  const sid = id ?? slug(title)
  return (
    <section id={sid} aria-labelledby={`${sid}-h`} className="mt-16 scroll-mt-20 first:mt-0">
      <h2 id={`${sid}-h`} className="display max-w-[30ch] text-xl text-ink sm:text-[1.75rem] sm:leading-tight">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

/** Running text: paragraphs, lists, h3 sub-headings. Keeps lines short and readable. */
export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('prose-lesson', className)}>{children}</div>
}

/* ---------------------------------------------------------------- Callout */

type CalloutKind = 'analogy' | 'tip' | 'warning' | 'remember' | 'real-aws'

const calloutStyles: Record<CalloutKind, { title: string; icon: typeof Info; bar: string; bg: string; iconColor: string }> = {
  analogy: { title: 'Think of it like this', icon: Lightbulb, bar: 'border-az', bg: 'bg-signal-soft/60', iconColor: 'text-az-ink' },
  tip: { title: 'Tip', icon: Info, bar: 'border-region', bg: 'bg-panel', iconColor: 'text-region-ink' },
  warning: { title: 'Watch out', icon: TriangleAlert, bar: 'border-warn', bg: 'bg-warn-soft/70', iconColor: 'text-warn' },
  remember: { title: 'Remember', icon: Pin, bar: 'border-ink', bg: 'bg-panel', iconColor: 'text-ink' },
  'real-aws': { title: 'In real AWS', icon: Monitor, bar: 'border-line-strong', bg: 'bg-sunken/70', iconColor: 'text-ink-2' },
}

/**
 * A short aside. Kinds:
 *  analogy  an everyday comparison that makes an idea click
 *  tip      a practical suggestion
 *  warning  a common mistake or risk
 *  remember the one idea to keep from a section
 *  real-aws how the simulated thing looks or behaves in the real AWS console
 */
export function Callout({
  kind = 'tip',
  title,
  children,
  className,
}: {
  kind?: CalloutKind
  title?: string
  children: ReactNode
  className?: string
}) {
  const s = calloutStyles[kind]
  const Icon = s.icon
  return (
    <aside className={cn('my-6 max-w-[68ch] rounded-r-md border-l-4 px-4 py-3.5', s.bar, s.bg, className)}>
      <p className="flex items-center gap-2 font-bold text-ink">
        <Icon aria-hidden className={cn('size-4 shrink-0', s.iconColor)} />
        {title ?? s.title}
      </p>
      <div className="mt-1.5 text-ink-2 [&>*+*]:mt-2 [&_strong]:text-ink">{children}</div>
    </aside>
  )
}

/* ------------------------------------------------------------------ Bench */

/**
 * The frame around an interactive simulation ("Try it" panel).
 * It spans the full lesson column, wider than running text.
 * Use tone="screen" for dark content like the 3D globe or a terminal.
 */
export function Bench({
  title,
  intro,
  onReset,
  tone = 'light',
  children,
  className,
}: {
  /** Start with a verb: "Try it: plan your shop's servers" */
  title: string
  /** One or two sentences: what to do and what to notice */
  intro?: ReactNode
  /** Shows a Reset button when provided */
  onReset?: () => void
  tone?: 'light' | 'screen'
  children: ReactNode
  className?: string
}) {
  const screen = tone === 'screen'
  return (
    <section
      aria-label={title}
      className={cn(
        // overflow-clip (not hidden) keeps the rounded corners without breaking position: sticky inside
        'my-8 overflow-clip rounded-lg border',
        screen ? 'border-screen-line bg-screen text-screen-text' : 'border-line bg-panel',
        className,
      )}
    >
      <header
        className={cn(
          'flex flex-wrap items-start gap-x-3 gap-y-2 border-b px-4 py-3 sm:px-5',
          screen ? 'border-screen-line' : 'border-line',
        )}
      >
        <SquareMousePointer aria-hidden className={cn('mt-1 size-4 shrink-0', screen ? 'text-screen-accent' : 'text-signal')} />
        <div className="min-w-[min(100%,15rem)] flex-1">
          <h3 className={cn('text-base font-bold', screen ? 'text-white' : 'text-ink')}>{title}</h3>
          {intro && <div data-caption="" className={cn('mt-0.5 max-w-[72ch] text-sm', screen ? 'text-screen-dim' : 'text-ink-3')}>{intro}</div>}
        </div>
        {onReset && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onReset}
            className={screen ? 'text-screen-dim hover:bg-screen-2 hover:text-white focus-visible:outline-screen-accent' : undefined}
          >
            <RotateCcw aria-hidden />
            Reset
          </Button>
        )}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}

/* --------------------------------------------------------------- KeyTerms */

/** A short list of points to take away, usually at the end of a lesson. */
export function Takeaways({ items }: { items: ReactNode[] }) {
  return (
    <div className="my-8 max-w-[68ch] rounded-lg border border-line bg-panel p-5">
      <h3 className="font-bold text-ink">What to take away</h3>
      <ul className="mt-3 space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 text-ink-2">
            <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-region" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
