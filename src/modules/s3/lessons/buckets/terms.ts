import type { Glossary } from '../../../../course/types'

/** Glossary terms this lesson adds (only ones missing from the shared glossary). */
export const terms: Glossary = {
  metadata: {
    term: 'Metadata',
    short:
      'Facts stored with an object besides its data, such as its type (like image/jpeg), its size and when it was last changed. You can add your own too.',
  },
  'globally-unique-name': {
    term: 'Globally unique bucket name',
    short:
      'No two buckets can share a name, across all AWS accounts and all Regions. If another account already owns a name, you have to pick a different one.',
  },
}
