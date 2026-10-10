import { useCallback, useEffect, useRef, useState } from 'react'
import { describeEvent } from './messages'
import { advance, applyIncident, createSim, type Arch, type Incident, type Sim } from './resilienceSim'

/**
 * Runs the resilience simulation with requestAnimationFrame while playing.
 * The simulation lives in a ref; a frame counter triggers re-renders.
 * With `reduced` (reduced motion) requests arrive instantly and the view
 * refreshes a few times a second instead of every frame.
 */
export function useResilienceSim(initialArch: Arch, reduced: boolean) {
  const simRef = useRef<Sim>(createSim(initialArch))
  const [arch, setArchState] = useState<Arch>(initialArch)
  const [playing, setPlaying] = useState(false)
  const [message, setMessage] = useState('')
  const [, setFrame] = useState(0)
  const rerender = useCallback(() => setFrame((f) => (f + 1) % 1_000_000), [])

  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    let sinceRender = 0
    const loop = (now: number) => {
      // Clamp so a background tab does not jump the simulation forward.
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000))
      last = now
      const sim = simRef.current
      const events = advance(sim, dt, reduced)
      if (events.length > 0) setMessage(describeEvent(events[events.length - 1], sim.arch))
      sinceRender += dt
      if (!reduced || events.length > 0 || sinceRender >= 0.25) {
        sinceRender = 0
        rerender()
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [playing, reduced, rerender])

  const setArch = useCallback(
    (next: Arch) => {
      simRef.current = createSim(next)
      setArchState(next)
      setMessage('')
      rerender()
    },
    [rerender],
  )

  const trigger = useCallback(
    (incident: Incident) => {
      const sim = simRef.current
      const ev = applyIncident(sim, incident)
      setMessage(describeEvent(ev, sim.arch))
      // Incidents and repairs play out over time, so start the clock if it is paused.
      if (!ev.noop) setPlaying(true)
      rerender()
    },
    [rerender],
  )

  const reset = useCallback(() => {
    simRef.current = createSim(initialArch)
    setArchState(initialArch)
    setPlaying(false)
    setMessage('')
    rerender()
  }, [initialArch, rerender])

  return { sim: simRef.current, arch, setArch, playing, setPlaying, message, trigger, reset }
}
