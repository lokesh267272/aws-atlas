import type { Glossary } from '../../../../course/types'

/** Glossary terms this lesson adds (only ones missing from the shared glossary). */
export const terms: Glossary = {
  'host-computer': {
    term: 'Host computer',
    short: 'The physical server in an AWS data center that your instance runs on. Several instances can share one host.',
  },
  'instance-store': {
    term: 'Instance store',
    short:
      'Disks physically inside the host computer, fast but temporary. The data survives a reboot, but is lost when the instance stops or terminates, or the disk fails. Only some instance types have one.',
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
      'A setting on each EBS volume attached to an instance: if it is on, the volume is deleted when the instance is terminated. By default it is on for the root volume and off for volumes attached after launch.',
  },
  'ebs-snapshot': {
    term: 'EBS snapshot',
    short:
      'A point-in-time backup of an EBS volume. AWS stores it in Amazon S3, outside any one AZ, and you can restore it as a new volume in any AZ of the same Region.',
  },
  'data-lifecycle-manager': {
    term: 'Amazon Data Lifecycle Manager',
    short: 'An AWS feature that takes, keeps and deletes EBS snapshots for you on a schedule you set.',
  },
}
