import type { Glossary } from '../../../../course/types'

/** Glossary terms this lesson adds (only ones missing from the shared glossary). */
export const terms: Glossary = {
  'nitro-system': {
    term: 'AWS Nitro System',
    short:
      'The hardware and lightweight hypervisor that run modern EC2 instances. It splits one physical server into instances and keeps each one isolated from the others.',
  },
  ami: {
    term: 'AMI (Amazon Machine Image)',
    short:
      'The image a new instance starts from. It holds the operating system and any software already installed, so every instance launched from it starts the same.',
  },
  'instance-type': {
    term: 'Instance type',
    short:
      'The size and kind of an instance: how many virtual CPUs and how much memory it gets. Names look like t3.micro or m5.large.',
  },
  'key-pair': {
    term: 'Key pair',
    short:
      'Two matching keys for logging in to an instance over SSH. AWS puts the public key on the instance, and you keep the private key.',
  },
  ssh: {
    term: 'SSH (Secure Shell)',
    short: 'A secure way to log in to a server over the network and type commands on it.',
  },
  'public-ip': {
    term: 'Public IP address',
    short: 'An address on the internet that browsers and other computers use to reach your instance.',
  },
}
