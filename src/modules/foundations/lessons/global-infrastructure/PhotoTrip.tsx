import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Building, Send, Smartphone } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Button, Readout, Segmented } from '../../../../components/controls'
import { distanceKm, minRoundTripMs } from './geo'
import { regionByCode, regions } from './regions'

const places = [
  { id: 'mumbai', label: 'Mumbai', lat: 19.08, lon: 72.88 },
  { id: 'london', label: 'London', lat: 51.51, lon: -0.13 },
  { id: 'saopaulo', label: 'São Paulo', lat: -23.55, lon: -46.63 },
  { id: 'sydney', label: 'Sydney', lat: -33.87, lon: 151.21 },
  { id: 'newyork', label: 'New York', lat: 40.71, lon: -74.01 },
  { id: 'lagos', label: 'Lagos', lat: 6.52, lon: 3.38 },
] as const

type PlaceId = (typeof places)[number]['id']

const storeRegions = ['us-east-1', 'eu-west-2', 'ap-south-1', 'ap-southeast-2', 'sa-east-1'] as const
type StoreRegion = (typeof storeRegions)[number]

/** How much the animation is slowed down compared with real time. */
const SLOWDOWN = 20

const fmtKm = (km: number) => {
  if (km < 50) return 'under 50 km'
  const step = km >= 1000 ? 100 : 10
  return `${(Math.round(km / step) * step).toLocaleString('en-US')} km`
}
const fmtMs = (ms: number) => (ms < 1 ? 'under 1 ms' : `${Math.round(ms)} ms`)
/** "about 129 ms", but plain "under 1 ms" (never "about under 1 ms"). */
const aboutMs = (ms: number) => (ms < 1 ? fmtMs(ms) : `about ${fmtMs(ms)}`)
/** The city part of a Region's area, e.g. "Sydney" for "Sydney, Australia". */
const cityOf = (code: string) => regionByCode[code].area.split(',')[0]

