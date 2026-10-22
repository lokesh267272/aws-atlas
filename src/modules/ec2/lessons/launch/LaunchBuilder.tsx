import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Check, Circle, CircleDashed, Lock, Rocket, Server, Trash2, TriangleAlert, WifiOff } from 'lucide-react'
// The extension is explicit: on a case-insensitive disk "components/Challenge" would resolve to challenge.ts.
import { Challenge, useChallenge } from '../../../../components/Challenge.tsx'
import { Button, Pill, Segmented } from '../../../../components/controls'
import { ServiceTile } from '../../../../components/diagram'
import { Bench } from '../../../../components/lesson'
import { Term } from '../../../../components/Term'
import { cn } from '../../../../lib/cn'
import { story } from '../../story'
import {
  AMIS,
  INSTANCE_TYPES,
  KEY_PAIR_NAME,
  SECURITY_GROUPS,
  STORAGE_SIZES,
  emptyConfig,
  menuReachable,
  missingParts,
  securityGroupChoice,
  solution,
  transition,
  type InstanceState,
  type LaunchConfig,
  type LaunchPart,
  type SecurityGroupChoice,
} from './launchModel'

/** How long the instance stays pending before it runs (skipped with reduced motion). */
const BOOT_MS = 2200
/** An example address from a range kept for documentation, so it never points at a real server. */
const PUBLIC_IP = '203.0.113.24'

/** One line per missing part: why the part matters. Never that AWS refuses to launch. */
const WHY: Record<LaunchPart, { name: ReactNode; why: string }> = {
  ami: { name: <Term k="ami">AMI</Term>, why: 'picks the operating system your server starts with.' },
  instanceType: { name: <Term k="instance-type">Instance type</Term>, why: 'sets how much CPU and memory you rent.' },
  keyPair: { name: <Term k="key-pair">Key pair</Term>, why: 'decides whether you can log in with your own key.' },
  securityGroup: { name: <Term k="security-group">Security group</Term>, why: 'decides what traffic can reach the server.' },
  storage: { name: 'Storage', why: 'sizes the disk that holds the system and your app.' },
}

const SG_OPTIONS: { value: SecurityGroupChoice; label: string; lets: string }[] = [
  { value: 'nothing', label: 'Nothing', lets: 'Lets nothing in.' },
  { value: 'ssh', label: 'SSH only', lets: 'Lets in SSH logins from anywhere.' },
  { value: 'web', label: 'Web only', lets: 'Lets in web browsers from anywhere.' },
  { value: 'web-ssh', label: 'Web + SSH', lets: 'Lets in web browsers and SSH logins, from anywhere.' },
]

const MENU = ['Masala dosa', 'Veg biryani', 'Mango lassi']

/** One part of the launch: its AWS name, whether it is chosen, and the choice itself. */
function Slot({ title, done, locked, children }: { title: ReactNode; done: boolean; locked: boolean; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-line bg-paper/50 p-3">
      <p className="mb-1 flex items-center gap-1.5 font-bold text-ink">
        {done ? (
          <Check aria-hidden className="size-4 shrink-0 text-ok" />
        ) : (
          <Circle aria-hidden className="size-4 shrink-0 text-ink-3" />
        )}
        {title}
        {locked && (
          <Pill className="ml-auto">
            <Lock aria-hidden />
            Locked
          </Pill>
        )}
      </p>
      {children}
    </div>
  )
}

const note = 'mt-1.5 text-sm text-ink-3'

function StatePill({ instance }: { instance: InstanceState }) {
  if (instance === 'running') return <Pill tone="ok">Running</Pill>
  if (instance === 'pending') return <Pill tone="warn">Pending</Pill>
  return <Pill>Not launched</Pill>
}

function InstanceCard({ config, instance, reduced }: { config: LaunchConfig; instance: InstanceState; reduced: boolean }) {
  const ami = AMIS.find((a) => a.value === config.ami)
  const launched = instance !== 'not-launched'
  return (
    <div className="rounded-md border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ServiceTile
          name={`${story.appName} server`}
          category="compute"
          icon={Server}
          size="sm"
          caption={launched ? `${config.instanceType} · ${ami?.label}` : 'not launched yet'}
          muted={!launched}
          status={instance === 'running' ? 'ok' : instance === 'pending' ? 'busy' : undefined}
        />
        <StatePill instance={instance} />
      </div>
      {instance === 'pending' && !reduced && (
        <span aria-hidden className="mt-2 block h-1.5 overflow-hidden rounded-full bg-sunken">
          <motion.span
            className="block h-full origin-left rounded-full bg-warn"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: BOOT_MS / 1000, ease: 'linear' }}
          />
        </span>
      )}
      <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
        <dt className="text-ink-3">
          <Term k="availability-zone">AZ</Term>
        </dt>
        <dd className="font-mono text-ink">{story.azs[0]}</dd>
        <dt className="text-ink-3">
          <Term k="public-ip">Public IP</Term>
        </dt>
        <dd className={cn('font-mono', launched ? 'text-ink' : 'text-ink-3')}>
          {launched ? PUBLIC_IP : 'none yet'}
        </dd>
      </dl>
    </div>
  )
}

