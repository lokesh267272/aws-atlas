import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { FileText, Link2, X } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Button, Pill, Segmented, Slider } from '../../../../components/controls'
import { Term } from '../../../../components/Term'
import { cn } from '../../../../lib/cn'
import { s3Story } from '../../story'
import { decide, LINK_CHOICES, OWN_RECEIPT, requestById, ROLE_LINK_MAX_MINUTES, solution, type LinkChoice } from './accessModel'
import { BUCKET } from './RequestGate'

/** How far the clock goes for each lifetime, and its step: a little past the end, so the learner sees it die. */
const SPAN: Record<LinkChoice, { max: number; step: number }> = {
  15: { max: 30, step: 1 },
  60: { max: 120, step: 5 },
  360: { max: 420, step: 15 },
}

const CHOICE_LABEL: Record<LinkChoice, string> = { 15: '15 min', 60: '1 hour', 360: '6 hours' }

type ChoiceValue = `${LinkChoice}`

/** 75 → "1 h 15 min", 60 → "1 h", 5 → "5 min". */
export function fmtMinutes(m: number): string {
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h} h ${r} min` : `${h} h`
}

interface Try {
  n: number
  at: number
  ok: boolean
}

/** Keeps the latest few clicks, newest first. */
const MAX_TRIES = 4

/** "Try it: watch a link expire": the servers sign a link for one receipt; pick its lifetime, move the clock, open it. */
export function LinkClock() {
  const reduce = useReducedMotion() === true
  const [minutes, setMinutes] = useState<LinkChoice>(60)
  const [clock, setClock] = useState(0)
  const [tries, setTries] = useState<Try[]>([])
  const span = SPAN[minutes]
  const config = { ...solution, link: { key: OWN_RECEIPT, minutes } }
  const now = decide(requestById('customer-own'), config, clock)
  const pct = (m: number) => `${(Math.min(m, span.max) / span.max) * 100}%`

  /** A new lifetime means a newly signed link: the clock and the tries start again. */
  const pick = (m: LinkChoice) => {
    setMinutes(m)
    setClock(0)
    setTries([])
  }
  const open = () => setTries((t) => [{ n: (t[0]?.n ?? 0) + 1, at: clock, ok: now.allowed }, ...t].slice(0, MAX_TRIES))

  return (
    <Bench
      title="Try it: watch a link expire"
      intro="Pick how long the link lasts, move the clock, and open the link before and after it expires."
      onReset={() => pick(60)}
    >
      <div className="grid gap-5 md:grid-cols-2">
        {/* Left: the lifetime, the clock, and the link's life drawn as a bar */}
        <div className="min-w-0">
          <Segmented<ChoiceValue>
            label="The link lasts"
            value={`${minutes}`}
            onChange={(v) => pick(Number(v) as LinkChoice)}
            options={LINK_CHOICES.map((m) => ({ value: `${m}` as ChoiceValue, label: CHOICE_LABEL[m] }))}
          />
          <Slider
            className="mt-4"
            label="Time since the link was made"
            value={clock}
            min={0}
            max={span.max}
            step={span.step}
            onChange={setClock}
            format={fmtMinutes}
          />

          <div className="relative mt-3" aria-hidden>
            <div className="flex h-8 overflow-hidden rounded-md border border-line text-xs font-bold">
              <div className="flex items-center justify-center bg-ok-soft text-ok" style={{ width: pct(minutes) }}>
                works
              </div>
              <div className="flex flex-1 items-center justify-center bg-bad-soft text-bad">expired</div>
            </div>
            {/* Now: moves only when the learner moves the clock. */}
            <motion.div
              className="absolute -bottom-1 -top-1 w-0.5 -translate-x-1/2 rounded-full bg-ink"
              initial={false}
              animate={{ left: pct(clock) }}
              transition={reduce ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-xs text-ink-3">
            <span>signed</span>
            <span>{fmtMinutes(span.max)}</span>
          </div>
          {ROLE_LINK_MAX_MINUTES <= span.max && <p className="mt-1 text-xs text-ink-3">Links the servers sign stop working at about the 6-hour mark, the usual life of their credentials</p>}
        </div>

        {/* Right: the link itself, the button to open it, and what happened each time */}
        <div className="min-w-0">
          <div className="rounded-md border border-line bg-paper p-3">
            <p className="flex items-center gap-1.5 text-xs font-bold text-ink-2">
              <Link2 aria-hidden className="size-3.5" />
              Link for customer #1042
            </p>
            <p className="mt-1 font-mono text-[11px] leading-snug text-ink-3 [overflow-wrap:anywhere]">
              https://{BUCKET}.s3.{s3Story.regionCode}.amazonaws.com/{OWN_RECEIPT}?…&amp;
              <b className="text-ink">X-Amz-Expires={minutes * 60}</b>&amp;X-Amz-Security-Token=…&amp;…&amp;X-Amz-Signature=…
            </p>
          </div>

          <Button variant="primary" className="mt-3" onClick={open}>
            <Link2 aria-hidden />
            Open the link
          </Button>

          <div aria-live="polite" className="mt-3">
            {tries.length === 0 ? (
              <p className="text-xs text-ink-3">Not opened yet</p>
            ) : (
              <ol className="grid gap-1.5" aria-label="Times you opened the link">
                {tries.map((t, i) => (
                  <motion.li
                    key={t.n}
                    initial={i === 0 && !reduce ? { opacity: 0, y: -4 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-sm', i > 0 && 'opacity-70')}
                  >
                    <span className="w-24 shrink-0 tabular-nums text-ink-2">at {fmtMinutes(t.at)}</span>
                    {t.ok ? (
                      <Pill tone="ok">
                        <FileText aria-hidden />
                        Downloaded order-1042.pdf
                      </Pill>
                    ) : (
                      <Pill tone="bad">
                        <X aria-hidden />
                        Access denied: link expired
                      </Pill>
                    )}
                  </motion.li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <p className="text-sm text-ink-2">
          Signed by the server <Term k="iam-role">role</Term>, so it lasts about 6 hours at most, less if the role’s{' '}
          <Term k="temporary-credentials">temporary credentials</Term> expire first.
        </p>
        {/* Plain text on purpose: a <Term> here would put role="button" next to "7 days". */}
        <Pill className="mt-2 whitespace-normal">Signed with a long-term user key: up to 7 days</Pill>
      </div>
    </Bench>
  )
}
