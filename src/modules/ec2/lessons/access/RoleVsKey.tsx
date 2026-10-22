import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowDown, ArrowRight, Boxes, Check, FastForward, FileText, HardHat, Image as ImageIcon, KeyRound, Server, TriangleAlert } from 'lucide-react'
import { cn } from '../../../../lib/cn'
import { Bench } from '../../../../components/lesson'
import { Button, Pill, Readout, Segmented } from '../../../../components/controls'
import { ServiceTile } from '../../../../components/diagram'
import { Term } from '../../../../components/Term'
import { href } from '../../../../lib/router'
import { story } from '../../story'

type Mode = 'access-key' | 'role'

/** AWS's own documentation example key id: not a real key. */
const EXAMPLE_KEY_ID = 'AKIAIOSFODNN7EXAMPLE'
const BUCKET = 'mealhop-menu-photos'
/** Presses of "Let a week pass" before the demo stops (keeps the day count small). */
const MAX_WEEKS = 4

/** "Try it: give the app its photos": a key stored on the server vs a role that hands out short-lived credentials. */
export function RoleVsKey() {
  const reduce = useReducedMotion() === true
  const [mode, setMode] = useState<Mode>('access-key')
  const [days, setDays] = useState(0)
  const key = mode === 'access-key'

  return (
    <Bench
      title="Try it: give the app its photos"
      intro={
        <>
          Swap a pasted <Term k="access-key">access key</Term> for an attached <Term k="iam-role">role</Term>, let time pass, and
          compare what the server keeps.
        </>
      }
      onReset={() => {
        setMode('access-key')
        setDays(0)
      }}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Segmented<Mode>
          label="How the app gets into S3"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'access-key', label: 'Paste an access key' },
            { value: 'role', label: 'Attach a role' },
          ]}
        />
        <Button
          onClick={() => setDays((d) => Math.min(d + 7, MAX_WEEKS * 7))}
          aria-disabled={days >= MAX_WEEKS * 7}
          className="aria-disabled:cursor-not-allowed"
        >
          <FastForward aria-hidden />
          Let a week pass
        </Button>
      </div>

      <div className="mt-4 grid items-center gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,0.8fr)] md:gap-3">
        {/* The server and what sits on it */}
        <div className="min-w-0 rounded-md border border-line-strong bg-paper p-3">
          <p className="flex items-center gap-2 text-sm font-bold text-ink">
            <span className="grid size-5 place-items-center rounded-[3px] text-white" style={{ background: 'var(--color-compute)' }}>
              <Server aria-hidden className="size-3.5" />
            </span>
            {story.appName} server
          </p>

          {!key && (
            <div className="mt-2 flex min-w-0 items-center gap-2 rounded-md border border-line bg-panel p-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-[4px] text-white" style={{ background: 'var(--color-security)' }}>
                <HardHat aria-hidden className="size-4" />
              </span>
              <span className="min-w-0 text-xs leading-tight">
                <span className="block text-sm font-bold text-ink">MenuPhotoReader</span>
                <span className="block text-ink-3">
                  role, attached as an <Term k="instance-profile">instance profile</Term>
                </span>
              </span>
            </div>
          )}

          <p className="mt-3 text-xs font-bold text-ink-2">On its disk</p>
          {key ? (
            <div className="mt-1 min-w-0 rounded-md border border-warn bg-warn-soft/60 p-2">
              <p className="flex items-center gap-1.5 text-xs font-bold text-ink">
                <FileText aria-hidden className="size-3.5" />
                config.env
              </p>
              <p className="mt-1 font-mono text-[11px] leading-snug text-ink-2 [overflow-wrap:anywhere]">
                AWS_ACCESS_KEY_ID={EXAMPLE_KEY_ID}
                <br />
                AWS_SECRET_ACCESS_KEY=••••••••••
              </p>
              <Pill tone="warn" className="mt-1.5">
                <TriangleAlert aria-hidden />
                Anyone who copies it can use it
              </Pill>
            </div>
          ) : (
            <div className="mt-1 flex items-center gap-2 rounded-md border border-dashed border-line-strong p-2">
              <Pill tone="ok">
                <Check aria-hidden />
                No keys stored
              </Pill>
            </div>
          )}
        </div>

        {/* The request for photos */}
        <div aria-hidden className="flex items-center justify-center gap-1.5 text-ink-3 md:flex-col">
          <ArrowDown className="size-5 md:hidden" />
          <ArrowRight className="hidden size-5 md:block" />
          <span className="text-xs font-bold md:max-w-28 md:text-center">{key ? 'signed with the key' : 'signed with temporary credentials'}</span>
          {/* The credential itself: the key just ages, a role's credential is swapped for a fresh one each week. */}
          <motion.span
            key={`${mode}-${days}`}
            initial={days > 0 && !reduce ? { opacity: 0, y: -6 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold',
              key ? (days > 0 ? 'border-warn bg-warn-soft text-ink' : 'border-line-strong bg-sunken text-ink-2') : 'border-ok bg-ok-soft text-ok',
            )}
          >
            <KeyRound aria-hidden className="size-3" />
            {key ? (days === 0 ? 'key, new' : `same key, ${days} days old`) : `credentials #${days / 7 + 1}, replaced`}
          </motion.span>
        </div>

        {/* The bucket */}
        <div className="min-w-0 rounded-md border border-line-strong bg-paper p-3">
          <ServiceTile name={BUCKET} caption="S3 bucket" category="storage" icon={Boxes} size="sm" className="max-w-full [&_.block]:[overflow-wrap:anywhere]" />
          <div aria-hidden className="mt-2 flex gap-1.5 text-ink-3">
            {[0, 1, 2].map((i) => (
              <span key={i} className="grid size-8 place-items-center rounded-[4px] border border-line bg-panel">
                <ImageIcon className="size-4" />
              </span>
            ))}
          </div>
          <Pill tone="ok" className="mt-2">
            <Check aria-hidden />
            Photos load
          </Pill>
        </div>
      </div>

      {/* What changes as time passes. The live region stays put; only its content is re-keyed to flash. */}
      <div aria-live="polite" aria-atomic className="mt-4 border-t border-line pt-4">
        <motion.div
          key={`${mode}-${days}`}
          initial={days > 0 && !reduce ? { opacity: 0.4 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
          className="grid gap-4 sm:grid-cols-3"
        >
          <Readout label="Day" value={days + 1} />
          <Readout
            label="What the app signs with"
            value={key ? 'Access key' : <Term k="temporary-credentials">Temporary credentials</Term>}
            hint={
              key
                ? days === 0
                  ? 'created today'
                  : `the same key, ${days} days old`
                : days > 0
                  ? 'the old ones expired and were replaced'
                  : 'issued recently'
            }
            tone={key && days > 0 ? 'warn' : 'neutral'}
          />
          <Readout
            label="Lifetime"
            value={key ? 'Until deleted' : 'Rotated for you'}
            hint={key ? 'until someone turns it off or deletes it' : 'new ones arrive automatically'}
            tone={key ? 'warn' : 'ok'}
          />
        </motion.div>
      </div>

      <p className="mt-4 text-xs text-ink-3">
        <a className="font-bold text-signal underline underline-offset-2 hover:text-ink" href={href.lesson('foundations', 'iam-roles')}>
          Roles, in Module 1
        </a>
      </p>
    </Bench>
  )
}
