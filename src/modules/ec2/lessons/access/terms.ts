import type { Glossary } from '../../../../course/types'

/** Glossary terms this lesson adds (only ones missing from the shared glossary). */
export const terms: Glossary = {
  'network-port': {
    term: 'Port',
    short:
      'A numbered door on a server. Each kind of traffic uses its own number, such as 443 for secure websites (HTTPS) and 22 for remote logins (SSH).',
  },
  'ssh-protocol': {
    term: 'SSH (Secure Shell)',
    short:
      'A secure way to log in to a server’s command line over the network. It uses port 22, and on EC2 you usually prove who you are with a key pair.',
  },
  'sg-inbound-rule': {
    term: 'Inbound rule',
    short:
      'A line in a security group that lets one kind of traffic in: a port plus where the traffic may come from. Traffic that matches no rule is blocked.',
  },
  'sg-outbound-rule': {
    term: 'Outbound rule',
    short:
      'A line in a security group that lets traffic leave the server. A security group you create starts with one that allows all traffic out.',
  },
  'sg-stateful': {
    term: 'Stateful',
    short:
      'Remembers each conversation. Security groups are stateful, so the reply to a request they let in goes back out without needing a rule of its own.',
  },
  'cidr-block': {
    term: 'CIDR block',
    short:
      'A short way to write a range of internet addresses. 203.0.113.10/32 means exactly that one address, and 0.0.0.0/0 means every IPv4 address (anywhere).',
  },
  'ssh-key-pair': {
    term: 'Key pair',
    short:
      'Two matching keys for logging in to a server over SSH. AWS puts the public key on the server and you keep the private key, which only you should have.',
  },
}
