import { useId, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import {
  ArchiveRestore,
  ArrowDown,
  Camera,
  Cpu,
  HardDrive,
  Info,
  MemoryStick,
  PenLine,
  Play,
  Plug,
  Power,
  Rocket,
  RotateCw,
  Server,
  ServerCrash,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Button, Pill } from '../../../../components/controls'
import { Boundary, ServiceTile } from '../../../../components/diagram'
import { Term } from '../../../../components/Term'
import { categories } from '../../../../course/categories'
import { cn } from '../../../../lib/cn'
import { story } from '../../story'
import { canDo, initialLab, labStep, type Disk, type DiskAction, type LabCommand, type LabState } from './storageModel'

const actionButtons: { action: DiskAction; label: string; icon: LucideIcon }[] = [
  { action: 'reboot', label: 'Reboot', icon: RotateCw },
  { action: 'stop', label: 'Stop', icon: Power },
  { action: 'start', label: 'Start', icon: Play },
  { action: 'terminate', label: 'Terminate', icon: Trash2 },
  { action: 'host-failure', label: 'Host hardware fails', icon: ServerCrash },
]

const actionText: Record<DiskAction, string> = {
  reboot: 'Rebooted: every disk kept its data.',
  stop: 'Stopped: instance store wiped, EBS kept.',
  start: 'Started: instance store empty, EBS data back.',
  terminate: 'Terminated: root volume deleted, extra volume kept.',
  'host-failure': 'Host failed and the server stopped: Start moves it to a healthy host.',
}

function statusText(lab: LabState): string {
  const last = lab.last
  if (!last) return 'Every disk holds data: press a button.'
  switch (last.kind) {
    case 'action':
      return actionText[last.action]
    case 'relaunch':
      return 'New server: empty root volume. Attach the kept volume yourself.'
    case 'attach':
      return 'Extra volume attached, with all its data.'
    case 'write':
      return 'Data written to every disk the server can reach.'
    case 'snapshot':
      return 'Snapshot saved outside the AZ: restore it elsewhere.'
    case 'restore':
      return `New volume made from the snapshot in ${story.azs[1]}.`
  }
}

type Badge = { tone: 'ok' | 'bad' | 'neutral'; text: string }

/** The small status pill on each disk: what the last command did to it. */
function diskBadge(lab: LabState, disk: Disk): Badge | null {
  if (disk === 'ebs-root' && lab.rootDeleted) return { tone: 'bad', text: 'deleted' }
  if (disk === 'instance-store' && lab.server === 'terminated') return { tone: 'bad', text: 'gone with the server' }
  if (disk === 'ebs-extra' && !lab.extraAttached) return { tone: 'ok', text: 'kept, detached' }
  const last = lab.last
  if (last?.kind === 'relaunch' && disk !== 'ebs-extra') return { tone: 'neutral', text: 'new, empty' }
  if (last?.kind === 'attach' && disk === 'ebs-extra') return { tone: 'ok', text: 'you attached it' }
  if (last?.kind === 'action') {
    if (last.lost.includes(disk)) return { tone: 'bad', text: 'wiped' }
    if (lab.data[disk]) return { tone: 'ok', text: 'kept' }
  }
  return lab.data[disk] ? null : { tone: 'neutral', text: 'empty' }
}

const serverCaption = { running: 'running', stopped: 'stopped', terminated: 'terminated' } as const

export function DiskLab() {
  const reduce = useReducedMotion() === true
  const [lab, setLab] = useState<LabState>(initialLab)
  const serverGroup = useId()
  const dataGroup = useId()
  const send = (c: LabCommand) => setLab((s) => labStep(s, c))

  const hostBroken = lab.last?.kind === 'action' && lab.last.action === 'host-failure' && lab.server === 'stopped'
  const terminated = lab.server === 'terminated'

  return (
    <Bench
      title="Try it: which disks remember?"
      intro={
        <>
          Press each button and watch which disks keep their data, then take a{' '}
          <Term k="ebs-snapshot">snapshot</Term> and restore it in another <Term k="availability-zone">AZ</Term>.
        </>
      }
      onReset={() => setLab(initialLab)}
    >
      <div className="flex flex-col gap-4">
        {/* aria-disabled, not disabled, so keyboard focus stays on a button that just became unavailable. */}
        <div role="group" aria-labelledby={serverGroup}>
          <p id={serverGroup} className="mb-1.5 text-sm font-bold text-ink-2">
            Do something to the server
          </p>
          <div className="flex flex-wrap gap-2">
            {actionButtons.map(({ action, label, icon: Icon }) => {
              const ok = canDo(lab.server, action)
              return (
                <Button key={action} size="sm" aria-disabled={!ok} onClick={() => ok && send(action)}>
                  <Icon aria-hidden />
                  {label}
                </Button>
              )
            })}
            <Button size="sm" variant="primary" aria-disabled={!terminated} onClick={() => terminated && send('relaunch')}>
              <Rocket aria-hidden />
              Launch a new server
            </Button>
            <Button
              size="sm"
              variant="primary"
              aria-disabled={lab.server !== 'running' || lab.extraAttached}
              onClick={() => lab.server === 'running' && !lab.extraAttached && send('attach')}
            >
              <Plug aria-hidden />
              Attach the kept volume
            </Button>
          </div>
        </div>

        <div role="group" aria-labelledby={dataGroup}>
          <p id={dataGroup} className="mb-1.5 text-sm font-bold text-ink-2">
            Your data
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" aria-disabled={lab.server !== 'running'} onClick={() => lab.server === 'running' && send('write')}>
              <PenLine aria-hidden />
              Write data again
            </Button>
            <Button size="sm" onClick={() => send('snapshot')}>
              <Camera aria-hidden />
              Take snapshot
            </Button>
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-md border border-line bg-paper px-3.5 py-3" aria-live="polite">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-signal" />
          <p className="text-ink-2">{statusText(lab)}</p>
        </div>

        <Boundary kind="region" label={story.regionName}>
          <div className="flex flex-col gap-3">
            <Boundary kind="az" label={story.azs[0]}>
              <div className="flex flex-col md:flex-row md:items-stretch">
                {/* The host: the server and its instance store live in this one machine. */}
                <div
                  className={cn(
                    'min-w-0 rounded-md border-2 p-2.5 md:flex-1',
                    hostBroken ? 'border-bad bg-bad-soft/40' : 'border-line-strong bg-paper/60',
                  )}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-ink-2">
                      <Cpu aria-hidden className="size-3.5" />
                      <Term k="host-computer">Host computer</Term>
                    </span>
                    {hostBroken && <Pill tone="bad">hardware failed</Pill>}
                  </div>
                  <div className="flex flex-col items-start gap-2">
                    <ServiceTile
                      name={`${story.appName} server`}
                      category="compute"
                      icon={Server}
                      caption={serverCaption[lab.server]}
                      status={lab.server === 'running' ? 'ok' : terminated ? 'down' : undefined}
                      muted={lab.server === 'stopped'}
                    />
                    <DiskCard
                      name={<Term k="instance-store">Instance store</Term>}
                      lines={['inside the host']}
                      icon={MemoryStick}
                      color={categories.storage.color}
                      dashed
                      hasData={lab.data['instance-store']}
                      gone={terminated}
                      badge={diskBadge(lab, 'instance-store')}
                      reduce={reduce}
                    />
                  </div>
                </div>

                <div aria-hidden className="flex items-center gap-2 py-1 pl-6 md:flex-col md:justify-center md:px-1 md:py-0">
                  <span className="h-6 border-l-2 border-dashed border-line-strong md:h-0 md:w-12 md:border-l-0 md:border-t-2" />
                  <span className="text-xs text-ink-3">network</span>
                </div>

                {/* EBS volumes: separate boxes, reached over the network. */}
                <div className="grid min-w-0 content-start gap-2 sm:grid-cols-2 md:flex-1 md:grid-cols-1">
                  <DiskCard
                    name={<Term k="root-volume">Root volume</Term>}
                    lines={[
                      <>
                        <Term k="ebs">EBS</Term>, holds the OS and app
                      </>,
                      <>
                        <Term k="delete-on-termination">Delete on termination</Term> <Pill tone="warn">Yes</Pill>
                      </>,
                    ]}
                    icon={HardDrive}
                    color={categories.storage.color}
                    hasData={lab.data['ebs-root']}
                    gone={lab.rootDeleted}
                    badge={diskBadge(lab, 'ebs-root')}
                    reduce={reduce}
                  />
                  <DiskCard
                    name={<Term k="ebs-volume">Extra volume</Term>}
                    lines={[
                      <>
                        <Term k="ebs">EBS</Term>, attached after launch
                      </>,
                      <>
                        <Term k="delete-on-termination">Delete on termination</Term> <Pill tone="ok">No</Pill>
                      </>,
                    ]}
                    icon={HardDrive}
                    color={categories.storage.color}
                    hasData={lab.data['ebs-extra']}
                    gone={false}
                    badge={diskBadge(lab, 'ebs-extra')}
                    reduce={reduce}
                  />
                </div>
              </div>
            </Boundary>

            {/* Outside the AZ, still inside the Region: where the snapshot lives. */}
            {lab.snapshot ? (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduce ? 0 : 0.5 }}
                className="flex flex-col gap-2"
              >
                <p aria-hidden className="flex items-center gap-1.5 pl-3 text-xs text-ink-3">
                  <ArrowDown className="size-3.5" />
                  copy leaves the AZ
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <DiskCard
                    name={
                      <>
                        <Term k="ebs-snapshot">Snapshot</Term> of the extra volume
                      </>
                    }
                    lines={[
                      <>
                        stored by AWS in <Term k="s3">S3</Term> (not a bucket you can see)
                      </>,
                      'restore into any AZ in this Region',
                    ]}
                    icon={Camera}
                    color={categories.storage.color}
                    hasData={lab.snapshot.hasData}
                    gone={false}
                    badge={null}
                    reduce={reduce}
                  />
                  <Button size="sm" aria-disabled={lab.restored} onClick={() => !lab.restored && send('restore')}>
                    <ArchiveRestore aria-hidden />
                    Restore into {story.azs[1]}
                  </Button>
                </div>
              </motion.div>
            ) : (
              <p className="rounded-md border border-dashed border-line px-3 py-2 text-xs text-ink-3">
                No snapshot yet. Snapshots are kept here, outside the AZ.
              </p>
            )}

            {lab.restored && lab.snapshot && (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduce ? 0 : 0.5 }}
              >
                <Boundary kind="az" label={story.azs[1]}>
                  <DiskCard
                    name={<Term k="ebs-volume">New volume</Term>}
                    lines={['made from the snapshot']}
                    icon={HardDrive}
                    color={categories.storage.color}
                    hasData={lab.snapshot.hasData}
                    gone={false}
                    badge={{ tone: 'ok', text: 'restored' }}
                    reduce={reduce}
                  />
                </Boundary>
              </motion.div>
            )}
          </div>
        </Boundary>
      </div>
    </Bench>
  )
}

