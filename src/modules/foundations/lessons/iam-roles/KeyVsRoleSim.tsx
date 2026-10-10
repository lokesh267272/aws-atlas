import { useEffect, useReducer, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { Boxes, Bot, FolderGit2, KeyRound, Laptop, Pause, Play, Send, Server, ServerCog, StepBack, StepForward, Ticket, Trash, FileImage } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Button, Segmented } from '../../../../components/controls'
import { Boundary, ServiceTile } from '../../../../components/diagram'
import type { Category } from '../../../../course/types'
import { cn } from '../../../../lib/cn'
import { ActorChip, Hop } from './parts'
import { KeyCard, TempCredCard } from './CredentialCards'
import { initialSim, simReducer, steps, type ActorId, type Mode, type PacketKind } from './keyVsRoleData'

type Actor =
  | { kind: 'aws'; name: string; caption: string; category: Category; icon: LucideIcon }
  | { kind: 'person' | 'threat'; name: string; caption: string; icon: LucideIcon }

const actors: Record<ActorId, Actor> = {
  laptop: { kind: 'person', name: 'Your laptop', caption: 'where you write the code', icon: Laptop },
  repo: { kind: 'person', name: 'Public repository', caption: 'a code site anyone can read', icon: FolderGit2 },
  bot: { kind: 'threat', name: 'Scanning bot', caption: 'run by a stranger', icon: Bot },
  bucket: { kind: 'aws', name: 'example-photos', caption: 'S3 bucket in your account', category: 'storage', icon: Boxes },
  app: { kind: 'aws', name: 'Photo app on EC2', caption: 'instance wearing the PhotoReader role', category: 'compute', icon: Server },
  imds: { kind: 'aws', name: 'Instance metadata', caption: 'reachable only from this instance', category: 'compute', icon: ServerCog },
  sts: { kind: 'aws', name: 'AWS STS', caption: 'issues temporary credentials', category: 'security', icon: Ticket },
}

const packetIcons: Record<PacketKind, LucideIcon> = {
  key: KeyRound,
  request: Send,
  creds: Ticket,
  data: FileImage,
  delete: Trash,
}

const STEP_MS = 3400
const TICK_MS = 500

