import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../lib/cn'

/* ------------------------------------------------------------------ Button */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md'

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-md font-bold transition-colors disabled:opacity-45 aria-disabled:cursor-default aria-disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0'

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-white hover:bg-cloud',
  secondary: 'border border-line-strong bg-panel text-ink hover:border-ink hover:bg-paper',
  ghost: 'text-ink-2 hover:bg-sunken hover:text-ink',
  danger: 'bg-bad text-white hover:brightness-110',
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-base',
}

export function buttonClass(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md') {
  return cn(buttonBase, buttonVariants[variant], buttonSizes[size])
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={cn(buttonClass(variant, size), className)} {...props} />
}

/** A link styled as a button. Use for navigation; use Button for actions. */
export function ButtonLink({
  href,
  variant = 'secondary',
  size = 'md',
  className,
  children,
}: {
  href: string
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  children: ReactNode
}) {
  return (
    <a href={href} className={cn(buttonClass(variant, size), className)}>
      {children}
    </a>
  )
}

/* -------------------------------------------------------------- Segmented */

export interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
  /** Optional extra text for screen readers */
  description?: string
}

/** A row of mutually exclusive choices (a radio group that looks like a switch). */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
  size = 'md',
}: {
  /** Visible label for the group. Pass hideLabel-style text via aria if you do not want it shown. */
  label: string
  value: T
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
  className?: string
  size?: ButtonSize
}) {
  const name = useId()
  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className="mb-1.5 text-sm font-bold text-ink-2">{label}</legend>
      <div className="inline-flex max-w-full flex-wrap gap-1 rounded-md border border-line bg-sunken p-1">
        {options.map((opt) => {
          const checked = opt.value === value
          return (
            <label
              key={opt.value}
              className={cn(
                'relative inline-flex cursor-pointer items-center gap-1.5 rounded-[4px] font-bold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal',
                size === 'sm' ? 'px-2.5 py-1 text-sm' : 'px-3 py-1.5 text-sm sm:text-base',
                checked ? 'bg-panel text-ink shadow-[0_1px_0_var(--color-line-strong)]' : 'text-ink-3 hover:text-ink',
              )}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={checked}
                onChange={() => onChange(opt.value)}
                className="sr-only"
                aria-description={opt.description}
              />
              {opt.label}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

/* ----------------------------------------------------------------- Slider */

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = (v) => String(v),
  className,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  /** Formats the value shown next to the label, e.g. v => `${v} servers` */
  format?: (value: number) => string
  className?: string
}) {
  const id = useId()
  return (
    <div className={cn('min-w-0', className)}>
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <label htmlFor={id} className="text-sm font-bold text-ink-2">
          {label}
        </label>
        <output htmlFor={id} className="shrink-0 text-sm font-bold tabular-nums text-ink">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-[var(--color-signal)]"
      />
    </div>
  )
}

/* ----------------------------------------------------------------- Switch */

export function Switch({
  label,
  checked,
  onChange,
  className,
  tone = 'light',
}: {
  label: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string
  /** Use 'screen' inside dark panels (Bench tone="screen") */
  tone?: 'light' | 'screen'
}) {
  const screen = tone === 'screen'
  return (
    <label
      className={cn(
        'inline-flex cursor-pointer items-center gap-2.5 text-sm font-bold',
        screen ? 'text-screen-text' : 'text-ink-2',
        className,
      )}
    >
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          'relative h-6 w-10 shrink-0 rounded-full border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
          screen ? 'peer-focus-visible:outline-screen-accent' : 'peer-focus-visible:outline-signal',
          checked
            ? screen
              ? 'border-screen-accent bg-[#2f7fb3]'
              : 'border-signal bg-signal'
            : screen
              ? 'border-screen-line bg-screen-2'
              : 'border-line-strong bg-sunken',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-[18px] rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[18px]' : 'translate-x-0.5',
          )}
        />
      </span>
      {label}
    </label>
  )
}

/* ---------------------------------------------------------------- Readout */

type Tone = 'neutral' | 'ok' | 'bad' | 'warn'

const toneText: Record<Tone, string> = {
  neutral: 'text-ink',
  ok: 'text-ok',
  bad: 'text-bad',
  warn: 'text-warn',
}

/** A labelled number in a simulation, e.g. "Customers turned away: 1,204". */
export function Readout({
  label,
  value,
  hint,
  tone = 'neutral',
  live = false,
  className,
}: {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  tone?: Tone
  /** Announce changes to screen readers (label and value together). Leave off for fast-changing numbers. */
  live?: boolean
  className?: string
}) {
  return (
    <div className={cn('min-w-0', className)} aria-live={live ? 'polite' : undefined} aria-atomic={live || undefined}>
      <div className="text-sm text-ink-3">{label}</div>
      <div className={cn('display text-xl tabular-nums', toneText[tone])}>
        {value}
      </div>
      {hint && <div className="text-xs text-ink-3">{hint}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------- Pill */

const pillTone: Record<Tone, string> = {
  neutral: 'bg-sunken text-ink-2',
  ok: 'bg-ok-soft text-ok',
  bad: 'bg-bad-soft text-bad',
  warn: 'bg-warn-soft text-warn',
}

/** A small status label, e.g. "Allowed" / "Denied". */
export function Pill({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold [&_svg]:size-3.5',
        pillTone[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
