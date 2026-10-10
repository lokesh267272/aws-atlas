import type { Glossary } from '../../../../course/types'

/** Glossary terms this lesson adds (only ones missing from src/course/glossary.ts). */
export const terms: Glossary = {
  capacity: {
    term: 'Capacity',
    short: 'How much work your servers can handle, for example how many visitors a day your shop can serve.',
  },
  'idle-capacity': {
    term: 'Idle capacity',
    short: 'Server power you have paid for but are not using. It costs money and does nothing.',
  },
  'operating-system': {
    term: 'Operating system (OS)',
    short:
      'The base software that runs a computer and lets other programs use its hardware. Linux and Windows are operating systems.',
  },
  'guest-operating-system': {
    term: 'Guest operating system',
    short:
      'The operating system running inside a virtual machine, such as the Linux on your EC2 instance. On EC2, keeping it patched is your job.',
  },
  runtime: {
    term: 'Runtime',
    short: 'The software your code needs in order to run, such as Python, Node.js or Java.',
  },
  'managed-service': {
    term: 'Managed service',
    short:
      'A service where AWS runs the servers and software underneath for you. You set it up and use it, and you still look after your data and who can access it. Amazon RDS is a managed database service.',
  },
  'elastic-beanstalk': {
    term: 'AWS Elastic Beanstalk',
    short:
      'A service where you upload your app’s code and AWS sets up and runs the servers, operating system and runtime it needs.',
  },
  rds: {
    term: 'Amazon RDS',
    short:
      'Relational Database Service: AWS runs a database such as PostgreSQL or MySQL for you, including the server underneath and routine software patches. Moving to a new major database version is still your decision.',
  },
  'auto-scaling': {
    term: 'Auto scaling',
    short:
      'Adding servers automatically when traffic rises and removing them when it falls, following rules you set.',
  },
}
