import type { Glossary } from '../../../../course/types'

/**
 * Glossary terms this lesson adds (only ones missing from the shared glossary).
 * Also used here but defined by other lessons: instance-type (launch), instance-store (storage).
 */
export const terms: Glossary = {
  'instance-family': {
    term: 'Instance family',
    short:
      'A group of instance types built for the same kind of work, shown by the letter at the start of the name, such as m, c or r.',
  },
  'instance-size': {
    term: 'Instance size',
    short:
      'The part of an instance type name after the dot, such as large or 2xlarge, where each step up roughly doubles the vCPUs, memory and price.',
  },
  vcpu: {
    term: 'vCPU (virtual CPU)',
    short: 'One unit of processing power in a virtual server, so more vCPUs means more work at the same time.',
  },
  gib: {
    term: 'GiB (gibibyte)',
    short: 'A unit of memory or storage a little bigger than a gigabyte, which EC2 uses to list each instance type’s memory.',
  },
  graviton: {
    term: 'AWS Graviton',
    short:
      'Processors that AWS designs itself, shown by a g straight after the generation number, as in m7g.',
  },
  gpu: {
    term: 'GPU (graphics processing unit)',
    short: 'A chip with thousands of small cores that do maths side by side, speeding up graphics, video and machine learning.',
  },
}
