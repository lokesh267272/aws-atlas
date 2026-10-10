import { useMemo, useSyncExternalStore } from 'react'

/**
 * Tiny hash router. Hash URLs keep the site working when it is served from any
 * folder or opened straight from disk after `npm run build`.
 *
 *   #/                         home (the course map)
 *   #/m/<moduleId>             module overview
 *   #/m/<moduleId>/<lessonId>  a lesson
 *   #/glossary                 all terms
 */
export type Route =
  | { name: 'home' }
  | { name: 'module'; moduleId: string }
  | { name: 'lesson'; moduleId: string; lessonId: string }
  | { name: 'glossary' }
  | { name: 'notfound' }

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/^\/+|\/+$/g, '')
  if (!path) return { name: 'home' }
  const parts = path.split('/').map(decodeURIComponent)
  if (parts[0] === 'glossary' && parts.length === 1) return { name: 'glossary' }
  if (parts[0] === 'm' && parts.length === 2) return { name: 'module', moduleId: parts[1] }
  if (parts[0] === 'm' && parts.length === 3) {
    return { name: 'lesson', moduleId: parts[1], lessonId: parts[2] }
  }
  return { name: 'notfound' }
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

const getHash = () => window.location.hash

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash, () => '')
  return useMemo(() => parseHash(hash), [hash])
}

export const href = {
  home: () => '#/',
  module: (moduleId: string) => `#/m/${moduleId}`,
  lesson: (moduleId: string, lessonId: string) => `#/m/${moduleId}/${lessonId}`,
  glossary: () => '#/glossary',
}

export function navigate(to: string) {
  window.location.hash = to.replace(/^#/, '')
}
