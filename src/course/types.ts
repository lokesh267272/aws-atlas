import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'

/** AWS service categories. Each has a fixed colour token (see categories.ts). */
export type Category =
  | 'foundation'
  | 'security'
  | 'compute'
  | 'storage'
  | 'networking'
  | 'database'
  | 'integration'
  | 'management'
  | 'analytics'

/**
 * Where a service lives in the AWS hierarchy.
 *  global   one per account, not tied to a Region (IAM)
 *  edge     runs in edge locations close to users (CloudFront)
 *  regional you choose a Region; AWS spreads it across that Region's AZs (S3)
 *  vpc      sits inside your private network and spans AZs (load balancers)
 *  zonal    lives in a single Availability Zone (an EC2 instance)
 */
export type Scope = 'global' | 'edge' | 'regional' | 'vpc' | 'zonal'

export interface GlossaryEntry {
  /** How the term is written, e.g. "Availability Zone (AZ)" */
  term: string
  /** One or two plain-language sentences. No unexplained jargon. */
  short: string
  /** Optional extra detail shown under the short definition. */
  long?: string
}

export type Glossary = Record<string, GlossaryEntry>

export interface LessonMeta {
  /** URL-safe id, unique inside its module */
  id: string
  title: string
  /** One sentence: what the learner will be able to do or understand */
  summary: string
  /** Rough time to complete, in minutes */
  minutes: number
  /** Lazy loader so heavy lessons (3D, simulations) only load when opened */
  load: () => Promise<{ default: ComponentType }>
}

export interface CourseModule {
  id: string
  number: number
  title: string
  /** Short phrase shown under the title */
  tagline: string
  /** A short paragraph explaining the module in plain words */
  description: string
  /** "By the end you can…" bullet points */
  outcomes: string[]
  /** Ids of items on the AWS map (see awsMap.ts) this module teaches */
  covers: string[]
  lessons: LessonMeta[]
  /** Glossary terms contributed by this module's lessons */
  terms: Glossary
}

export interface MapService {
  id: string
  /** Short name as people say it, e.g. "S3" */
  name: string
  /** Full official name, e.g. "Simple Storage Service" */
  fullName: string
  /** What it does, in one plain sentence */
  plain: string
  category: Category
  scope: Scope
  icon: LucideIcon
}
