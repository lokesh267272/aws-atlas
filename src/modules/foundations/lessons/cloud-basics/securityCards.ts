/**
 * Jobs for "Try it: sort the security jobs".
 * Each answer follows the AWS shared responsibility model
 * (https://aws.amazon.com/compliance/shared-responsibility-model/), assuming
 * your shop runs on Amazon EC2. Wording is chosen so each card has one clear owner.
 */
export type Side = 'aws' | 'you'

export interface SecurityCard {
  id: string
  job: string
  answer: Side
  /** One line: why this is the right owner */
  reason: string
}

export const SECURITY_CARDS: SecurityCard[] = [
  {
    id: 'doors',
    job: 'Guard the data center doors and check who comes in',
    answer: 'aws',
    reason: 'Physical security of the buildings is security of the cloud. Only approved people get inside, and visitors are escorted by AWS staff.',
  },
  {
    id: 'patch-os',
    job: 'Install security patches on the operating system of your EC2 server',
    answer: 'you',
    reason: 'On EC2 the guest operating system is yours, so patching it is your job. AWS patches its own infrastructure.',
  },
  {
    id: 'hypervisor',
    job: 'Keep the hypervisor that runs virtual machines secure',
    answer: 'aws',
    reason: 'AWS looks after everything from the virtualization layer down to the hardware and the building.',
  },
  {
    id: 'delete-files',
    job: 'Decide which people on your team can delete files',
    answer: 'you',
    reason: 'Who can do what is set with IAM permissions, and you write those.',
  },
  {
    id: 'drives',
    job: 'Replace a failed hard drive inside an AWS server, and destroy the old one safely',
    answer: 'aws',
    reason: 'AWS owns the hardware. Old drives are securely wiped or destroyed before they leave AWS control.',
  },
  {
    id: 'ports',
    job: 'Allow only the kinds of traffic your app needs (for example, web traffic) in a security group',
    answer: 'you',
    reason: 'A security group is a firewall that you configure. AWS enforces the rules, but you choose them.',
  },
  {
    id: 'encrypt',
    job: 'Choose how your customer data is encrypted, and who holds the keys',
    answer: 'you',
    reason: 'AWS provides encryption tools, and some services encrypt by default, but choices about your data are yours.',
  },
  {
    id: 'cables',
    job: 'Maintain the physical network cables and routers between AWS data centers',
    answer: 'aws',
    reason: 'The global network hardware belongs to AWS, so keeping it running and secure is AWS’s job.',
  },
  {
    id: 'region',
    job: 'Choose which AWS Region (geographic area) stores your data',
    answer: 'you',
    reason: 'You pick the Region. AWS does not move your content out of it without your agreement.',
  },
  {
    id: 'passwords',
    job: 'Set the password rules for any IAM users in your AWS account',
    answer: 'you',
    reason:
      'You set the IAM password policy: minimum length, required characters and expiry. Later you will see that AWS recommends people sign in through IAM Identity Center instead of IAM users.',
  },
]
