import type { Glossary } from '../../../../course/types'

/** Glossary terms this lesson adds (only ones missing from src/course/glossary.ts). */
export const terms: Glossary = {
  'round-trip-time': {
    term: 'Round-trip time',
    short:
      'How long a message takes to reach a server plus how long the reply takes to come back. It is the usual way to measure latency.',
  },
  'single-point-of-failure': {
    term: 'Single point of failure',
    short: 'One part that takes the whole system down when it breaks, because nothing else can do its job.',
  },
  'health-check': {
    term: 'Health check',
    short:
      'A small test request sent again and again to see if a server still answers. After a set number of failures in a row, traffic is sent elsewhere.',
  },
  'multi-az': {
    term: 'Multi-AZ',
    short: 'Running copies of your app in two or more Availability Zones of the same Region, so one zone can fail without taking you down.',
  },
  ttl: {
    term: 'TTL (time to live)',
    short:
      'How long DNS servers and devices may keep reusing a saved DNS answer before they must ask again. A short TTL means changes, such as a failover, reach users sooner.',
  },
  rto: {
    term: 'RTO (recovery time objective)',
    short: 'The longest time your business can accept being offline after a failure, for example “back within 15 minutes”.',
  },
  production: {
    term: 'Production',
    short: 'The live version of an app that real customers use, as opposed to copies for building and testing.',
  },
  rpo: {
    term: 'RPO (recovery point objective)',
    short:
      'How much recent data your business can accept losing in a failure, measured in time, for example “at most the last 5 minutes of orders”.',
  },
}
