import type { Glossary } from '../../../../course/types'

/** Glossary terms this lesson adds (only ones missing from the shared glossary). */
export const terms: Glossary = {
  'per-second-billing': {
    term: 'Per-second billing',
    short:
      'Paying for each second a server runs, with at least 60 seconds charged for every start (for most servers, including Linux and Windows).',
  },
  'on-demand-instance': {
    term: 'On-Demand Instance',
    short:
      'The default way to pay for an EC2 server: only while it runs, with no commitment.',
  },
  'savings-plan': {
    term: 'Savings Plan',
    short:
      'A lower price for promising to spend a set amount per hour for 1 or 3 years, paid even when you use less.',
  },
  'spot-instance': {
    term: 'Spot Instance',
    short:
      'A server made from spare EC2 capacity at a large discount, which AWS can take back when it needs the capacity.',
  },
  'spot-interruption': {
    term: 'Spot interruption',
    short:
      'When AWS takes a Spot Instance back because it needs the capacity, aiming to warn you 2 minutes before.',
  },
  'reserved-instance': {
    term: 'Reserved Instance',
    short:
      'The older way to commit: a lower price for promising to use a specific server configuration in one Region for 1 or 3 years.',
  },
}
