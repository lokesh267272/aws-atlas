import type { Glossary } from '../../../../course/types'

/** Glossary terms this lesson adds (only ones missing from src/course/glossary.ts). */
export const terms: Glossary = {
  'fibre-optic': {
    term: 'Fibre-optic cable',
    short:
      'A cable made of thin strands of glass that carry data as pulses of light. Most internet traffic, including the cables under the oceans, travels this way.',
  },
  partition: {
    term: 'Partition',
    short:
      'A separate group of AWS Regions with its own accounts. A standard AWS account cannot see or use the Regions in another partition, such as AWS GovCloud (US) or the China Regions.',
  },
  'opt-in-region': {
    term: 'Opt-in Region',
    short:
      'A Region that stays switched off in your account until you turn it on. Regions launched after 20 March 2019 work this way.',
  },
  'az-id': {
    term: 'AZ ID',
    short:
      'A fixed label for one physical Availability Zone, such as use1-az1. It means the same place in every AWS account.',
    long: 'AZ names such as us-east-1a are what you usually see. In some older Regions, older accounts can have the same name pointing at different physical AZs, so teams compare AZ IDs instead.',
  },
  rack: {
    term: 'Rack',
    short:
      'A tall metal frame in a data center that holds many servers stacked on top of each other, sharing power and network cables.',
  },
  'wavelength-zone': {
    term: 'Wavelength Zone',
    short:
      'AWS computers placed inside a telecom company’s network, close to mobile phone users, for apps that need very little delay. Each one belongs to a parent Region.',
  },
  'aws-outposts': {
    term: 'AWS Outposts',
    short:
      'AWS hardware installed in your own building and managed by AWS, so you can run AWS services on site with the same tools you use in a Region.',
  },
  dynamodb: {
    term: 'Amazon DynamoDB',
    short:
      'An AWS database that stores data as simple records, each found by a key, and that AWS runs for you. You create a table in one Region, and AWS keeps copies across several of its Availability Zones.',
  },
  lambda: {
    term: 'AWS Lambda',
    short:
      'A service that runs a small piece of your code (a function) whenever something triggers it, without you managing any servers. You pay only while the code runs.',
  },
  ebs: {
    term: 'Amazon EBS',
    short:
      'Elastic Block Store: virtual disks for EC2 instances. Each volume lives in one Availability Zone and attaches to an instance in that same AZ.',
  },
}
