import { useCallback, useSyncExternalStore } from 'react'

/**
 * Lesson completion, remembered in this browser only.
 * Storage can be unavailable (private windows, blocked site data), so every
 * read and write is guarded and the app works without it.
 */
const KEY = 'aws-atlas:progress:v1'

function load(): ReadonlySet<string> {
  try {
    const raw = window.localStorage.getItem(KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

let snapshot: ReadonlySet<string> = load()
const listeners = new Set<() => void>()

function commit(next: Set<string>) {
  snapshot = next
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...next]))
  } catch {
    // Storage blocked: progress lasts for this visit only.
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const keyOf = (moduleId: string, lessonId: string) => `${moduleId}/${lessonId}`

export function useProgress() {
  const done = useSyncExternalStore(subscribe, () => snapshot, () => snapshot)

  const isComplete = useCallback(
    (moduleId: string, lessonId: string) => done.has(keyOf(moduleId, lessonId)),
    [done],
  )

  const setComplete = useCallback((moduleId: string, lessonId: string, value: boolean) => {
    const next = new Set(snapshot)
    if (value) next.add(keyOf(moduleId, lessonId))
    else next.delete(keyOf(moduleId, lessonId))
    commit(next)
  }, [])

  const countComplete = useCallback(
    (moduleId: string, lessonIds: string[]) =>
      lessonIds.filter((id) => done.has(keyOf(moduleId, id))).length,
    [done],
  )

  return { isComplete, setComplete, countComplete }
}
