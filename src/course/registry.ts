import { foundations } from '../modules/foundations'
import { baseGlossary } from './glossary'
import type { CourseModule, Glossary, GlossaryEntry } from './types'

/**
 * Every module in the course, in teaching order.
 * To add a module: create src/modules/<id>/index.ts exporting a CourseModule
 * and append it here.
 */
export const modules: CourseModule[] = [foundations]

export const glossary: Glossary = Object.assign({}, baseGlossary, ...modules.map((m) => m.terms))

export const lookupTerm = (key: string): GlossaryEntry | undefined => glossary[key]

export const getModule = (id: string) => modules.find((m) => m.id === id)

export function getLesson(moduleId: string, lessonId: string) {
  const module = getModule(moduleId)
  const index = module?.lessons.findIndex((l) => l.id === lessonId) ?? -1
  if (!module || index < 0) return undefined
  return {
    module,
    lesson: module.lessons[index],
    index,
    prev: module.lessons[index - 1],
    next: module.lessons[index + 1],
  }
}

/** Which module teaches each map item (service or place), for lighting up the course map. */
export const coverage: Record<string, CourseModule> = Object.fromEntries(
  modules.flatMap((m) => m.covers.map((id) => [id, m] as const)),
)
