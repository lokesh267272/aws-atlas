import { useMemo, useState } from 'react'
import { Check, CircleCheck, CircleX, Gamepad2, Hospital, Newspaper, Rocket, ShoppingCart, TriangleAlert, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Term } from '../../../../components/Term'
import { cn } from '../../../../lib/cn'
import { EQUIPMENT_MS, FIBRE_KM_PER_MS, REGIONS, ROUTE_FACTOR, regionByCode, type RegionCode } from './regions'
import { SCENARIOS, gradeChoice, verdictText, type Mark, type ScenarioId, type Verdict } from './scenarios'
import { WorldSketch } from './WorldSketch'

const scenarioIcons: Record<ScenarioId, LucideIcon> = {
  clinic: Hospital,
  game: Gamepad2,
  store: ShoppingCart,
  startup: Rocket,
  news: Newspaper,
}

const emptyPicks = (): Record<ScenarioId, RegionCode | null> => ({
  clinic: null,
  game: null,
  store: null,
  startup: null,
  news: null,
})

const markStyle: Record<Mark, { icon: LucideIcon; word: string; cls: string }> = {
  pass: { icon: Check, word: 'Meets', cls: 'bg-ok-soft text-ok' },
  tradeoff: { icon: TriangleAlert, word: 'Trade-off', cls: 'bg-warn-soft text-warn' },
  fail: { icon: X, word: 'Fails', cls: 'bg-bad-soft text-bad' },
}

const verdictStyle: Record<Verdict, { icon: LucideIcon; cls: string }> = {
  strong: { icon: CircleCheck, cls: 'border-ok bg-ok-soft text-ok' },
  'strong-tradeoff': { icon: CircleCheck, cls: 'border-ok bg-ok-soft text-ok' },
  good: { icon: CircleCheck, cls: 'border-ok bg-ok-soft text-ok' },
  workable: { icon: TriangleAlert, cls: 'border-warn bg-warn-soft text-warn' },
  poor: { icon: CircleX, cls: 'border-bad bg-bad-soft text-bad' },
  'not-allowed': { icon: CircleX, cls: 'border-bad bg-bad-soft text-bad' },
}

/** Distance rounded to the nearest 10 km, e.g. "6,730". */
const fmtKm = (km: number) => (Math.round(km / 10) * 10).toLocaleString('en-GB')