export function PhotoTrip() {
  const reduced = useReducedMotion() ?? false
  const [place, setPlace] = useState<PlaceId>('mumbai')
  const [store, setStore] = useState<StoreRegion>('us-east-1')
  const [trip, setTrip] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'travelling' | 'done'>('idle')

  const from = places.find((p) => p.id === place)!
  const region = regionByCode[store]

  const result = useMemo(() => {
    const km = distanceKm(from.lat, from.lon, region.lat, region.lon)
    let nearest = regions[0]
    let nearestKm = Infinity
    for (const r of regions) {
      const d = distanceKm(from.lat, from.lon, r.lat, r.lon)
      if (d < nearestKm) {
        nearestKm = d
        nearest = r
      }
    }
    return { km, ms: minRoundTripMs(km), nearest, nearestKm, nearestMs: minRoundTripMs(nearestKm) }
  }, [from, region])

  const duration = Math.max(0.5, (result.ms * SLOWDOWN) / 1000)

  const travelling = phase === 'travelling'
  const send = () => {
    if (travelling) return
    setTrip((t) => t + 1)
    setPhase(reduced ? 'done' : 'travelling')
  }
  const changePlace = (v: PlaceId) => {
    setPlace(v)
    setPhase('idle')
  }
  const changeStore = (v: StoreRegion) => {
    setStore(v)
    setPhase('idle')
  }
  const reset = () => {
    setPlace('mumbai')
    setStore('us-east-1')
    setPhase('idle')
  }

  return (
    <Bench
      title="Try it: send a photo request across the planet"
      intro="Choose where you are and which Region stores the photo, then send the request. Watch how long the trip takes, and compare it with the Region nearest to you."
      onReset={reset}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Segmented
          label="You are in"
          value={place}
          onChange={changePlace}
          size="sm"
          options={places.map((p) => ({ value: p.id, label: p.label }))}
        />
        <Segmented
          label="The photo is stored in"
          value={store}
          onChange={changeStore}
          size="sm"
          options={storeRegions.map((code) => ({
            value: code,
            label: (
              <>
                <span className="font-mono">{code}</span>
                <span className="font-normal">{cityOf(code)}</span>
              </>
            ),
          }))}
        />
      </div>

      {/* The trip */}
      <div className="mt-5 rounded-md border border-line bg-paper p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex w-16 shrink-0 flex-col items-center text-center sm:w-28">
            <Smartphone aria-hidden className="size-7 text-ink" />
            <span className="mt-1 text-xs font-bold text-ink">You</span>
            <span className="text-xs text-ink-3">{from.label}</span>
          </div>
          <div className="relative h-10 min-w-0 flex-1" aria-hidden>
            <div className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-line-strong" />
            {phase === 'travelling' && (
              <motion.div
                key={trip}
                className="absolute top-1/2 -ml-2 -mt-2 size-4 rounded-full border-2 border-panel bg-signal"
                initial={{ left: '0%' }}
                animate={{ left: ['0%', '100%', '0%'] }}
                transition={{ duration, times: [0, 0.5, 1], ease: 'linear' }}
                onAnimationComplete={() => setPhase('done')}
              />
            )}
          </div>
          <div className="flex w-24 shrink-0 flex-col items-center text-center sm:w-28">
            <Building aria-hidden className="size-7 text-region-ink" />
            {/* Kept on one line: ap-southeast-2 must not break into pieces on a narrow phone */}
            <span className="mt-1 whitespace-nowrap font-mono text-[0.7rem] font-bold text-ink sm:text-xs">{store}</span>
            <span className="text-xs text-ink-3">{cityOf(store)}</span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {/* aria-disabled, not disabled, so keyboard focus stays on the button during the trip */}
          <Button
            variant="primary"
            onClick={send}
            aria-disabled={travelling}
            className="aria-disabled:cursor-default aria-disabled:opacity-45 aria-disabled:hover:bg-ink"
          >
            <Send aria-hidden />
            {phase === 'idle' ? 'Send the request' : 'Send it again'}
          </Button>
          <p className="text-sm text-ink-3">
            {travelling
              ? `Travelling… shown ${SLOWDOWN} times slower than real life.`
              : reduced
                ? 'Animation is off because your device asks for reduced motion.'
                : `The dot moves ${SLOWDOWN} times slower than the real signal.`}
          </p>
        </div>
      </div>

      <div aria-live="polite" className="mt-4">
        {phase === 'done' ? (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Readout label="Straight-line distance" value={fmtKm(result.km)} hint={`${from.label} to ${cityOf(store)}`} />
              <Readout
                label="Fastest possible round trip"
                value={fmtMs(result.ms)}
                hint="There and back, at the speed of light in fibre"
              />
              <Readout
                label="Nearest Region to you (straight line)"
                value={<span className="font-mono text-lg">{result.nearest.code}</span>}
                hint={`${result.nearest.name}: ${aboutMs(result.nearestMs)} round trip`}
                tone={result.nearest.code === store ? 'ok' : 'neutral'}
              />
            </div>
            <p className="mt-3 max-w-[68ch] text-ink-2">
              {result.nearest.code === store
                ? 'You picked the nearest Region, so the trip is as short as it can be.'
                : `Storing the photo in ${result.nearest.code} instead would cut the shortest possible trip from ${fmtMs(result.ms)} to ${fmtMs(result.nearestMs)}.`}{' '}
              Loading one app screen often needs many trips like this, so the delay adds up.
            </p>
          </>
        ) : (
          <p className="text-sm text-ink-3">
            {travelling ? 'Waiting for the photo to come back…' : 'Send the request to see the distance and the delay.'}
          </p>
        )}
      </div>

      <p className="mt-4 text-xs text-ink-3">
        Simplified: real cables do not run in straight lines, and every piece of network equipment on the way adds a little time, so real delays are
        higher than these minimums. Distances use rough city centres.
      </p>
    </Bench>
  )
}
