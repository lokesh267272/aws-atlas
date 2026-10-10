import type { Glossary } from '../../../../course/types'

/** Glossary terms this lesson adds (only ones missing from src/course/glossary.ts). */
export const terms: Glossary = {
  'job-function-policy': {
    term: 'Job function policy',
    short:
      'An AWS managed policy built for a common job at work, such as AdministratorAccess, PowerUserAccess, Billing or ViewOnlyAccess. AWS keeps it up to date as services change.',
  },
  'iam-access-analyzer': {
    term: 'IAM Access Analyzer',
    short:
      'A feature of IAM that points out access you may not want, such as permissions nobody uses, unused roles and access keys, or resources shared outside your account.',
    long: 'Some of its checks are free. Its unused-access analysis is charged per IAM user and role it watches.',
  },
}
