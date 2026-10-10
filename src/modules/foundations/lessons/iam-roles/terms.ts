import type { Glossary } from '../../../../course/types'

/** Glossary terms this lesson adds (only ones missing from src/course/glossary.ts). */
export const terms: Glossary = {
  'code-repository': {
    term: 'Code repository',
    short:
      'A shared store for a project’s code and its full change history, often on a site like GitHub. Anyone on the internet can read a public repository.',
  },
  'instance-metadata-service': {
    term: 'Instance metadata service (IMDS)',
    short:
      'A small information service that only programs on an EC2 instance can reach, at the address 169.254.169.254. It tells the instance about itself and hands out the temporary credentials of the instance’s role.',
  },
  'session-token': {
    term: 'Session token',
    short:
      'The third value in a set of temporary credentials. A program must send it together with the temporary access key ID and secret access key, or AWS refuses the request.',
  },
  'service-principal': {
    term: 'Service principal',
    short:
      'The name that stands for an AWS service inside a policy, such as ec2.amazonaws.com or lambda.amazonaws.com. Naming it in a trust policy lets that service assume the role.',
  },
  'max-session-duration': {
    term: 'Maximum session duration',
    short:
      'A setting on each role, from 1 to 12 hours, that caps how long the temporary credentials can last when someone asks for them. It is 1 hour unless you change it.',
  },
  'cross-account-access': {
    term: 'Cross-account access',
    short:
      'Letting identities in one AWS account use resources in another account, usually by assuming a role that lives in the other account.',
  },
  'permission-set': {
    term: 'Permission set',
    short:
      'A template of permissions in IAM Identity Center. When you assign it to people for an AWS account, Identity Center creates a matching IAM role in that account.',
  },
  'execution-role': {
    term: 'Execution role',
    short:
      'The IAM role a Lambda function wears. Lambda assumes it when the function runs, so your code gets temporary credentials without storing any keys.',
  },
  lambda: {
    term: 'AWS Lambda',
    short:
      'A compute service that runs small pieces of your code, called functions, only when something triggers them. You do not manage any server.',
  },
  'identity-provider': {
    term: 'Identity provider (IdP)',
    short:
      'The system that signs people in and vouches for who they are, such as your company’s login service. A role can trust an identity provider, so its people can use AWS without IAM users.',
  },
  saml: {
    term: 'SAML',
    short:
      'A standard way for an identity provider to vouch for a person to another service, such as AWS, with a signed message. It lets people use their work login instead of a separate AWS password.',
  },
  'break-glass-access': {
    term: 'Break-glass access',
    short:
      'A locked-away emergency way into an AWS account, for when normal sign-in is broken. It is protected with MFA, used rarely, and every use is logged and checked.',
  },
}