export function RegionPicker() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>('clinic')
  const [picks, setPicks] = useState(emptyPicks)

  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0]
  const chosen = picks[scenarioId]
  const grade = useMemo(() => (chosen ? gradeChoice(scenario, chosen) : null), [scenario, chosen])
  const solved = useMemo(
    () => SCENARIOS.filter((s) => {
      const p = picks[s.id]
      return p !== null && s.best.includes(p)
    }).length,
    [picks],
  )

  const chosenRegion = chosen ? regionByCode(chosen) : null
  const mapLabel = chosenRegion && grade
    ? `World map. ${scenario.users.label}. Chosen Region: ${chosenRegion.name}, about ${fmtKm(grade.km)} kilometres away. Estimated round trip about ${grade.ms} milliseconds.`
    : `World map showing ${scenario.users.label} and eight AWS Regions. No Region chosen yet.`

  const reset = () => {
    setPicks(emptyPicks())
    setScenarioId('clinic')
  }

  return (
    <Bench
      title="Try it: pick the Region"
      intro="Choose a business, read its situation, then pick a Region for it. Watch the map and the four checks. Some businesses have more than one sensible answer."
      onReset={reset}
    >
      <fieldset>
        <legend className="mb-1.5 text-sm font-bold text-ink-2">
          1. Choose a business <span className="font-normal text-ink-3">({solved} of 5 solved with a strong choice)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {SCENARIOS.map((s) => {
            const Icon = scenarioIcons[s.id]
            const sel = s.id === scenarioId
            const p = picks[s.id]
            const done = p !== null && s.best.includes(p)
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={sel}
                onClick={() => setScenarioId(s.id)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold transition-colors',
                  sel
                    ? 'border-signal bg-signal-soft text-ink shadow-[inset_0_0_0_1px_var(--color-signal)]'
                    : 'border-line bg-panel text-ink-2 hover:border-ink hover:text-ink',
                )}
              >
                <Icon aria-hidden className="size-4 shrink-0" />
                {s.short}
                {done && (
                  <>
                    <Check aria-hidden className="size-4 shrink-0 text-ok" />
                    <span className="sr-only">(solved)</span>
                  </>
                )}
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="mt-5 rounded-md border border-line bg-paper px-4 py-3">
        <h4 className="font-bold text-ink">{scenario.title}</h4>
        <p className="mt-1 max-w-[68ch] text-ink-2">{scenario.story}</p>
      </div>

      <fieldset className="mt-5">
        <legend className="mb-1.5 text-sm font-bold text-ink-2">2. Pick a Region for this business</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {REGIONS.map((r) => {
            const sel = r.code === chosen
            return (
              <button
                key={r.code}
                type="button"
                aria-pressed={sel}
                onClick={() => setPicks((prev) => ({ ...prev, [scenarioId]: r.code }))}
                className={cn(
                  'relative flex min-w-0 flex-col items-start rounded-md border py-2 pl-3 pr-6 text-left transition-colors',
                  sel
                    ? 'border-signal bg-signal-soft shadow-[inset_0_0_0_1px_var(--color-signal)]'
                    : 'border-line bg-panel hover:border-ink',
                )}
              >
                {sel && <CircleCheck aria-hidden className="absolute right-1.5 top-1.5 size-4 text-signal" />}
                <span className="font-bold leading-tight text-ink">{r.place}</span>
                <span className="whitespace-nowrap font-mono text-[0.72rem] text-ink-3 sm:text-xs">{r.code}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      {/* Result first: on one column the verdict sits right under the Region buttons. The map moves to the
          left once the bench itself is wide enough for two columns. */}
      <div className="mt-5 @container">
        <div className="grid gap-5 @2xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <div>
            <p className="sr-only" aria-live="polite">
              {grade && chosenRegion ? `${chosenRegion.name}: ${verdictText[grade.verdict]}. ${grade.note}` : ''}
            </p>
            {!grade || !chosenRegion ? (
              <p className="rounded-md border border-dashed border-line-strong px-4 py-6 text-center text-ink-3">
                Pick a Region to see how it does on the four checks.
              </p>
            ) : (
              <div>
                <VerdictBanner verdict={grade.verdict} regionName={chosenRegion.name} />
                <ul className="mt-3 space-y-2" aria-label={`Four checks for ${chosenRegion.name}`}>
                  {grade.factors.map((f) => {
                    const m = markStyle[f.mark]
                    const Icon = m.icon
                    return (
                      <li key={f.id} className="flex flex-col items-start gap-1.5 rounded-md border border-line px-3 py-2 sm:flex-row sm:gap-3">
                        <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold sm:mt-0.5', m.cls)}>
                          <Icon aria-hidden className="size-3.5" />
                          {m.word}
                        </span>
                        <span className="min-w-0 text-sm">
                          <span className="font-bold text-ink">{f.label}. </span>
                          <span className="text-ink-2">{f.text}</span>
                        </span>
                      </li>
                    )
                  })}
                </ul>
                <p className="mt-3 text-ink-2">{grade.note}</p>
              </div>
            )}
          </div>
          <div className="@2xl:order-first">
            <WorldSketch users={scenario.users} otherUsers={scenario.otherUsers} chosen={chosen} ariaLabel={mapLabel} />
            {grade && (
              <div className="mt-3 rounded-md bg-sunken/70 px-3 py-2.5 text-sm text-ink-2">
                <p>
                  <span className="font-bold text-ink">Rough estimate: about {grade.ms} ms there and back</span> for{' '}
                  {fmtKm(grade.km)} km.
                </p>
                <p className="mt-1 text-ink-3">
                  2 × {fmtKm(grade.km)} km × {ROUTE_FACTOR} (cables are not straight) ÷ {FIBRE_KM_PER_MS} km per ms (light in
                  fibre) + {EQUIPMENT_MS} ms (equipment). Real latency depends on the actual cable routes.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-ink-3">
        Simplified: a real choice also weighs things like which Regions your team already uses and where your other
        systems run. Price groups compare standard <Term k="pay-as-you-go">pay-as-you-go</Term> hourly prices for the
        same server type; real prices differ by service and change over time.
      </p>
    </Bench>
  )
}

function VerdictBanner({ verdict, regionName }: { verdict: Verdict; regionName: string }) {
  const v = verdictStyle[verdict]
  const Icon = v.icon
  return (
    <p className={cn('flex items-center gap-2 rounded-md border-l-4 px-3 py-2 font-bold', v.cls)}>
      <Icon aria-hidden className="size-5 shrink-0" />
      <span>
        {regionName}: {verdictText[verdict]}
      </span>
    </p>
  )
}
