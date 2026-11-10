import type { Glossary } from '../../../../course/types'

/** Glossary terms this lesson adds (only ones missing from the shared glossary). */
export const terms: Glossary = {
  'bucket-policy': {
    term: 'Bucket policy',
    short:
      'A policy attached to an S3 bucket. It says who may do what with the bucket and its files, and it can allow or deny. A deny always wins.',
  },
  signer: {
    term: 'Signer',
    short:
      'Whoever made a presigned link. The link can only do what the signer is allowed to do, and it stops working when the signer’s credentials expire.',
  },
}
