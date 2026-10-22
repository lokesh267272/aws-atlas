import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/** How long one step of the day stays on screen while it plays. */
export const TICK_MS = 750

export interface DayPlayer {
  /** The step on screen. */
  tick: number
  playing: boolean
  /** Play from `from` to `to` (inclusive), then call `done`. With reduced motion it jumps to `to` at once. */
  play: (from: number, to: number, done?: () => void) => void
  /** Keep playing until at least `to`. */
  extend: (to: number) => void
  /** Stop and show `tick` (no callback). */
  jump: (tick: number) => void
}

/**
 * Steps through a simulated day, one step every TICK_MS, only after the learner starts it.
 * Nothing runs while it is not playing, so the 3D scene draws no frames.
 */
export function useDayPlayer(reduced: boolean): DayPlayer {
  const [tick, setTick] = useState(0)
  const [playing, setPlaying] = useState(false)
  const stopAt = useRef(0)
  const onDone = useRef<(() => void) | undefined>(undefined)

  const finish = useCallback(() => {
    setPlaying(false)
    const done = onDone.current
    onDone.current = undefined
    done?.()
  }, [])

  useEffect(() => {
    if (!playing) return
    if (reduced) {
      // Reduced motion switched on mid-day: jump to the end.
      setTick(stopAt.current)
      finish()
      return
    }
    if (tick >= stopAt.current) {
      finish()
      return
    }
    const id = window.setTimeout(() => setTick((t) => t + 1), TICK_MS)
    return () => window.clearTimeout(id)
  }, [playing, tick, reduced, finish])

  const play = useCallback(
    (from: number, to: number, done?: () => void) => {
      stopAt.current = to
      onDone.current = done
      if (reduced) {
        setTick(to)
        setPlaying(false)
        onDone.current = undefined
        done?.()
        return
      }
      setTick(from)
      setPlaying(true)
    },
    [reduced],
  )

  const extend = useCallback((to: number) => {
    stopAt.current = Math.max(stopAt.current, to)
  }, [])

  const jump = useCallback((t: number) => {
    onDone.current = undefined
    setPlaying(false)
    setTick(t)
  }, [])

  return useMemo(() => ({ tick, playing, play, extend, jump }), [tick, playing, play, extend, jump])
}
