import type { Glossary } from '../../../../course/types'

/** Glossary terms this lesson adds (only ones missing from the shared glossary). */
export const terms: Glossary = {
  'transition-action': {
    term: 'Transition action',
    short: 'The part of a lifecycle rule that moves files to another storage class after a set number of days, such as to a cheaper shelf after 30 days.',
  },
  'expiration-action': {
    term: 'Expiration action',
    short: 'The part of a lifecycle rule that deletes files after a set number of days. With versioning on, the file is only hidden and kept as an old version until an old-version rule deletes it.',
  },
}