/** A tiny browser window pointed at the instance's address. */
function MenuPage({ instance, reachable, reduced }: { instance: InstanceState; reachable: boolean; reduced: boolean }) {
  const running = instance === 'running'
  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border bg-panel',
        running ? (reachable ? 'border-ok' : 'border-bad') : 'border-line-strong',
      )}
    >
      <div className="flex items-center gap-2 border-b border-line bg-sunken px-2.5 py-1.5">
        <span aria-hidden className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-2 rounded-full bg-line-strong" />
          ))}
        </span>
        <span className="min-w-0 flex-1 truncate rounded-[3px] bg-panel px-2 py-0.5 font-mono text-xs text-ink-2">
          {running ? `http://${PUBLIC_IP}` : 'no address yet'}
        </span>
      </div>
      <div aria-live="polite" className="min-h-[8.5rem] p-3">
        {instance === 'not-launched' && (
          <p className="text-sm text-ink-3">Launch a server to get an address customers can visit.</p>
        )}
        {instance === 'pending' && <p className="text-sm text-ink-3">Starting up...</p>}
        {running && reachable && (
          <motion.div initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <p className="display text-lg text-ink">{story.appName}</p>
            <p className="text-xs text-ink-3">Today&apos;s menu</p>
            <ul className="mt-1.5 grid gap-0.5 text-sm text-ink-2">
              {MENU.map((dish) => (
                <li key={dish}>{dish}</li>
              ))}
            </ul>
            <Pill tone="ok" className="mt-2">
              <Check aria-hidden />
              Menu page online
            </Pill>
          </motion.div>
        )}
        {running && !reachable && (
          <motion.div initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <p className="flex items-center gap-1.5 font-bold text-ink">
              <WifiOff aria-hidden className="size-4 shrink-0 text-bad" />
              This site can&apos;t be reached
            </p>
            <p className="mt-1 text-sm text-ink-2">The security group lets in no web traffic, so the page never loads.</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}

/** Visual B and the lesson's challenge: choose the five parts of a launch, launch, and get the menu page online. */
export function LaunchBuilder() {
  const reduced = useReducedMotion() ?? false
  const [config, setConfig] = useState<LaunchConfig>(emptyConfig)
  const [instance, setInstance] = useState<InstanceState>('not-launched')
  const challenge = useChallenge()
  const { solve, fail, show } = challenge
  const reasonsId = useId()
  // Set by Show me: the boot that follows is the demonstration, so it finishes the challenge as shown.
  const demo = useRef(false)

  const missing = missingParts(config)
  const locked = instance !== 'not-launched'
  const reachable = menuReachable(config, instance)
  const type = INSTANCE_TYPES.find((t) => t.value === config.instanceType)
  const sgChoice = securityGroupChoice(config.securityGroup)
  const sgOption = SG_OPTIONS.find((o) => o.value === sgChoice)
  const set = <K extends keyof LaunchConfig>(key: K, value: LaunchConfig[K]) => setConfig((c) => ({ ...c, [key]: value }))

  // Pending turns into running after a short wait (at once with reduced motion). That is when the launch is judged.
  // Terminate, Reset or Show me during the wait clears the timer, so a stale boot never lands.
  useEffect(() => {
    if (instance !== 'pending') return
    const t = window.setTimeout(
      () => {
        const next = transition('pending', 'boot-complete', config)
        setInstance(next)
        if (menuReachable(config, next)) {
          if (demo.current) show()
          else solve()
        } else fail()
      },
      reduced ? 0 : BOOT_MS,
    )
    return () => window.clearTimeout(t)
  }, [instance, config, reduced, solve, fail, show])

  const launch = () => {
    demo.current = false
    setInstance((s) => transition(s, 'launch', config))
  }
  const terminate = () => {
    demo.current = false
    setInstance('not-launched')
  }
  // Show me starts a fresh launch with parts that work, replacing any instance already there.
  const showMe = () => {
    demo.current = true
    setConfig(solution)
    setInstance(transition('not-launched', 'launch', solution))
  }
  const reset = () => {
    demo.current = false
    setConfig(emptyConfig)
    setInstance('not-launched')
    challenge.reset()
  }

  const canLaunch = instance === 'not-launched' && missing.length === 0

  return (
    <Bench
      title="Try it"
      intro={
        <>
          Choose all five parts, press <strong className="text-ink-2">Launch</strong>, and notice which part decides
          whether customers can open the menu page.
        </>
      }
      onReset={reset}
    >
      <Challenge
        goal="Get the menu page online"
        checks={[
          { label: 'All five parts chosen', done: missing.length === 0 },
          {
            label: (
              <>
                Customers&apos; browsers can get in through the <Term k="security-group">security group</Term>
              </>
            ),
            done: config.securityGroup?.web === true,
          },
          {
            label: (
              <>
                The <Term k="instance">server</Term> is running
              </>
            ),
            done: instance === 'running',
          },
        ]}
        state={challenge.state}
        hint={
          <>
            Browsers send web traffic, terminate the instance, choose a security group option with <strong>Web</strong> in it,
            then launch again.
          </>
        }
        onHint={challenge.hint}
        onShowMe={showMe}
        stale={!reachable}
        successNote="It's running and its security group lets web traffic in (we assume a web server is installed)."
      />

      <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
        <fieldset disabled={locked} className="grid min-w-0 content-start gap-3 disabled:opacity-80">
          <legend className="sr-only">Parts of the launch</legend>

          <Slot title={<Term k="ami">AMI</Term>} done={config.ami !== null} locked={locked}>
            <Segmented
              label="Which operating system?"
              size="sm"
              value={config.ami ?? ''}
              options={AMIS.map((a) => ({ value: a.value, label: a.label }))}
              onChange={(v) => set('ami', v)}
            />
          </Slot>

          <Slot title={<Term k="instance-type">Instance type</Term>} done={config.instanceType !== null} locked={locked}>
            <Segmented
              label="How much CPU and memory?"
              size="sm"
              value={config.instanceType ?? ''}
              options={INSTANCE_TYPES.map((t) => ({ value: t.value, label: <span className="font-mono">{t.value}</span> }))}
              onChange={(v) => set('instanceType', v)}
            />
            <p className={note}>
              {type ? (
                <>
                  {type.vcpu} <Term k="vcpu">virtual CPUs</Term> and {type.memGiB} <Term k="gib">GiB</Term> of memory.
                </>
              ) : (
                'Bigger types get more of both.'
              )}
            </p>
          </Slot>

          <Slot title={<Term k="key-pair">Key pair</Term>} done={config.keyPair !== null} locked={locked}>
            <Segmented
              label="How will you log in?"
              size="sm"
              value={config.keyPair ?? ''}
              options={[
                { value: KEY_PAIR_NAME, label: <span className="font-mono">{KEY_PAIR_NAME}</span> },
                { value: 'none', label: 'No key pair' },
              ]}
              onChange={(v) => set('keyPair', v)}
            />
            {config.keyPair === 'none' ? (
              <Pill tone="warn" className="mt-2">
                <TriangleAlert aria-hidden />
                No key pair: no SSH key login
              </Pill>
            ) : (
              <p className={note}>
                You keep the private key to log in over <Term k="ssh">SSH</Term>.
              </p>
            )}
          </Slot>

          <Slot title={<Term k="security-group">Security group</Term>} done={config.securityGroup !== null} locked={locked}>
            <Segmented
              label="What traffic can get in?"
              size="sm"
              value={sgChoice}
              options={SG_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              onChange={(v) => v && set('securityGroup', { ...SECURITY_GROUPS[v] })}
            />
            <p className={note}>{sgOption ? sgOption.lets : 'Each choice is a set of rules for incoming traffic.'}</p>
            {config.securityGroup?.sshFromAnywhere && (
              <Pill tone="warn" className="mt-2">
                <TriangleAlert aria-hidden />
                SSH open to the whole internet
              </Pill>
            )}
          </Slot>

          <Slot title="Storage" done={config.storageGiB !== null} locked={locked}>
            <Segmented
              label="How big is the root disk?"
              size="sm"
              value={config.storageGiB === null ? '' : String(config.storageGiB)}
              options={STORAGE_SIZES.map((n) => ({ value: String(n), label: `${n} GiB` }))}
              onChange={(v) => set('storageGiB', Number(v))}
            />
            <p className={note}>
              The <Term k="root-volume">root volume</Term>, an <Term k="ebs">EBS</Term> disk for the operating system and
              your app.
            </p>
          </Slot>
        </fieldset>

        <div className="flex min-w-0 flex-col gap-3">
          <div>
            {instance === 'running' ? (
              <Button variant="danger" onClick={terminate}>
                <Trash2 aria-hidden />
                Terminate
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={launch}
                aria-disabled={!canLaunch}
                aria-describedby={instance === 'not-launched' && missing.length > 0 ? reasonsId : undefined}
              >
                <Rocket aria-hidden />
                Launch
              </Button>
            )}
            {instance === 'running' && <p className={note}>Terminate it to change parts and launch again.</p>}
          </div>

          {instance === 'not-launched' && missing.length > 0 && (
            <div id={reasonsId}>
              <p className="text-sm font-bold text-ink-2">Still to choose</p>
              <ul className="mt-1 grid gap-1">
                {missing.map((p) => (
                  <li key={p} className="flex items-start gap-1.5 text-sm text-ink-2">
                    <CircleDashed aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-3" />
                    <span>
                      <strong className="text-ink">{WHY[p].name}</strong>: {WHY[p].why}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <InstanceCard config={config} instance={instance} reduced={reduced} />
          <MenuPage instance={instance} reachable={reachable} reduced={reduced} />
        </div>
      </div>
    </Bench>
  )
}
