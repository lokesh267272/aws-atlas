import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { CircleAlert, Info, MapPin } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Segmented } from '../../../../components/controls'
import {
  areaNames,
  directionNames,
  regionByCode,
  siblingsOf,
  splitCode,
  type AwsRegion,
  type CodeParts,
} from './regions'
import { zoomRegions } from './ZoomViews'

const examples = ['us-east-1', 'us-east-2', 'eu-west-2', 'ap-southeast-2', 'sa-east-1', 'me-central-1'] as const
type Example = (typeof examples)[number]

/** Real Region codes that live in separate partitions, so they are not on this lesson's map. */
const otherPartitions: Record<string, string> = {
  'us-gov-west-1': 'AWS GovCloud (US-West), in the separate AWS GovCloud (US) partition',
  'us-gov-east-1': 'AWS GovCloud (US-East), in the separate AWS GovCloud (US) partition',
  'cn-north-1': 'China (Beijing), in the separate China partition',
  'cn-northwest-1': 'China (Ningxia), in the separate China partition',
  'eusc-de-east-1': 'the AWS European Sovereign Cloud Region in Germany, which has its own separate partition',
}

/** AZ ID prefixes this lesson shows elsewhere (the zoom explorer), e.g. use1 = us-east-1. */
const azIdPrefixes: Record<string, string> = Object.fromEntries(zoomRegions.map((z) => [z.azPrefix, z.code]))

type Analysis =
  | { kind: 'region'; parts: CodeParts; region: AwsRegion; letter?: string; plausible?: boolean }
  | { kind: 'unknown'; parts: CodeParts }
  | { kind: 'partition'; code: string; text: string }
  | { kind: 'azid'; code: string; prefix: string; region?: AwsRegion }
  | { kind: 'invalid' }

function analyse(raw: string): Analysis {
  const code = raw.trim().toLowerCase()
  if (otherPartitions[code]) return { kind: 'partition', code, text: otherPartitions[code] }
  const region = regionByCode[code]
  const parts = splitCode(code)
  if (region && parts) return { kind: 'region', parts, region }
  // An Availability Zone name: a Region code plus one letter, such as us-east-1a
  const az = /^(.+-\d{1,2})([a-z])$/.exec(code)
  if (az && regionByCode[az[1]]) {
    const p = splitCode(az[1])
    const r = regionByCode[az[1]]
    // Letters usually run a, b, c… but some Regions skip one (ca-central-1 has a, b and d), so allow one spare letter.
    const plausible = az[2].charCodeAt(0) - 97 <= r.azs
    if (p) return { kind: 'region', parts: p, region: r, letter: az[2], plausible }
  }
  // An AZ ID, such as use1-az1: a short Region label, then az and a number
  const azId = /^([a-z]{2,5}\d)-az(\d{1,2})$/.exec(code)
  if (azId) {
    const known = azIdPrefixes[azId[1]]
    return { kind: 'azid', code, prefix: azId[1], region: known ? regionByCode[known] : undefined }
  }
  if (parts) return { kind: 'unknown', parts }
  return { kind: 'invalid' }
}

function Part({ text, label, meaning }: { text: string; label: string; meaning: string }) {
  return (
    <div className="min-w-0 rounded-md border border-line-strong bg-panel px-3 py-2">
      <div className="font-mono text-xl font-bold text-ink sm:text-2xl">{text}</div>
      <div className="mt-1 text-xs font-bold text-ink-2">{label}</div>
      <div className="text-xs text-ink-3">{meaning}</div>
    </div>
  )
}

const Dash = () => (
  <span aria-hidden className="self-start pt-2 font-mono text-xl text-ink-3 sm:text-2xl">
    -
  </span>
)

function Anatomy({
  parts,
  letter,
  plausible = true,
  known,
}: {
  parts: CodeParts
  letter?: string
  plausible?: boolean
  known: boolean
}) {
  const code = `${parts.area}-${parts.direction}-${parts.number}`
  const sibs = known ? siblingsOf(code) : []
  const numberMeaning = !known
    ? 'No Region has this exact code'
    : sibs.length > 0
      ? `Tells it apart from ${sibs.map((s) => s.code).join(', ')}`
      : 'The only one so far with this area and direction'
  return (
    <div className="flex flex-wrap items-stretch gap-1.5">
      <Part text={parts.area} label="Area" meaning={areaNames[parts.area] ?? 'Not an area AWS uses'} />
      <Dash />
      <Part text={parts.direction} label="Part of that area" meaning={`Roughly the ${directionNames[parts.direction]}`} />
      <Dash />
      <Part text={parts.number} label="Number" meaning={numberMeaning} />
      {letter && (
        <Part
          text={letter}
          label="AZ letter"
          meaning={plausible ? 'One Availability Zone in this Region' : 'Probably not a real AZ letter here'}
        />
      )}
    </div>
  )
}

