import { useEffect, useRef, useState } from 'react'
import { Check, CircleCheck, CircleX, Cloud, User, X } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { buttonClass } from '../../../../components/controls'
import { cn } from '../../../../lib/cn'
import { ownerRow } from './owner'
import { SECURITY_CARDS, type SecurityCard, type Side } from './securityCards'

const sideName: Record<Side, string> = { aws: 'AWS', you: 'You' }
const jobOf: Record<Side, string> = { aws: 'AWS’s job', you: 'your job' }

function Pile({
  side,
  title,
  subtitle,
  cards,
  answers,
}: {
  side: Side
  title: string
  subtitle: string
  cards: SecurityCard[]
  answers: Partial<Record<string, Side>>
}) {
  const Icon = side === 'aws' ? Cloud : User
  return (
    <section aria-label={title} className="min-w-0 overflow-hidden rounded-md border-2 border-line">
      <header className={cn('flex items-center gap-2 border-b-2 px-3 py-2', ownerRow[side === 'aws' ? 'provider' : 'you'])}>
        <Icon aria-hidden className="size-4 shrink-0" />
        <div className="min-w-0">
          <h4 className="text-sm font-bold">{title}</h4>
          <p className={cn('text-xs', side === 'aws' ? 'text-white/80' : 'text-ink-3')}>{subtitle}</p>
        </div>
      </header>
      {cards.length === 0 ? (
        <p className="px-3 py-3 text-sm text-ink-3">No jobs sorted here yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {cards.map((c) => {
            const right = answers[c.id] === c.answer
            return (
              <li key={c.id} className="flex items-start gap-2 px-3 py-2 text-sm text-ink-2">
                {right ? (
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-ok" />
                ) : (
                  <X aria-hidden className="mt-0.5 size-4 shrink-0 text-bad" />
                )}
                <span className="min-w-0">
                  {c.job}
                  <span className="sr-only">{right ? ' (you sorted this correctly)' : ' (you sorted this to the other side)'}</span>
                  {!right && <span className="mt-0.5 block text-xs text-ink-3">{c.reason}</span>}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export function SecuritySortSim() {
  const [answers, setAnswers] = useState<Partial<Record<string, Side>>>({})
  const [index, setIndex] = useState(0)
  const interacted = useRef(false)
  const jobRef = useRef<HTMLParagraphElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const doneRef = useRef<HTMLParagraphElement>(null)

  const total = SECURITY_CARDS.length
  const card = SECURITY_CARDS[index] as SecurityCard | undefined
  const picked = card ? answers[card.id] : undefined
  const sorted = SECURITY_CARDS.filter((c) => answers[c.id] !== undefined)
  const score = sorted.filter((c) => answers[c.id] === c.answer).length

  // Keep keyboard focus where the learner needs it next, but only after they start.
  useEffect(() => {
    if (!interacted.current) return
    if (picked) nextRef.current?.focus()
  }, [picked])
  useEffect(() => {
    if (!interacted.current) return
    if (index >= total) doneRef.current?.focus()
    else jobRef.current?.focus()
  }, [index, total])

  const choose = (side: Side) => {
    if (!card || picked) return
    interacted.current = true
    setAnswers((a) => ({ ...a, [card.id]: side }))
  }

  const next = () => {
    interacted.current = true
    setIndex((i) => i + 1)
  }

  const reset = () => {
    interacted.current = false
    setAnswers({})
    setIndex(0)
  }

  // From the score screen: start over and put focus back on the first job.
  const restart = () => {
    reset()
    interacted.current = true
  }

  const finished = index >= total
  const right = card && picked === card.answer

  return (
    <Bench
      title="Try it: sort the security jobs"
      intro="Your bakery shop runs on Amazon EC2. For each job, decide who is responsible for it: AWS or you. Each answer is explained straight away."
      onReset={reset}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-bold text-ink-2">{finished ? `All ${total} jobs sorted` : `Job ${index + 1} of ${total}`}</p>
        <p className="text-sm text-ink-2" aria-live="polite">
          Score: <strong className="text-ink">{score}</strong> of {sorted.length}
        </p>
      </div>
      {/* Progress: a tick or a cross above each answered job, so right and wrong differ in shape as well as colour. */}
      <ol className="mt-2 flex gap-1" aria-hidden>
        {SECURITY_CARDS.map((c, i) => {
          const a = answers[c.id]
          const ok = a === c.answer
          return (
            <li key={c.id} className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
              <span className="grid h-3.5 place-items-center">
                {a !== undefined &&
                  (ok ? (
                    <Check className="size-3.5 text-ok" strokeWidth={3} />
                  ) : (
                    <X className="size-3.5 text-bad" strokeWidth={3} />
                  ))}
              </span>
              <span
                className={cn(
                  'h-1.5 w-full rounded-full',
                  a === undefined ? (i === index ? 'bg-ink-3' : 'bg-sunken') : ok ? 'bg-ok' : 'bg-bad',
                )}
              />
            </li>
          )
        })}
      </ol>

      {card ? (
        <div className="mt-4 rounded-lg border border-line-strong bg-paper/60 p-4 sm:p-5">
          <p ref={jobRef} tabIndex={-1} className="text-lg font-bold leading-snug text-ink sm:text-xl">
            {card.job}
          </p>
          {!picked && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-md" role="group" aria-label="Who is responsible?">
              {(['aws', 'you'] as const).map((side) => {
                const Icon = side === 'aws' ? Cloud : User
                return (
                  <button
                    key={side}
                    type="button"
                    onClick={() => choose(side)}
                    className={cn(buttonClass('secondary'), 'h-12 text-base')}
                  >
                    <Icon aria-hidden />
                    {sideName[side]}
                  </button>
                )
              })}
            </div>
          )}
          <div aria-live="polite">
            {picked && (
              <div className={cn('mt-4 rounded-md px-4 py-3', right ? 'bg-ok-soft' : 'bg-bad-soft')}>
                <p className={cn('flex items-center gap-2 font-bold', right ? 'text-ok' : 'text-bad')}>
                  {right ? <CircleCheck aria-hidden className="size-5" /> : <CircleX aria-hidden className="size-5" />}
                  {right ? 'Right.' : 'Not quite.'} This is {jobOf[card.answer]}.
                </p>
                <p className="mt-1 text-ink-2">{card.reason}</p>
              </div>
            )}
          </div>
          {picked && (
            <button ref={nextRef} type="button" onClick={next} className={cn(buttonClass('primary', 'sm'), 'mt-3')}>
              {index === total - 1 ? 'See your score' : 'Next job'}
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-line-strong bg-paper/60 p-4 sm:p-5">
          <p ref={doneRef} tabIndex={-1} className="display text-xl text-ink">
            You got {score} of {total} right.
          </p>
          <p className="mt-2 max-w-[68ch] text-ink-2">
            {score === total
              ? 'Perfect. You can tell security of the cloud from security in the cloud.'
              : 'Read the reasons under the crosses below to see where each of those jobs belongs.'}
          </p>
          <button type="button" onClick={restart} className={cn(buttonClass('secondary', 'sm'), 'mt-3')}>
            Sort them again
          </button>
        </div>
      )}

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Pile
          side="aws"
          title="AWS: security of the cloud"
          subtitle="Buildings, hardware, network, virtualization"
          cards={sorted.filter((c) => c.answer === 'aws')}
          answers={answers}
        />
        <Pile
          side="you"
          title="You: security in the cloud"
          subtitle="Your data, settings, users and software"
          cards={sorted.filter((c) => c.answer === 'you')}
          answers={answers}
        />
      </div>

      <p className="mt-4 border-t border-line pt-3 text-xs text-ink-3">
        Based on the AWS shared responsibility model, for a shop running on Amazon EC2. Simplified: some jobs are split.
        For example, AWS patches its infrastructure while you patch your server’s operating system and software, and AWS
        trains its staff while you train yours.
      </p>
    </Bench>
  )
}
