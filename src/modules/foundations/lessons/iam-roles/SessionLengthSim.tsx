import { useState } from 'react'
import { Ban, CircleCheck } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Slider, Switch } from '../../../../components/controls'
import { cn } from '../../../../lib/cn'
import { fmtClock, START } from './keyVsRoleData'

const MAX_MIN = 12 * 60
const DEFAULT_REQUEST = 60

const fmtDuration = (m: number) => {
  const h = Math.floor(m / 60)
  const min = m % 60
  if (h === 0) return `${min} min`
  if (min === 0) return `${h} ${h === 1 ? 'hour' : 'hours'}`
  return `${h} h ${min} min`
}

export function SessionLengthSim() {
  const [maxHours, setMaxHours] = useState(1)
  const [useDefault, setUseDefault] = useState(false)
  const [request, setRequest] = useState(DEFAULT_REQUEST)

  const asked = useDefault ? DEFAULT_REQUEST : request
  const maxMin = maxHours * 60
  const ok = asked <= maxMin

  const reset = () => {
    setMaxHours(1)
    setUseDefault(false)
    setRequest(DEFAULT_REQUEST)
  }

  return (
    <Bench
      title="Try it: ask for a session length"
      intro="You are a developer assuming the DeveloperReadOnly role from a script. Set the role’s maximum session duration, then ask AWS STS for a session length. Find out what works and what fails."
      onReset={reset}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Slider
          label="Role’s maximum session duration (set by an admin)"
          value={maxHours}
          min={1}
          max={12}
          onChange={setMaxHours}
          format={(v) => `${v} ${v === 1 ? 'hour' : 'hours'}`}
        />
        <div className="min-w-0">
          <Slider
            label="Length you ask for"
            value={useDefault ? DEFAULT_REQUEST : request}
            min={15}
            max={MAX_MIN}
            step={15}
            onChange={(v) => {
              setUseDefault(false)
              setRequest(v)
            }}
            format={(v) =>
              useDefault ? 'Not set (STS uses 1 hour)' : `${fmtDuration(v)} (${(v * 60).toLocaleString('en-US')} seconds)`
            }
          />
          <Switch className="mt-3" label="Don’t ask for a length (use the default)" checked={useDefault} onChange={setUseDefault} />
        </div>
      </div>

      {/* Timeline from 0 to 12 hours */}
      <figure className="mt-6" aria-hidden>
        <div className="relative h-10">
          <div className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-full bg-sunken" />
          <div
            className={cn('absolute left-0 top-1/2 h-3 -translate-y-1/2 rounded-full', ok ? 'bg-ok' : 'bg-bad')}
            style={{ width: `${(asked / MAX_MIN) * 100}%` }}
          />
          <div className="absolute top-0 h-full w-0.5 -translate-x-1/2 bg-ink" style={{ left: `${(maxMin / MAX_MIN) * 100}%` }} />
        </div>
        <div className="relative mt-1 h-5 text-xs text-ink-3">
          {[0, 3, 6, 9, 12].map((h) => (
            <span
              key={h}
              className={cn('absolute', h === 0 ? 'left-0' : h === 12 ? 'right-0' : '-translate-x-1/2')}
              style={h === 0 || h === 12 ? undefined : { left: `${(h / 12) * 100}%` }}
            >
              {h} h
            </span>
          ))}
        </div>
        <figcaption className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-0.5 bg-ink" /> Role maximum: {fmtDuration(maxMin)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={cn('inline-block h-2 w-4 rounded-full', ok ? 'bg-ok' : 'bg-bad')} /> Your request: {fmtDuration(asked)}
          </span>
        </figcaption>
      </figure>

      <div
        aria-live="polite"
        className={cn('mt-4 flex items-start gap-3 rounded-md px-4 py-3', ok ? 'bg-ok-soft' : 'bg-bad-soft')}
      >
        {ok ? (
          <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-ok" />
        ) : (
          <Ban aria-hidden className="mt-0.5 size-5 shrink-0 text-bad" />
        )}
        <div>
          <p className={cn('font-bold', ok ? 'text-ok' : 'text-bad')}>
            {ok ? 'AWS STS issues temporary credentials' : 'The request fails'}
          </p>
          <p className="mt-0.5 text-ink-2">
            {ok ? (
              <>
                {useDefault ? 'You did not ask for a length, so you get the default of 1 hour. ' : ''}
                If the script asks at {fmtClock(START)}, the credentials expire at{' '}
                <strong className="text-ink">{fmtClock(START + asked)}</strong>. After that, AWS refuses them and the script must assume the
                role again.
              </>
            ) : (
              <>
                You asked for {fmtDuration(asked)}, but this role allows at most {fmtDuration(maxMin)}. STS does not shorten the request; it
                refuses it. Ask for less, or have an admin raise the role’s maximum (up to 12 hours).
              </>
            )}
          </p>
        </div>
      </div>

      <p className="mt-4 border-t border-line pt-3 text-xs text-ink-3">
        Simplified: this shows a person or script calling AssumeRole. Using one role’s credentials to assume another role (role chaining)
        is capped at 1 hour, and AWS compute services such as EC2 and Lambda manage and refresh their own credentials, so this setting does
        not limit them.
      </p>
    </Bench>
  )
}
