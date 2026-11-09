import type { Glossary } from '../../course/types'

/** Glossary terms shared by the Module 3 (S3) lessons. */
export const terms: Glossary = {
  prefix: {
    term: 'Prefix',
    short: 'The start of an object key, like menu/. S3 has no real folders: a prefix is just the first part of the file name, and tools show it as a folder.',
  },
  durability: {
    term: 'Durability',
    short: 'How unlikely it is that a stored file gets lost. S3 is designed for 99.999999999% ("11 nines"), so losing a file is extremely rare.',
  },
  'storage-class': {
    term: 'Storage class',
    short: 'A "shelf" in S3 for a file. Cheaper shelves cost less to keep a file on but charge more or take longer to get it back.',
  },
  's3-standard': {
    term: 'S3 Standard',
    short: 'The everyday shelf for files you read often. Reads are instant and have no extra fee, but it costs the most per GB to keep.',
  },
  's3-standard-ia': {
    term: 'S3 Standard-IA',
    short: 'For files you rarely read but need instantly. Keeping them costs less, but each read has a per-GB fee and you pay for at least 30 days.',
  },
  's3-intelligent-tiering': {
    term: 'S3 Intelligent-Tiering',
    short: 'S3 moves each file to a cheaper shelf on its own when it is not read for a while. There is no fee to read, but a small monitoring fee per object.',
  },
  's3-one-zone-ia': {
    term: 'S3 One Zone-IA',
    short: 'Like Standard-IA, but stored in just one Availability Zone, so it is cheaper. If that zone is destroyed the files are lost, so use it only for data you can re-create.',
  },
  's3-glacier-instant-retrieval': {
    term: 'S3 Glacier Instant Retrieval',
    short: 'A cheap shelf for files read about once a quarter that still need to open instantly. It has a per-GB read fee and a 90-day minimum.',
  },
  's3-glacier-flexible-retrieval': {
    term: 'S3 Glacier Flexible Retrieval',
    short: 'A very cheap archive shelf. Getting a file back takes minutes to hours, so it suits data you can wait for. It has a 90-day minimum.',
  },
  's3-glacier-deep-archive': {
    term: 'S3 Glacier Deep Archive',
    short: 'The cheapest shelf, for files you keep for years and almost never open. Getting one back takes up to 12 hours, and you pay for at least 180 days.',
  },
  'retrieval-fee': {
    term: 'Retrieval fee',
    short: 'A charge per GB when you read a file back from a cheaper storage class. It is the price of the lower storage cost.',
  },
  'minimum-storage-duration': {
    term: 'Minimum storage duration',
    short: 'The shortest time you are billed for a file in a class. If you delete or move it sooner, you still pay for the full minimum.',
  },
  'block-public-access': {
    term: 'Block Public Access',
    short: 'A safety switch that stops a bucket or its files from being made public, even by mistake. It is on by default for new buckets.',
  },
  'presigned-url': {
    term: 'Presigned URL',
    short: 'A web link that lets anyone holding it do one thing, like download one file, until the link expires. It works only if whoever made it was allowed to do that thing.',
  },
  versioning: {
    term: 'Versioning',
    short: 'An undo history for your files. When it is on, S3 keeps every older version, so an overwrite or delete does not erase them.',
  },
  'noncurrent-version': {
    term: 'Noncurrent version',
    short: 'An older copy of a file that was replaced or deleted while versioning is on. It is hidden from normal views but still stored, and you still pay for it.',
  },
  'lifecycle-rule': {
    term: 'Lifecycle rule',
    short: 'A rule that tells S3 to move files to a cheaper shelf, or delete them, after a set number of days. S3 does it for you automatically.',
  },
}
