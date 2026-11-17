import type { Glossary } from '../../../../course/types'

/** Glossary terms this lesson adds (only ones missing from the shared glossary). */
export const terms: Glossary = {
  signer: {
    term: 'Signer',
    short:
      'Whoever made a presigned link. The link can only do what the signer is allowed to do, and it stops working when the signer’s credentials expire.',
  },
}
