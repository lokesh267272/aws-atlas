import {
  Activity,
  Bell,
  Boxes,
  Database,
  Footprints,
  HardDrive,
  Inbox,
  KeyRound,
  Network,
  Radio,
  Server,
  Table2,
  Waypoints,
  Webhook,
  Zap,
} from 'lucide-react'
import type { MapService } from './types'

/**
 * The core services drawn on the course map, each placed where it really lives.
 * Lessons and modules refer to these by id.
 */
export const mapServices: MapService[] = [
  {
    id: 'iam',
    name: 'IAM',
    fullName: 'Identity and Access Management',
    plain: 'Decides who can sign in to your AWS account and what each person or program is allowed to do.',
    category: 'security',
    scope: 'global',
    icon: KeyRound,
  },
  {
    id: 'route53',
    name: 'Route 53',
    fullName: 'Amazon Route 53',
    plain: 'The internet’s phone book for your app: turns names like shop.example.com into server addresses.',
    category: 'networking',
    scope: 'edge',
    icon: Waypoints,
  },
  {
    id: 'cloudfront',
    name: 'CloudFront',
    fullName: 'Amazon CloudFront',
    plain: 'Keeps copies of your website’s files in cities around the world so pages load fast for everyone.',
    category: 'networking',
    scope: 'edge',
    icon: Radio,
  },
  {
    id: 's3',
    name: 'S3',
    fullName: 'Amazon Simple Storage Service',
    plain: 'Stores any number of files (photos, backups, videos, logs) and lets you fetch them over the internet.',
    category: 'storage',
    scope: 'regional',
    icon: Boxes,
  },
  {
    id: 'dynamodb',
    name: 'DynamoDB',
    fullName: 'Amazon DynamoDB',
    plain: 'A very fast database for simple lookups by key, with no servers for you to manage.',
    category: 'database',
    scope: 'regional',
    icon: Table2,
  },
  {
    id: 'lambda',
    name: 'Lambda',
    fullName: 'AWS Lambda',
    plain: 'Runs a small piece of your code when something happens, and you pay only while it runs.',
    category: 'compute',
    scope: 'regional',
    icon: Zap,
  },
  {
    id: 'apigateway',
    name: 'API Gateway',
    fullName: 'Amazon API Gateway',
    plain: 'The front door for your app’s web API: receives requests and passes them to your code.',
    category: 'networking',
    scope: 'regional',
    icon: Webhook,
  },
  {
    id: 'sqs',
    name: 'SQS',
    fullName: 'Amazon Simple Queue Service',
    plain: 'A waiting line for messages, so one part of your app can hand work to another without waiting.',
    category: 'integration',
    scope: 'regional',
    icon: Inbox,
  },
  {
    id: 'sns',
    name: 'SNS',
    fullName: 'Amazon Simple Notification Service',
    plain: 'Sends one message out to many receivers at once: other programs, email, or text messages.',
    category: 'integration',
    scope: 'regional',
    icon: Bell,
  },
  {
    id: 'cloudwatch',
    name: 'CloudWatch',
    fullName: 'Amazon CloudWatch',
    plain: 'Collects measurements and logs from your resources and alerts you when something looks wrong.',
    category: 'management',
    scope: 'regional',
    icon: Activity,
  },
  {
    id: 'cloudtrail',
    name: 'CloudTrail',
    fullName: 'AWS CloudTrail',
    plain: 'Keeps a record of who did what in your account, and when: every action becomes a log entry.',
    category: 'management',
    scope: 'regional',
    icon: Footprints,
  },
  {
    id: 'elb',
    name: 'Load Balancer',
    fullName: 'Elastic Load Balancing',
    plain: 'Shares incoming visitors across several servers and stops sending traffic to any that fail.',
    category: 'networking',
    scope: 'vpc',
    icon: Network,
  },
  {
    id: 'ec2',
    name: 'EC2',
    fullName: 'Amazon Elastic Compute Cloud',
    plain: 'Rents you virtual servers (computers in an AWS data center) by the second.',
    category: 'compute',
    scope: 'zonal',
    icon: Server,
  },
  {
    id: 'ebs',
    name: 'EBS',
    fullName: 'Amazon Elastic Block Store',
    plain: 'A virtual hard drive that plugs into an EC2 server and keeps its data when the server stops.',
    category: 'storage',
    scope: 'zonal',
    icon: HardDrive,
  },
  {
    id: 'rds',
    name: 'RDS',
    fullName: 'Amazon Relational Database Service',
    plain: 'Runs a traditional SQL database (like PostgreSQL or MySQL) and handles backups and updates for you.',
    category: 'database',
    scope: 'zonal',
    icon: Database,
  },
]

/** Parts of the map that are places, not services. Modules can cover these too. */
export const mapPlaces = {
  global: {
    name: 'Global services',
    plain: 'Services that are not tied to any one Region. One copy serves your whole account everywhere. IAM is the best-known example.',
  },
  cloud: {
    name: 'AWS Cloud',
    plain: 'Everything AWS runs for you: a worldwide network of data centers you rent instead of buy.',
  },
  region: {
    name: 'Region',
    plain: 'A geographic area, such as Northern Virginia or Frankfurt, with its own cluster of data centers.',
  },
  az: {
    name: 'Availability Zone',
    plain: 'One or more separate data centers inside a Region, each with its own power and network.',
  },
  edge: {
    name: 'Edge locations',
    plain: 'Hundreds of small AWS sites, spread over more than 100 cities, that deliver content and answer DNS lookups close to users.',
  },
  vpc: {
    name: 'VPC',
    plain: 'Your own private network inside a Region, walled off from everyone else’s.',
  },
  account: {
    name: 'AWS account',
    plain: 'Your container for everything you create in AWS, and the boundary for billing and security.',
  },
} as const

export type MapPlaceId = keyof typeof mapPlaces

export const getMapService = (id: string) => mapServices.find((s) => s.id === id)