export function RegionCodeLab() {
  const [picked, setPicked] = useState<Example>('us-east-1')
  const [typed, setTyped] = useState('')
  const inputId = useId()
  const hintId = useId()

  const current = typed.trim() ? typed : picked
  const result = useMemo(() => analyse(current), [current])

  // Screen readers hear the result once the learner pauses, not after every key press.
  // The text is read from the visible message so the two always match.
  const messageRef = useRef<HTMLParagraphElement>(null)
  const [spoken, setSpoken] = useState('')
  const lastSpoken = useRef(current)
  useEffect(() => {
    if (current === lastSpoken.current) return // nothing to announce when the page first loads
    lastSpoken.current = current
    const t = window.setTimeout(() => setSpoken(messageRef.current?.textContent ?? ''), 600)
    return () => window.clearTimeout(t)
  }, [current])

  return (
    <Bench
      title="Try it: take a Region code apart"
      intro="Pick a code, or type any code you have seen, such as one from an error message. Notice that every standard Region code has the same three parts."
      onReset={() => {
        setPicked('us-east-1')
        setTyped('')
      }}
    >
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        {/* While a typed code is shown, no example is marked as chosen */}
        <Segmented<Example | ''>
          label="Pick a code"
          size="sm"
          value={typed.trim() ? '' : picked}
          onChange={(v) => {
            if (!v) return
            setPicked(v)
            setTyped('')
          }}
          options={examples.map((e) => ({ value: e, label: <span className="font-mono">{e}</span> }))}
        />
        <div className="min-w-0">
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-bold text-ink-2">
            Or type a code
          </label>
          <input
            id={inputId}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="for example ca-west-1"
            aria-describedby={hintId}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="h-9 w-56 max-w-full rounded-md border border-line-strong bg-panel px-3 font-mono text-sm text-ink placeholder:text-ink-3 focus-visible:border-signal"
          />
        </div>
      </div>
      <p id={hintId} className="mt-1.5 text-xs text-ink-3">
        Region codes, AZ names and AZ IDs all work, for example eu-north-1, us-east-1a or use1-az1.
      </p>

      <p aria-live="polite" className="sr-only">
        {spoken}
      </p>
      <div className="mt-5">
        {result.kind === 'region' && (
          <>
            <Anatomy parts={result.parts} letter={result.letter} plausible={result.plausible} known />
            {result.letter && !result.plausible ? (
              <p ref={messageRef} className="mt-3 flex items-start gap-2 text-ink-2">
                <CircleAlert aria-hidden className="mt-1 size-4 shrink-0 text-warn" />
                <span>
                  <span className="font-mono">{current.trim().toLowerCase()}</span> follows the AZ name pattern, but{' '}
                  <strong className="text-ink">{result.region.name}</strong> has only {result.region.azs} Availability Zones, so
                  the letter {result.letter} probably does not exist there. To see the real names, run{' '}
                  <span className="font-mono">aws ec2 describe-availability-zones --region {result.region.code}</span>.
                </span>
              </p>
            ) : (
              <p ref={messageRef} className="mt-3 flex items-start gap-2 text-ink-2">
                <MapPin aria-hidden className="mt-1 size-4 shrink-0 text-region-ink" />
                <span>
                  {result.letter ? (
                    <>
                      <span className="font-mono">{current.trim().toLowerCase()}</span> is an Availability Zone name: the Region{' '}
                      <span className="font-mono">{result.region.code}</span> plus the letter {result.letter}.{' '}
                    </>
                  ) : null}
                  <span className="font-mono">{result.region.code}</span> is <strong className="text-ink">{result.region.name}</strong>,
                  with {result.region.azs} Availability Zones.
                </span>
              </p>
            )}
          </>
        )}
        {result.kind === 'azid' && (
          <p ref={messageRef} className="flex items-start gap-2 text-ink-2">
            <Info aria-hidden className="mt-1 size-4 shrink-0 text-ink-3" />
            <span>
              <span className="font-mono">{result.code}</span> looks like an AZ ID rather than a Region code. An AZ ID is a fixed
              label for one physical Availability Zone, and it means the same place in every account.
              {result.region && (
                <>
                  {' '}
                  The <span className="font-mono">{result.prefix}</span> part is short for{' '}
                  <span className="font-mono">{result.region.code}</span> ({result.region.name}).
                </>
              )}{' '}
              The AZ names you usually see, such as <span className="font-mono">us-east-1a</span>, can point at different physical
              AZs in some older accounts.
            </span>
          </p>
        )}
        {result.kind === 'unknown' && (
          <>
            <Anatomy parts={result.parts} known={false} />
            <p ref={messageRef} className="mt-3 flex items-start gap-2 text-ink-2">
              <CircleAlert aria-hidden className="mt-1 size-4 shrink-0 text-warn" />
              <span>
                This follows the pattern, but no Region a standard account can use has this code (as of October 2026). Check for a
                typo.
              </span>
            </p>
          </>
        )}
        {result.kind === 'partition' && (
          <p ref={messageRef} className="flex items-start gap-2 text-ink-2">
            <Info aria-hidden className="mt-1 size-4 shrink-0 text-ink-3" />
            <span>
              <span className="font-mono">{result.code}</span> is a real Region code: {result.text}. A standard AWS account cannot use
              it, so it is not on this lesson’s globe.
            </span>
          </p>
        )}
        {result.kind === 'invalid' && (
          <p ref={messageRef} className="flex items-start gap-2 text-ink-2">
            <CircleAlert aria-hidden className="mt-1 size-4 shrink-0 text-warn" />
            <span>
              That does not look like a Region code. Standard Region codes are lower-case and follow the pattern
              area-direction-number, for example <span className="font-mono">eu-west-2</span>.
            </span>
          </p>
        )}
      </div>
    </Bench>
  )
}
