import type { Glossary } from '../../../../course/types'

/** Glossary terms this lesson adds (only ones missing from src/course/glossary.ts). */
export const terms: Glossary = {
  'aws-organizations': {
    term: 'AWS Organizations',
    short:
      'An AWS service for managing many AWS accounts together. You can group accounts, set guardrails for all of them, and pay one combined bill.',
  },
  https: {
    term: 'HTTPS',
    short:
      'The secure way browsers and programs talk to websites. It encrypts everything on the way, so nobody in between can read or change it.',
  },
  endpoint: {
    term: 'Endpoint',
    short:
      'The web address where an AWS service receives requests, such as iam.amazonaws.com for IAM. Your tools send their API calls there.',
  },
  'request-signing': {
    term: 'Request signing (SigV4)',
    short:
      'Your tool adds a signature, calculated from your credentials, to every API request. AWS uses it to check who sent the request and that nobody changed it on the way.',
    long: 'The method is called Signature Version 4 (SigV4). The console, the CLI and the SDKs do it for you.',
  },
  boto3: {
    term: 'boto3',
    short: 'The AWS SDK for Python. You install it with pip and call AWS from Python code, for example iam.create_user(...).',
  },
  cloudformation: {
    term: 'AWS CloudFormation',
    short:
      'AWS’s own Infrastructure as Code service. You describe resources in a template file (JSON or YAML) and CloudFormation creates them for you.',
  },
  'aws-cdk': {
    term: 'AWS CDK (Cloud Development Kit)',
    short:
      'Lets you describe infrastructure in a programming language such as TypeScript or Python. The CDK turns your code into a CloudFormation template.',
  },
  terraform: {
    term: 'Terraform',
    short: 'A popular Infrastructure as Code tool made by HashiCorp. It works with AWS and many other providers.',
  },
  'cli-profile': {
    term: 'Profile (AWS CLI)',
    short:
      'A named set of AWS CLI settings, such as which credentials and which Region to use. If you do not name one, the CLI uses the profile called default.',
  },
  'management-event': {
    term: 'Management event',
    short:
      'A CloudTrail record of an action that manages your resources, such as creating a user or starting a server. CloudTrail keeps the last 90 days of them in event history.',
  },
  passkey: {
    term: 'Passkey or security key',
    short:
      'A sign-in proof kept on your phone or laptop, or on a small USB security key. You unlock it with your fingerprint, face or PIN, or by tapping the key. AWS recommends them for MFA because they resist phishing.',
  },
  'free-tier': {
    term: 'AWS Free Tier',
    short:
      'AWS’s free offers: credits for new accounts, plus some services you can use for free up to a monthly limit.',
  },
  'free-plan': {
    term: 'AWS Free plan',
    short:
      'One of the two plans a new AWS account picks at sign-up. You are never charged: you use up your sign-up credits instead, and the account closes after six months or when the credits run out, unless you upgrade to the Paid plan.',
  },
  phishing: {
    term: 'Phishing',
    short: 'Tricking someone into typing a password or code into a fake website, email or message.',
  },
  // "partition" is used in this lesson but defined by the global-infrastructure lesson's terms.ts.
}
