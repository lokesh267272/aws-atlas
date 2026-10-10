import type { Glossary } from '../../../../course/types'

/** Glossary terms this lesson adds (only ones missing from src/course/glossary.ts). */
export const terms: Glossary = {
  'global-service': {
    term: 'Global service',
    short:
      'An AWS service that is not tied to one Region, such as IAM. What you set up in it applies across all the Regions of your account.',
  },
}
