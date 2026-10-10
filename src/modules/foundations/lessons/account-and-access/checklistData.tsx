import type { ReactNode } from 'react'
import { Term } from '../../../../components/Term'

export interface ChecklistItem {
  id: string
  title: string
  /** Short name used in the risk panel */
  short: string
  why: ReactNode
  /** Where you do it in AWS, in order */
  steps: string[]
  note?: ReactNode
  exposed: string
  covered: string
}

export const checklist: ChecklistItem[] = [
  {
    id: 'mfa',
    title: 'Turn on MFA for the root user',
    short: 'Root sign-in',
    why: (
      <>
        A password alone can be guessed, reused or stolen through <Term k="phishing">phishing</Term>. MFA adds a second
        proof that lives on a device you hold. AWS recommends a <Term k="passkey">passkey or security key</Term>, because
        a fake website cannot trick it into working.
      </>
    ),
    steps: [
      'Sign in as the root user',
      'Open the account menu in the top right and choose Security credentials',
      'In the Multi-factor authentication (MFA) section, choose Assign MFA device',
      'Pick a passkey or security key if you can, otherwise an authenticator app',
    ],
    note: (
      <>
        AWS requires MFA for every root user. If you have not added it, AWS asks at sign-in and allows at most 35 days
        from your first sign-in attempt. You can register up to eight MFA devices, so add a spare.
      </>
    ),
    exposed: 'Anyone who steals or guesses the root password can sign in and take over the account.',
    covered: 'A stolen password is not enough. The thief is stopped at the MFA step.',
  },
  {
    id: 'keys',
    title: 'Make sure the root user has no access keys',
    short: 'Root access keys',
    why: (
      <>
        Access keys let the CLI and programs act as an identity without typing a password or an MFA code. A root key
        would carry the root user’s unlimited power, including billing. New accounts have no root keys. Check, and keep
        it that way.
      </>
    ),
    steps: [
      'Open the account menu and choose Security credentials',
      'Look at the Access keys section: it should be empty',
      'If you find a root key, deactivate it and then delete it',
    ],
    exposed: 'Not checked yet. A root key, if one exists, would give a stranger full control without any MFA prompt.',
    covered: 'There is no root key to leak.',
  },
  {
    id: 'admin',
    title: 'Create an everyday admin identity and stop using root',
    short: 'Daily work',
    why: (
      <>
        Root is for a handful of special tasks. For daily work, give yourself an administrator identity that can be
        limited, watched and switched off. AWS recommends <Term k="iam-identity-center">IAM Identity Center</Term> for
        people: you sign in at one web portal and receive <Term k="temporary-credentials">temporary credentials</Term>.
        Creating an <Term k="iam-user">IAM user</Term> with a password is the older approach, and it relies on long-term
        credentials.
      </>
    ),
    steps: [
      'Open IAM Identity Center and choose Enable. In a standalone account this also creates an AWS Organization, with your account as its management account',
      'Create a user for yourself and give it administrator access to this account',
      'Sign out of root and sign back in through your AWS access portal',
    ],
    note: (
      <>
        Simplified: the real setup has a few more screens, such as choosing a permission set. Check your plan first: if
        your account is on the <Term k="free-plan">AWS Free plan</Term>, creating an organization upgrades it to the Paid
        plan, and AWS says your Free Tier credits expire straight away. To stay on the Free plan for now, use the older
        approach instead: an IAM user with a password and MFA.
      </>
    ),
    exposed: 'Daily work happens as root, so one wrong click or one stolen session has unlimited power.',
    covered: 'Daily work uses an identity you can limit, watch and switch off.',
  },
  {
    id: 'budget',
    title: 'Set up a budget alert',
    short: 'Surprise bills',
    why: (
      <>
        Cloud bills grow with use, and a forgotten server keeps costing money. <Term k="aws-budgets">AWS Budgets</Term>{' '}
        emails you when spending passes an amount you choose, or is forecast to. The zero spend budget template warns you
        as soon as you spend beyond the <Term k="free-tier">AWS Free Tier</Term>. If your account is on the Free plan, you
        are not billed. Instead your credits run down, and the account closes when the plan ends or the credits are gone,
        so watching your usage still matters.
      </>
    ),
    steps: [
      'Open Billing and Cost Management, then Budgets, then Create budget',
      'Choose Use a template (simplified) and pick Zero spend budget or Monthly cost budget',
      'Enter the email address that should receive alerts',
    ],
    note: (
      <>
        Budget data updates up to three times a day, so an alert can arrive hours after the spending. An alert only
        informs you. It does not switch anything off unless you also set up budget actions.
      </>
    ),
    exposed: 'A forgotten server could run up a bill for weeks before you notice.',
    covered: 'You get an email when spending passes your limit.',
  },
  {
    id: 'region',
    title: 'Check which Region you are working in',
    short: 'Lost resources',
    why: (
      <>
        Most services are <Term k="region">Regional</Term>: you pick a Region when you use them. A server you start in Frankfurt (eu-central-1) does not appear while the console is
        showing Ohio (us-east-2). For Regional services the console shows one Region at a time, picked in the Region
        selector. If something you created seems to have vanished, check the Region first. Global services such as IAM
        do not need a Region.
      </>
    ),
    steps: [
      'Find the Region name in the navigation bar, at the top right of the console',
      'Pick the Region you mean to use, usually the one closest to your users',
      'Optionally, set it as your default Region in the console settings',
    ],
    exposed: 'You might create something in one Region, then hunt for it (and keep paying for it) in another.',
    covered: 'You know where your resources live.',
  },
  {
    id: 'trail',
    title: 'Know where the activity log is',
    short: 'Who did what',
    why: (
      <>
        <Term k="cloudtrail">AWS CloudTrail</Term> is on from the day the account is created. Its event history shows the
        last 90 days of <Term k="management-event">management events</Term>, such as who created a user or deleted a
        server, and viewing it costs nothing. It shows one Region at a time. IAM is global, so its events (such as
        CreateUser) are recorded in US East (N. Virginia). For a record that lasts longer, you create a trail that stores
        the logs in an S3 bucket.
      </>
    ),
    steps: [
      'Open the CloudTrail console and choose Event history',
      'Filter by user name or by event name, for example CreateUser. For IAM events like this one, first switch the Region to US East (N. Virginia)',
      'Later, create a trail if you need to keep logs for longer than 90 days',
    ],
    exposed: 'If something odd happens, you would not know where to look to see who did it.',
    covered: 'You can see who did what for the last 90 days in CloudTrail event history.',
  },
]
