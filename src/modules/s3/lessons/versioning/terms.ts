import type { Glossary } from '../../../../course/types'

/** Glossary terms this lesson adds (only ones missing from the shared glossary). */
export const terms: Glossary = {
  'delete-marker': {
    term: 'Delete marker',
    short:
      'A placeholder S3 puts on top of a file when you delete it with versioning on. The file looks gone, but its older versions stay, and removing the marker brings it back.',
  },
  'version-id': {
    term: 'Version ID',
    short:
      'The unique name S3 gives each version of a file. Files saved before versioning was turned on have the version ID null.',
  },
  'object-lock': {
    term: 'S3 Object Lock',
    short:
      'A setting that stops anyone from deleting a version of a file for a set time, or until a hold is lifted. It works only in buckets with versioning on.',
  },
  'mfa-delete': {
    term: 'MFA delete',
    short:
      'An extra lock on a versioned bucket: deleting a version for good, or changing the versioning setting, needs a code from the bucket owner’s MFA device.',
  },
}