/* ------------------------------------------------------------------ Parts */

function DiskCard({
  name,
  lines,
  icon: Icon,
  color,
  hasData,
  gone,
  dashed = false,
  badge,
  reduce,
}: {
  name: ReactNode
  lines: ReactNode[]
  icon: LucideIcon
  color: string
  hasData: boolean
  /** The disk no longer exists: drawn as a dashed outline. */
  gone: boolean
  /** A dashed outline that marks a disk inside the host rather than a separate EBS volume. */
  dashed?: boolean
  badge: Badge | null
  reduce: boolean
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 max-w-full items-start gap-2.5 rounded-md border p-2',
        gone ? 'border-dashed border-line-strong bg-transparent' : dashed ? 'border-dashed border-line-strong bg-panel' : 'border-line bg-panel',
      )}
    >
      <span
        className="grid size-8 shrink-0 place-items-center rounded-[4px] text-white [&_svg]:size-4"
        style={{ background: gone ? 'var(--color-line-strong)' : color }}
      >
        <Icon aria-hidden />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn('text-sm font-bold', gone ? 'text-ink-3' : 'text-ink')}>{name}</span>
          {badge && <Pill tone={badge.tone}>{badge.text}</Pill>}
        </div>
        {lines.map((line, i) => (
          <div key={i} className="text-xs leading-snug text-ink-3">
            {line}
          </div>
        ))}
        <DataBlocks on={hasData} reduce={reduce} />
        <span className="sr-only">{hasData ? '(holds your data)' : '(no data)'}</span>
      </div>
    </div>
  )
}

/** Three data blocks: filled when the disk holds data, empty dashed slots when it does not. */
function DataBlocks({ on, reduce }: { on: boolean; reduce: boolean }) {
  return (
    <span aria-hidden className="mt-1.5 flex gap-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="relative size-4 rounded-[3px] border border-dashed border-line-strong">
          <motion.span
            className="absolute -inset-px rounded-[3px] bg-ink-2"
            initial={false}
            animate={{ opacity: on ? 1 : 0, scale: on ? 1 : 0.3 }}
            transition={reduce ? { duration: 0 } : { duration: 0.45, delay: i * 0.08 }}
          />
        </span>
      ))}
    </span>
  )
}
