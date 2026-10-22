import type { Glossary } from '../../../../course/types'

/** Glossary terms this lesson adds (only ones missing from the shared glossary). */
export const terms: Glossary = {
  'per-second-billing': {
    term: 'Per-second billing',
    short:
      'Paying for each second a server runs. For Linux servers, every start is charged at least 60 seconds.',
  },
  'on-demand-instance': {
    term: 'On-Demand Instance',
    short:
      'The default way to pay for an EC2 server: you pay only for the time it runs, with no commitment, and can stop any time.',
  },
  'savings-plan': {
    term: 'Savings Plan',
    short:
      'A lower price in return for promising to spend a set amount per hour for 1 or 3 years. You pay that amount every hour, even if you use less.',
  },
  'spot-instance': {
    term: 'Spot Instance',
    short:
      'A server made from spare EC2 capacity, sold at a large discount. AWS can take it back when it needs the capacity, after a 2-minute warning.',
  },
  'spot-interruption': {
    term: 'Spot interruption',
    short:
      'When AWS takes a Spot Instance back because it needs the capacity. AWS gives a 2-minute warning first, so work that can pause and rerun is safe.',
  },
  'reserved-instance': {
    term: 'Reserved Instance',
    short:
      'The older way to commit: a lower price for promising to use one kind of server in one Region for 1 or 3 years. AWS now recommends Savings Plans instead.',
  },
}