export function KeyVsRoleSim() {
  const reduce = useReducedMotion() ?? false
  const [s, dispatch] = useReducer(simReducer, initialSim)
  const list = steps[s.mode]
  const step = list[s.step]
  const last = list.length - 1

  // Step-through autoplay (never runs with reduced motion: the Play button is hidden).
  // A fresh timer per step, so pressing Next during play never skips the following step.
  useEffect(() => {
    if (!s.playing || reduce) return
    const id = window.setTimeout(() => dispatch({ type: 'next' }), STEP_MS)
    return () => window.clearTimeout(id)
  }, [s.playing, s.step, s.mode, reduce])

  // The clock only runs while the credential card is on screen and the tab is visible.
  const credRef = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(true)
  const [pageVisible, setPageVisible] = useState(() => typeof document === 'undefined' || !document.hidden)
  useEffect(() => {
    const el = credRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    const onVisibility = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // The credential clock: one simulated minute every half second, once the story reaches its last step.
  const atEnd = s.step === last
  const canRun = s.mode === 'role' && atEnd && !reduce
  const ticking = canRun && s.cred !== null && !s.clockPaused && inView && pageVisible
  useEffect(() => {
    if (!ticking) return
    const id = window.setInterval(() => dispatch({ type: 'tick', minutes: 1 }), TICK_MS)
    return () => window.clearInterval(id)
  }, [ticking])

  const renderActor = (id: ActorId) => {
    const a = actors[id]
    const on = step.active.includes(id)
    return (
      <div key={id} className="min-w-0">
        {a.kind === 'aws' ? (
          <ServiceTile name={a.name} caption={a.caption} category={a.category} icon={a.icon} selected={on} muted={!on} className="w-full" />
        ) : (
          <ActorChip name={a.name} caption={a.caption} icon={a.icon} selected={on} muted={!on} tone={a.kind === 'threat' ? 'bad' : 'neutral'} className="w-full" />
        )}
        {on && <span className="sr-only"> (part of this step)</span>}
      </div>
    )
  }

  return (
    <Bench
      title="Try it: key in the code vs a role"
      intro="Pick a path, then press Next step (or Play) and watch where the secret goes. Compare how each story ends."
      onReset={() => dispatch({ type: 'reset' })}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Segmented<Mode>
          label="How the app gets access"
          value={s.mode}
          onChange={(mode) => dispatch({ type: 'mode', mode })}
          options={[
            { value: 'key', label: 'Access key in the code' },
            { value: 'role', label: 'IAM role' },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => s.step > 0 && dispatch({ type: 'back' })}
            aria-disabled={s.step === 0}
            className="aria-disabled:cursor-not-allowed aria-disabled:opacity-45"
          >
            <StepBack aria-hidden />
            Back
          </Button>
          {!reduce && (
            <Button size="sm" onClick={() => dispatch({ type: s.playing ? 'pause' : 'play' })}>
              {s.playing ? <Pause aria-hidden /> : <Play aria-hidden />}
              {s.playing ? 'Pause' : s.step === last ? 'Play again' : 'Play'}
            </Button>
          )}
          <Button
            size="sm"
            variant="primary"
            onClick={() => !atEnd && dispatch({ type: 'next' })}
            aria-disabled={atEnd}
            className="aria-disabled:cursor-not-allowed aria-disabled:opacity-45"
          >
            <StepForward aria-hidden />
            Next step
          </Button>
        </div>
      </div>

      {/* Numbered steps: a real sequence, so numbers are meaningful. Each one is a button. */}
      <ol className="mt-4 flex flex-wrap gap-1.5" aria-label="Steps">
        {list.map((st, i) => (
          <li key={st.title}>
            <button
              type="button"
              onClick={() => dispatch({ type: 'goto', step: i })}
              aria-current={i === s.step ? 'step' : undefined}
              aria-label={`Step ${i + 1}: ${st.title}`}
              className={cn(
                'grid size-8 place-items-center rounded-full border text-sm font-bold tabular-nums transition-colors',
                i === s.step
                  ? 'border-signal bg-signal text-white'
                  : i < s.step
                    ? 'border-signal bg-signal-soft text-signal'
                    : 'border-line-strong bg-panel text-ink-3 hover:border-ink hover:text-ink',
              )}
            >
              {i + 1}
            </button>
          </li>
        ))}
      </ol>

      {/* The stage */}
      <div className="mt-4">
        {s.mode === 'key' ? (
          <div className="grid gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
            <Boundary kind="group" label="Outside AWS">
              <div className="grid gap-2 sm:grid-cols-3">{(['laptop', 'repo', 'bot'] as const).map(renderActor)}</div>
            </Boundary>
            <Boundary kind="cloud" label="AWS Cloud">
              {renderActor('bucket')}
            </Boundary>
          </div>
        ) : (
          <Boundary kind="cloud" label="AWS Cloud">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{(['app', 'imds', 'sts', 'bucket'] as const).map(renderActor)}</div>
          </Boundary>
        )}
      </div>

      {/* What travels in this step */}
      <div className="mt-4 min-h-[4.75rem] rounded-md border border-line bg-paper px-4 py-3">
        {step.hop ? (
          <Hop
            from={step.hop.from}
            to={step.hop.to}
            label={step.hop.label}
            packet={packetIcons[step.hop.packet]}
            tone={step.hop.tone}
            playKey={`${s.mode}-${s.step}`}
            reduce={reduce}
          />
        ) : (
          <p className="text-sm text-ink-3">Nothing travels in this step. Everything happens on your side.</p>
        )}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div aria-live="polite" className="min-w-0">
          <p className="text-sm font-bold text-ink-3">
            Step {s.step + 1} of {list.length}
          </p>
          <h4 className="mt-0.5 text-lg font-bold text-ink">{step.title}</h4>
          <p className="mt-1.5 text-ink-2">{step.body}</p>
        </div>
        <div ref={credRef} className="min-w-0">
          {s.mode === 'key' ? (
            <KeyCard step={step} isLast={atEnd} />
          ) : (
            <TempCredCard
              cred={s.cred}
              clock={s.clock}
              reduce={reduce}
              canRun={canRun}
              paused={s.clockPaused}
              onTogglePause={() => dispatch({ type: 'toggleClock' })}
              onSkip={() => dispatch({ type: 'tick', minutes: 10 })}
              onSteal={() => dispatch({ type: 'steal' })}
            />
          )}
        </div>
      </div>
      <p aria-live="polite" className="sr-only">
        {!s.cred || s.cred.setNo === 1
          ? ''
          : s.cred.setNo <= 3
            ? `Fresh credentials arrived. Set ${s.cred.setNo} is now in use.`
            : 'Fresh credentials keep arriving automatically.'}
      </p>

      <p className="mt-4 border-t border-line pt-3 text-xs text-ink-3">
        {s.mode === 'key' ? (
          <>
            Simplified: the story is shortened. AWS also watches popular public code sites for leaked keys; when it finds one, it warns you
            and limits what the key can do. That is a safety net, not a plan: a key leaked any other way, such as a copied settings file or
            a backup, goes unnoticed.
          </>
        ) : (
          <>
            Simplified and sped up: at the last step, one simulated minute passes every half second. The 1-hour lifetime is an example; EC2
            chooses the real lifetime and makes new credentials available at least 5 minutes before the old ones expire. Real AWS also
            checks the role’s permissions on every request, and the story is shortened.
          </>
        )}
      </p>
    </Bench>
  )
}
