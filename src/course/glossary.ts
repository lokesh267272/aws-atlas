import type { Glossary } from './types'

/**
 * Course-wide glossary. Lessons link to these with <Term k="key">.
 * Write every definition for someone who has never used AWS:
 * short sentences, everyday words, and no term that is not itself explained.
 * Modules can add more terms through their own `terms` export.
 */
export const baseGlossary: Glossary = {
  // Cloud basics
  'cloud-computing': {
    term: 'Cloud computing',
    short:
      'Renting computers, storage and software over the internet, when you need them, and paying only for what you use.',
  },
  aws: {
    term: 'AWS (Amazon Web Services)',
    short: 'Amazon’s cloud. It offers over 200 services you can rent, from servers to databases to AI tools.',
  },
  server: {
    term: 'Server',
    short: 'A computer whose job is to serve other computers, for example by sending web pages or storing data.',
  },
  'data-center': {
    term: 'Data center',
    short:
      'A building full of servers, with industrial power, cooling, network cables and security guards.',
  },
  'on-premises': {
    term: 'On-premises (on-prem)',
    short: 'Running your own servers in a building you control, instead of renting them from a cloud provider.',
  },
  'virtual-machine': {
    term: 'Virtual machine (VM)',
    short:
      'A software computer that runs on a real one. One physical server can host many virtual machines that act like separate computers.',
  },
  virtualization: {
    term: 'Virtualization',
    short: 'The technique of splitting one physical computer into several virtual ones.',
  },
  hypervisor: {
    term: 'Hypervisor',
    short: 'The software layer that creates and runs virtual machines and keeps them apart from each other.',
  },
  scalability: {
    term: 'Scalability',
    short: 'The ability to handle more work by adding more resources.',
  },
  elasticity: {
    term: 'Elasticity',
    short:
      'Growing and shrinking resources automatically as demand changes, so you are never stuck with too much or too little.',
  },
  'pay-as-you-go': {
    term: 'Pay-as-you-go',
    short: 'Paying only for what you actually use, like an electricity bill, instead of buying equipment up front.',
  },
  capex: {
    term: 'CapEx (capital expense)',
    short: 'Money spent up front to buy things you own, such as servers.',
  },
  opex: {
    term: 'OpEx (operating expense)',
    short: 'Ongoing money spent to run things, such as a monthly cloud bill.',
  },
  iaas: {
    term: 'IaaS (Infrastructure as a Service)',
    short:
      'Renting the basic building blocks (virtual servers, storage, networks). You manage everything you install on them. Example: Amazon EC2.',
  },
  paas: {
    term: 'PaaS (Platform as a Service)',
    short:
      'Renting a ready-made platform to run your code. The provider manages the servers and operating system. Example: AWS Elastic Beanstalk.',
  },
  saas: {
    term: 'SaaS (Software as a Service)',
    short: 'Finished software you simply use, often in a browser, like web email. The provider runs the software and everything under it; your data and who can get into your account are still yours.',
  },
  'shared-responsibility': {
    term: 'Shared responsibility model',
    short:
      'AWS secures the cloud itself (buildings, hardware, the global network). You secure what you put in the cloud (your data, settings and users).',
  },
  patching: {
    term: 'Patching',
    short: 'Installing software updates that fix bugs and security holes.',
  },
  encryption: {
    term: 'Encryption',
    short: 'Scrambling data so only someone with the right key can read it.',
  },
  firewall: {
    term: 'Firewall',
    short: 'A filter that decides which network traffic may reach a computer and which is blocked.',
  },

  // Global infrastructure
  region: {
    term: 'Region',
    short:
      'A geographic area where AWS has a cluster of data centers, such as Northern Virginia (us-east-1) or Frankfurt (eu-central-1). Each Region is independent of the others.',
  },
  'availability-zone': {
    term: 'Availability Zone (AZ)',
    short:
      'One or more separate data centers inside a Region, with their own power, cooling and network. AZs in a Region are kilometres apart but linked by very fast private connections.',
  },
  'edge-location': {
    term: 'Edge location',
    short:
      'A small AWS site in a city near users. Edge locations keep copies of content (CloudFront) and answer DNS lookups (Route 53) so responses arrive faster.',
  },
  'point-of-presence': {
    term: 'Point of presence (PoP)',
    short: 'Another name for an edge location: a place where AWS’s network meets the local internet.',
  },
  'local-zone': {
    term: 'Local Zone',
    short:
      'An extension of a Region placed in a big city, for apps that need very low delay for people in that city.',
  },
  'region-code': {
    term: 'Region code',
    short:
      'The short name AWS uses for a Region, such as us-east-1. You type it in the command line and in code.',
  },
  latency: {
    term: 'Latency',
    short: 'The delay between asking for something and getting the answer, usually measured in milliseconds.',
  },
  millisecond: {
    term: 'Millisecond (ms)',
    short: 'One thousandth of a second. A blink of an eye takes a few hundred milliseconds.',
  },
  'high-availability': {
    term: 'High availability',
    short: 'Designing a system so it keeps working almost all the time, even when parts of it fail.',
  },
  'fault-tolerance': {
    term: 'Fault tolerance',
    short: 'The ability to keep running without interruption when a component breaks.',
  },
  redundancy: {
    term: 'Redundancy',
    short: 'Having spare copies of something, so a backup takes over if one copy fails.',
  },
  failover: {
    term: 'Failover',
    short: 'Automatically switching to a backup when the main system fails.',
  },
  'disaster-recovery': {
    term: 'Disaster recovery (DR)',
    short: 'Your plan and setup for getting back up and running after a major failure.',
  },
  'data-residency': {
    term: 'Data residency',
    short: 'Rules about which country or region your data must be stored in.',
  },
  compliance: {
    term: 'Compliance',
    short: 'Following the laws, regulations and industry rules that apply to your data and business.',
  },
  'load-balancer': {
    term: 'Load balancer',
    short:
      'A traffic director that shares incoming requests across several servers and skips any that are unhealthy.',
  },
  uptime: {
    term: 'Uptime',
    short: 'The share of time a system is working. 99.9% uptime still allows about 8.8 hours of downtime a year.',
  },

  // Account and access
  'aws-account': {
    term: 'AWS account',
    short:
      'Your container for AWS resources. It is also a billing boundary (one bill) and a security boundary (identities in one account cannot touch another account unless allowed).',
  },
  'account-id': {
    term: 'Account ID',
    short: 'The 12-digit number that identifies an AWS account, such as 123456789012.',
  },
  'root-user': {
    term: 'Root user',
    short:
      'The identity created with your account’s email address. It has full access to everything in the account by default, so you protect it with MFA and use it only for a few special tasks.',
  },
  mfa: {
    term: 'MFA (multi-factor authentication)',
    short:
      'Signing in with two proofs: something you know (a password) and something you have (a phone app or security key).',
  },
  'management-console': {
    term: 'AWS Management Console',
    short: 'The AWS website where you click through menus and forms to manage your resources.',
  },
  cli: {
    term: 'AWS CLI (command line interface)',
    short: 'A program you type commands into, such as aws s3 ls, to control AWS from a terminal.',
  },
  sdk: {
    term: 'SDK (software development kit)',
    short:
      'A code library that lets your programs talk to AWS, available for Python, JavaScript, Java and other languages.',
  },
  api: {
    term: 'API (application programming interface)',
    short:
      'A set of requests a program can send to a service. Every AWS action, from a console click to a CLI command, becomes an API call.',
  },
  'infrastructure-as-code': {
    term: 'Infrastructure as Code (IaC)',
    short:
      'Describing your servers, networks and settings in text files so a tool can create them the same way every time.',
  },
  arn: {
    term: 'ARN (Amazon Resource Name)',
    short:
      'A unique address for an AWS resource, for example arn:aws:s3:::my-photos. Policies use ARNs to say which resource a rule is about.',
  },
  credentials: {
    term: 'Credentials',
    short: 'Secrets that prove who you are, such as a password or an access key.',
  },
  'access-key': {
    term: 'Access key',
    short:
      'A pair of long-term secrets (an access key ID and a secret access key) that programs and the CLI use to call AWS. Treat it like a password.',
  },
  terminal: {
    term: 'Terminal',
    short: 'A text window where you type commands instead of clicking.',
  },
  json: {
    term: 'JSON',
    short:
      'A simple text format for structured data, made of "name": value pairs in curly braces. AWS uses it for policies and command output.',
  },
  cloudtrail: {
    term: 'AWS CloudTrail',
    short: 'A service that records actions in your account: who did what, from where, and when. By default it records management actions, such as creating or deleting resources; recording data reads and writes (for example S3 files) has to be switched on.',
  },
  'aws-budgets': {
    term: 'AWS Budgets',
    short: 'A service that alerts you by email when your spending passes an amount you choose.',
  },

  // IAM
  iam: {
    term: 'IAM (Identity and Access Management)',
    short:
      'The AWS service that controls who can sign in (authentication) and what they are allowed to do (authorization). It is global and free.',
  },
  authentication: {
    term: 'Authentication',
    short: 'Proving who you are, for example with a password and MFA. Think: showing your ID card.',
  },
  authorization: {
    term: 'Authorization',
    short: 'Deciding what you are allowed to do once AWS knows who you are. Think: which doors your key card opens.',
  },
  principal: {
    term: 'Principal',
    short: 'Whoever is making a request to AWS: a person, a program, or an AWS service acting for you.',
  },
  identity: {
    term: 'Identity',
    short: 'Something AWS can recognise and give permissions to: an IAM user, group or role.',
  },
  'iam-user': {
    term: 'IAM user',
    short:
      'An identity for one person or program, with long-term credentials (a password and/or access keys).',
  },
  'iam-group': {
    term: 'IAM group',
    short:
      'A collection of IAM users. Permissions attached to the group apply to every user in it. A group cannot sign in by itself.',
  },
  'iam-role': {
    term: 'IAM role',
    short:
      'An identity with permissions but no password or long-term keys. Trusted people, apps or AWS services “put it on” for a while and receive temporary credentials.',
  },
  policy: {
    term: 'Policy',
    short:
      'A JSON document that lists permissions: which actions are allowed or denied, on which resources, and under which conditions.',
  },
  permission: {
    term: 'Permission',
    short: 'The right to perform a specific action, such as reading a file or starting a server.',
  },
  'managed-policy': {
    term: 'Managed policy',
    short:
      'A reusable policy you can attach to many identities. AWS managed policies are written by AWS; customer managed policies are written by you.',
  },
  'inline-policy': {
    term: 'Inline policy',
    short: 'A policy embedded directly in one user, group or role, and deleted along with it.',
  },
  'identity-based-policy': {
    term: 'Identity-based policy',
    short: 'A policy attached to a user, group or role. It says what that identity can do.',
  },
  'resource-based-policy': {
    term: 'Resource-based policy',
    short:
      'A policy attached to a resource, such as an S3 bucket. It says who can use that resource.',
  },
  'least-privilege': {
    term: 'Least privilege',
    short: 'Giving each identity only the permissions it needs for its job, and nothing more.',
  },
  'implicit-deny': {
    term: 'Implicit deny',
    short: 'The default answer in AWS: if no policy allows an action, it is denied. (The root user is the one exception.)',
  },
  'explicit-deny': {
    term: 'Explicit deny',
    short:
      'A policy statement with "Effect": "Deny" that matches the request. It always wins, even if another policy allows the same action.',
  },
  'explicit-allow': {
    term: 'Explicit allow',
    short: 'A policy statement with "Effect": "Allow" that matches the request. It overrides the default deny.',
  },
  action: {
    term: 'Action',
    short:
      'A specific operation in an AWS service, written as service:Operation, for example s3:GetObject (read a file).',
  },
  resource: {
    term: 'Resource',
    short: 'A thing you create in AWS, such as a server, a storage bucket or a database.',
  },
  condition: {
    term: 'Condition',
    short:
      'An optional extra test in a policy, for example “only if the person signed in with MFA” or “only from this IP address”.',
  },
  wildcard: {
    term: 'Wildcard (* and ?)',
    short: 'A character that stands for others. * matches any run of characters and ? matches exactly one. s3:* means every S3 action; arn:aws:s3:::photos/* means every file in the photos bucket.',
  },
  'temporary-credentials': {
    term: 'Temporary credentials',
    short:
      'Keys that expire on their own after a set time, from minutes to hours. If they leak, they soon stop working.',
  },
  sts: {
    term: 'AWS STS (Security Token Service)',
    short: 'The AWS service that hands out temporary credentials (for example when someone assumes a role). It can also tell you which identity your credentials belong to.',
  },
  'assume-role': {
    term: 'Assume a role',
    short: 'To temporarily take on a role’s permissions by asking AWS STS for temporary credentials.',
  },
  'trust-policy': {
    term: 'Trust policy',
    short: 'The part of a role that says who is allowed to assume it.',
  },
  'permissions-policy': {
    term: 'Permissions policy',
    short: 'A policy that says what an identity, such as a role, is allowed to do.',
  },
  'instance-profile': {
    term: 'Instance profile',
    short:
      'The container that attaches an IAM role to an EC2 server, so programs on that server get temporary credentials automatically.',
  },
  federation: {
    term: 'Federation',
    short:
      'Letting people sign in with an identity they already have elsewhere, such as a company login, instead of a separate AWS user.',
  },
  'iam-identity-center': {
    term: 'IAM Identity Center',
    short:
      'AWS’s recommended way for people to sign in. One login gives access to your AWS accounts with temporary credentials, and it can connect to your company directory.',
  },
  sso: {
    term: 'Single sign-on (SSO)',
    short: 'Signing in once to reach many apps or accounts without separate passwords for each.',
  },
  'permissions-boundary': {
    term: 'Permissions boundary',
    short:
      'An advanced IAM setting that caps the most an identity’s own (identity-based) policies can ever allow it to do.',
  },
  scp: {
    term: 'Service control policy (SCP)',
    short:
      'A guardrail set by AWS Organizations that limits what any identity in an account can do, even an administrator.',
  },

  // Services mentioned in passing
  ec2: {
    term: 'Amazon EC2',
    short: 'Elastic Compute Cloud: the service for renting virtual servers, called instances.',
  },
  instance: {
    term: 'Instance',
    short: 'One virtual server running in Amazon EC2.',
  },
  s3: {
    term: 'Amazon S3',
    short: 'Simple Storage Service: stores files (called objects) in containers called buckets.',
  },
  bucket: {
    term: 'Bucket',
    short: 'A container for files in Amazon S3. Its name must be unique across all AWS accounts (for almost everyone, that means across all of AWS).',
  },
  object: {
    term: 'Object',
    short: 'A file stored in Amazon S3, together with its metadata (information about the file).',
  },
  vpc: {
    term: 'VPC (Virtual Private Cloud)',
    short: 'Your own private, isolated network inside an AWS Region.',
  },
  subnet: {
    term: 'Subnet',
    short: 'A slice of a VPC’s network that lives in one Availability Zone.',
  },
  'security-group': {
    term: 'Security group',
    short: 'A virtual firewall around a resource, such as an EC2 instance, that controls which traffic can reach it and which traffic it can send out.',
  },
  cloudfront: {
    term: 'Amazon CloudFront',
    short: 'AWS’s content delivery network: it serves copies of your content from edge locations near your users.',
  },
  'route-53': {
    term: 'Amazon Route 53',
    short: 'AWS’s DNS service, which turns domain names into the addresses of your servers.',
  },
  dns: {
    term: 'DNS (Domain Name System)',
    short: 'The internet’s phone book. It turns names like example.com into the numeric addresses computers use.',
  },
  cdn: {
    term: 'CDN (content delivery network)',
    short: 'A network of servers around the world that keeps copies of content close to users.',
  },
}
