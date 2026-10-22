import type { Glossary } from '../../../../course/types'

/** Glossary terms this lesson adds (only ones missing from the shared glossary). `ssh` and `key-pair` live in lesson 1. */
export const terms: Glossary = {
  'network-port': {
    term: 'Port',
    short: 'A numbered door on a server: each kind of traffic uses its own number, such as 443 for HTTPS and 22 for SSH.',
  },
  'sg-inbound-rule': {
    term: 'Inbound rule',
    short: 'A line in a security group that lets one kind of traffic in: a protocol, a port and where it may come from.',
  },
  'sg-outbound-rule': {
    term: 'Outbound rule',
    short: 'A line in a security group that lets traffic leave the server; a new group starts with one that allows everything out.',
  },
  'sg-stateful': {
    term: 'Stateful',
    short: 'Remembers each conversation, so the reply to a request a security group let in goes back out without its own rule.',
  },
  'cidr-block': {
    term: 'CIDR block',
    short: 'A short way to write a range of addresses: 203.0.113.10/32 is exactly one address, and 0.0.0.0/0 is every IPv4 address.',
  },
}
