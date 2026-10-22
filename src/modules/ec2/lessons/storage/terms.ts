import type { Glossary } from '../../../../course/types'

/** Glossary terms this lesson adds (only ones missing from the shared glossary). */
export const terms: Glossary = {
  'host-computer': {
    term: 'Host computer',
    short: 'The physical server in an AWS data center that your instance runs on, often shared with other instances.',
  },
  'instance-store': {
    term: 'Instance store',
    short:
      'Fast, temporary disks inside the host computer (only some instance types have them): the data survives a reboot but is lost when the instance stops, hibernates or terminates, or the disk fails.',
  },
  'ebs-volume': {
    term: 'EBS volume',
    short:
      'One virtual disk from Amazon EBS. It reaches its instance over the network, lives in one Availability Zone and keeps its data when the instance stops.',
  },
  'root-volume': {
    term: 'Root volume',
    short:
      'The disk an instance starts from, holding its operating system. For most instances it is an EBS volume, deleted by default when the instance is terminated.',
  },
  'delete-on-termination': {
    term: 'Delete on termination',
    short:
      'A setting on each EBS volume: if on, the volume is deleted when its instance is terminated (on by default for the root volume, off for volumes attached after launch).',
  },
  'ebs-snapshot': {
    term: 'EBS snapshot',
    short:
      'A point-in-time backup of an EBS volume, kept by AWS in Amazon S3 (not in a bucket you can see) outside any one AZ, and restorable as a new volume in any AZ of the Region.',
  },
  'data-lifecycle-manager': {
    term: 'Amazon Data Lifecycle Manager',
    short: 'An AWS feature that takes, keeps and deletes EBS snapshots for you on a schedule you set.',
  },
}
