import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { KeyRound, Laptop, Lock, LockOpen, Server } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Pill } from '../../../../components/controls'
import { Term } from '../../../../components/Term'
import { cn } from '../../../../lib/cn'

type KeyId = 'yours' | 'other'

/** Two private keys on the laptop. Only one matches the public key on the server; the "teeth" show it. */
const KEYS: Record<KeyId, { file: string; caption: string; teeth: number[] }> = {
  yours: { file: 'mealhop-key.pem', caption: 'private key, only you have it', teeth: [3, 1, 4, 2] },
  other: { file: 'old-laptop.pem', caption: 'a different private key', teeth: [2, 4, 1, 3] },
}
const PUBLIC_TEETH = KEYS.yours.teeth
/** RFC 5737 documentation address, never a real server. */
const SERVER_IP = '198.51.100.24'

const matches = (k: KeyId) => KEYS[k].teeth.join() === PUBLIC_TEETH.join()

/** "Try it: log in with a key pair": one interaction, pick a key and try to log in. */
export function KeyPairDemo() {
  const reduce = useReducedMotion() === true
  const [attempt, setAttempt] = useState<{ key: KeyId; n: number } | null>(null)
  const ok = attempt ? matches(attempt.key) : null

  const tryKey = (key: KeyId) => setAttempt((a) => ({ key, n: (a?.n ?? 0) + 1 }))

  return (
    <Bench
      title="Try it: log in with a key pair"
      intro={
        <>
          Try each key: only the private half of your <Term k="ssh-key-pair">key pair</Term> matches the public half on the server.
        </>
      }
      onReset={() => setAttempt(null)}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Your side: each key is the button that tries it */}
        <div className="min-w-0 rounded-md border border-line-strong bg-paper p-3">
          <p className="flex items-center gap-2 text-sm font-bold text-ink">
            <Laptop aria-hidden className="size-4 text-ink-2" />
            Your laptop
          </p>
          <div className="mt-2 grid gap-2" role="group" aria-label="Log in with a key">
            {(['yours', 'other'] as const).map((k) => {
              const tried = attempt?.key === k
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => tryKey(k)}
                  aria-pressed={tried}
                  className={cn(
                    'flex min-w-0 items-center gap-2.5 rounded-md border bg-panel p-2 text-left transition-colors hover:border-ink',
                    tried ? 'border-signal outline-2 outline-signal' : 'border-line',
                  )}
                >
                  {/* Only this inner icon is keyed per try, so the button keeps keyboard focus */}
                  <motion.span
                    key={tried ? attempt.n : 0}
                    animate={tried && !reduce ? { x: [0, 10, 0] } : undefined}
                    transition={{ duration: 0.4 }}
                    className="flex size-12 shrink-0 flex-col items-center justify-center gap-1 rounded-[4px] border border-line-strong bg-sunken text-ink-2"
                  >
                    <KeyRound aria-hidden className="size-4" />
                    <Teeth pattern={KEYS[k].teeth} />
                  </motion.span>
                  <span className="min-w-0 text-xs leading-tight">
                    <span className="block font-mono text-sm font-bold text-ink [overflow-wrap:anywhere]">{KEYS[k].file}</span>
                    <span className="block text-ink-3">{KEYS[k].caption}</span>
                    <span className="mt-1 block font-bold text-signal">Log in with this key</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* The server's side: the public key, drawn as a lock with the same teeth */}
        <div className="min-w-0 rounded-md border border-line-strong bg-paper p-3">
          <p className="flex items-center gap-2 text-sm font-bold text-ink">
            <span className="grid size-5 place-items-center rounded-[3px] text-white" style={{ background: 'var(--color-compute)' }}>
              <Server aria-hidden className="size-3.5" />
            </span>
            Server <span className="font-mono text-xs font-normal text-ink-3">{SERVER_IP}</span>
          </p>
          <motion.div
            key={attempt?.n ?? 0}
            animate={attempt && !reduce ? (ok ? { scale: [1, 1.06, 1] } : { x: [0, -6, 6, -4, 4, 0] }) : undefined}
            transition={{ duration: 0.45, delay: reduce ? 0 : 0.3 }}
            className={cn(
              'mt-2 flex min-w-0 items-center gap-2.5 rounded-md border bg-panel p-2',
              ok === true ? 'border-ok' : ok === false ? 'border-bad' : 'border-line',
            )}
          >
            <span
              className={cn(
                'flex size-12 shrink-0 flex-col items-center justify-center gap-1 rounded-[4px] border',
                ok === true ? 'border-ok bg-ok-soft text-ok' : ok === false ? 'border-bad bg-bad-soft text-bad' : 'border-line-strong bg-sunken text-ink-2',
              )}
            >
              {ok ? <LockOpen aria-hidden className="size-4" /> : <Lock aria-hidden className="size-4" />}
              <Teeth pattern={PUBLIC_TEETH} />
            </span>
            <span className="min-w-0 text-xs leading-tight">
              <span className="block text-sm font-bold text-ink">Public key</span>
              <span className="block text-ink-3">put on the server at launch</span>
            </span>
          </motion.div>
          <p className="mt-2 text-xs text-ink-3">The shapes must match to log in.</p>
        </div>
      </div>

      {/* What the terminal would say */}
      <div aria-live="polite" className="mt-4 min-w-0">
        {attempt && (
          <Pill tone={ok ? 'ok' : 'bad'} className="mb-1.5">
            {ok ? 'Logged in' : 'Refused'}
          </Pill>
        )}
        <div className="overflow-x-auto rounded-md bg-screen px-3 py-2.5 font-mono text-xs leading-relaxed text-screen-text sm:text-sm">
          {attempt ? (
            <>
              <p>
                <span className="text-screen-dim">$ </span>
                ssh -i {KEYS[attempt.key].file} ec2-user@{SERVER_IP}
              </p>
              <p>{ok ? '[ec2-user@ip-172-31-5-20 ~]$' : `ec2-user@${SERVER_IP}: Permission denied (publickey).`}</p>
            </>
          ) : (
            <p className="text-screen-dim">Pick a key to try logging in.</p>
          )}
        </div>
      </div>
    </Bench>
  )
}

/** A small key-teeth pattern: four bars of different heights. Matching keys share the same bars. */
function Teeth({ pattern }: { pattern: number[] }) {
  return (
    <svg aria-hidden viewBox="0 0 16 10" className="h-3.5 w-6">
      {pattern.map((h, i) => (
        <rect key={i} x={i * 4 + 0.5} y={10 - h * 2.5} width={3} height={h * 2.5} fill="currentColor" />
      ))}
    </svg>
  )
}
