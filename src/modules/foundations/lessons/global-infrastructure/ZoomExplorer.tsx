import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronRight, ZoomOut } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Button } from '../../../../components/controls'
import { cn } from '../../../../lib/cn'
import { AzView, DataCenterView, PlanetView, RegionView, azIdsFor, type ZoomRegionCode } from './ZoomViews'

type Level = 0 | 1 | 2 | 3

interface ZoomState {
  level: Level
  region: ZoomRegionCode
  az: number
  dc: number
}

const START: ZoomState = { level: 0, region: 'us-east-1', az: 0, dc: 0 }

const levelNames = ['Planet', 'Region', 'Availability Zone', 'Data center'] as const

export function ZoomExplorer() {
  const reduced = useReducedMotion() ?? false
  const [state, setState] = useState<ZoomState>(START)
  const [direction, setDirection] = useState(1)
  // Move keyboard focus to the new level's heading only after the learner has navigated.
  const [navigated, setNavigated] = useState(false)

  const go = (next: ZoomState) => {
    setNavigated(true)
    setDirection(next.level >= state.level ? 1 : -1)
    setState(next)
  }

  const allCrumbs: { label: string; mono: boolean; target: ZoomState }[] = [
    { label: 'Planet', mono: false, target: { ...state, level: 0 } },
    { label: state.region, mono: true, target: { ...state, level: 1 } },
    { label: azIdsFor(state.region)[state.az], mono: true, target: { ...state, level: 2 } },
    { label: `Data center ${state.dc + 1}`, mono: false, target: { ...state, level: 3 } },
  ]
  const crumbs = allCrumbs.slice(0, state.level + 1)

  const variants = {
    enter: (d: number) => ({ opacity: 0, scale: reduced ? 1 : d > 0 ? 0.94 : 1.05 }),
    center: { opacity: 1, scale: 1 },
    exit: (d: number) => ({ opacity: 0, scale: reduced ? 1 : d > 0 ? 1.05 : 0.94 }),
  }

  const focus = navigated
  const key = `${state.level}-${state.region}-${state.az}-${state.dc}`

  return (
    <Bench
      title="Try it: zoom from planet to building"
      intro="Zoom in one level at a time, from the whole AWS network down to a single data center. At each level, read what it is and what lives there. Use the trail at the top to zoom back out."
      onReset={() => go(START)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <nav aria-label="Zoom levels">
          <ol className="flex flex-wrap items-center gap-1 text-sm">
            {crumbs.map((c, i) => {
              const current = i === crumbs.length - 1
              return (
                <li key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight aria-hidden className="size-4 text-ink-3" />}
                  {current ? (
                    <span aria-current="location" className={cn('rounded px-1.5 py-0.5 font-bold text-ink', c.mono && 'font-mono')}>
                      {c.label}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => go(c.target)}
                      className={cn('rounded px-1.5 py-0.5 text-signal underline underline-offset-2 hover:bg-signal-soft', c.mono && 'font-mono')}
                    >
                      {c.label}
                    </button>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>
        <div className="flex items-center gap-3">
          <p className="text-sm text-ink-3">
            Level {state.level + 1} of 4: {levelNames[state.level]}
          </p>
          <Button
            size="sm"
            onClick={() => go({ ...state, level: (state.level - 1) as Level })}
            disabled={state.level === 0}
          >
            <ZoomOut aria-hidden />
            Zoom out
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={key}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reduced ? 0 : 0.25, ease: [0.2, 0.7, 0.2, 1] }}
          >
            {state.level === 0 && (
              <PlanetView focusOnMount={focus} onZoom={(code) => go({ level: 1, region: code, az: 0, dc: 0 })} />
            )}
            {state.level === 1 && (
              <RegionView code={state.region} focusOnMount={focus} onZoom={(az) => go({ ...state, level: 2, az, dc: 0 })} />
            )}
            {state.level === 2 && (
              <AzView code={state.region} azIndex={state.az} focusOnMount={focus} onZoom={(dc) => go({ ...state, level: 3, dc })} />
            )}
            {state.level === 3 && (
              <DataCenterView code={state.region} azIndex={state.az} dcIndex={state.dc} focusOnMount={focus} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </Bench>
  )
}
