import { lazy, useState, type ReactNode } from 'react'
import { useReducedMotion } from 'motion/react'
import { HandCoins, Split } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Scene3D } from '../../../../components/Scene3D'
import { Term } from '../../../../components/Term'
import { story } from '../../story'
import { HostFallback } from './HostFallback'
import { hostStep, type HostAction, type HostStage } from './hostModel'

// three.js loads only when the browser can show 3D.
const HostScene = lazy(() => import('./HostScene'))

/** Small buttons styled for the dark "screen" panel. */
const darkButton =
  'inline-flex h-9 items-center gap-1.5 rounded-md border border-screen-line bg-screen-2 px-3 text-sm font-bold text-screen-text transition-colors hover:border-screen-dim hover:text-white aria-disabled:cursor-default aria-disabled:opacity-45 aria-disabled:hover:border-screen-line aria-disabled:hover:text-screen-text focus-visible:outline-screen-accent [&_svg]:size-4'

/** Glossary words on the dark panel: underline and highlight in the screen accent, which stays readable there. */
const screenTerms =
  '[&_.term]:decoration-screen-accent [&_.term:hover]:text-screen-accent [&_.term[aria-expanded=true]]:text-screen-accent'

const sceneLabel: Record<HostStage, string> = {
  whole: 'A rack of servers in a data center. The top one is a single physical server.',
  split:
    'The top server slides out of the rack. The Nitro System splits it into four instances: three for other customers, A, B and C, and one free slot.',
  rented: `The free slot is now your instance, in orange, between other customers' instances. A dashed boundary marks Availability Zone ${story.azs[0]}.`,
}

const status: Record<HostStage, ReactNode> = {
  whole: (
    <>
      One physical <Term k="server">server</Term> in a <Term k="rack">rack</Term>, in an AWS{' '}
      <Term k="data-center">data center</Term>.
    </>
  ),
  split: (
    <>
      The <Term k="nitro-system">Nitro System</Term> splits it into isolated <Term k="instance">instances</Term> for
      different customers.
    </>
  ),
  rented: (
    <>
      The free slice is now your instance, in <Term k="availability-zone">Availability Zone</Term>{' '}
      <span className="font-mono">{story.azs[0]}</span>.
    </>
  ),
}

/** Legend marks match the scene: solid grey, dashed outline, orange, a light bar and a blue dashed line. */
function Swatch({ kind }: { kind: 'other' | 'free' | 'you' | 'nitro' | 'az' }) {
  return (
    <svg aria-hidden viewBox="0 0 16 12" className="h-3 w-4 shrink-0">
      {kind === 'other' && <rect x="1" y="1" width="14" height="10" rx="1.5" fill="var(--color-screen-dim)" />}
      {kind === 'free' && (
        <rect x="1" y="1" width="14" height="10" rx="1.5" fill="none" stroke="var(--color-screen-dim)" strokeDasharray="3 2" />
      )}
      {kind === 'you' && <rect x="1" y="1" width="14" height="10" rx="1.5" fill="var(--color-compute)" />}
      {kind === 'nitro' && <rect x="1" y="4" width="14" height="4" rx="1" fill="var(--color-screen-text)" />}
      {kind === 'az' && <line x1="1" y1="6" x2="15" y2="6" stroke="var(--color-az)" strokeWidth="2" strokeDasharray="4 2" />}
    </svg>
  )
}

/** Visual A: one physical server becomes several customers' instances, and you rent one of them. */
export function HostExplorer() {
  const reduced = useReducedMotion() ?? false
  const [stage, setStage] = useState<HostStage>('whole')
  const act = (a: HostAction) => setStage((s) => hostStep(s, a))

  return (
    <Bench
      tone="screen"
      title="Try it: rent a slice of a server"
      intro={
        <>
          Press <strong className="text-screen-text">Split it</strong>, then{' '}
          <strong className="text-screen-text">Rent one</strong>, and watch one physical server become isolated{' '}
          <Term k="instance">instances</Term> for different customers.
        </>
      }
      onReset={() => setStage('whole')}
      className={screenTerms}
    >
      <Scene3D label={sceneLabel[stage]} fallback={<HostFallback stage={stage} label={sceneLabel[stage]} />}>
        <HostScene stage={stage} reduced={reduced} />
      </Scene3D>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className={darkButton} aria-disabled={stage !== 'whole'} onClick={() => act('split')}>
          <Split aria-hidden />
          Split it
        </button>
        <button type="button" className={darkButton} aria-disabled={stage === 'rented'} onClick={() => act('rent')}>
          <HandCoins aria-hidden />
          Rent one
        </button>
      </div>

      <p aria-live="polite" className="mt-3 min-h-[3em] text-screen-text sm:min-h-0">
        {status[stage]}
      </p>

      <ul aria-label="Legend" className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-screen-dim">
        <li className="flex items-center gap-1.5">
          <Swatch kind="nitro" /> Nitro System: hardware + <Term k="hypervisor">hypervisor</Term> layer
        </li>
        <li className="flex items-center gap-1.5">
          <Swatch kind="other" /> Another customer&apos;s isolated instance
        </li>
        <li className="flex items-center gap-1.5">
          <Swatch kind="free" /> Free space
        </li>
        <li className="flex items-center gap-1.5">
          <Swatch kind="you" /> Your instance
        </li>
        <li className="flex items-center gap-1.5">
          <Swatch kind="az" /> <Term k="availability-zone">Availability Zone</Term>
        </li>
      </ul>
    </Bench>
  )
}
