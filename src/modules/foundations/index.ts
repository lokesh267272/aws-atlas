import type { CourseModule } from '../../course/types'
import { terms as cloudBasics } from './lessons/cloud-basics/terms'
import { terms as globalInfrastructure } from './lessons/global-infrastructure/terms'
import { terms as regionsAndResilience } from './lessons/regions-and-resilience/terms'
import { terms as accountAndAccess } from './lessons/account-and-access/terms'
import { terms as iamIdentities } from './lessons/iam-identities/terms'
import { terms as iamPolicies } from './lessons/iam-policies/terms'
import { terms as iamRoles } from './lessons/iam-roles/terms'
import { terms as checkpoint } from './lessons/checkpoint/terms'

export const foundations: CourseModule = {
  id: 'foundations',
  number: 1,
  title: 'Foundations',
  tagline: 'The cloud, the AWS world map, and who is allowed to do what',
  description:
    'Before you launch a single server, you need three ideas: what renting computers from AWS really means, where AWS keeps those computers around the world, and how AWS decides who may touch what. Every later module builds on these.',
  outcomes: [
    'Explain the cloud in plain words, and when it beats buying your own servers',
    'Read the AWS map: Regions, Availability Zones and edge locations',
    'Pick a Region for a real situation, and design an app that survives a data center failure',
    'Set up an AWS account safely and use the console, the command line and code',
    'Use IAM users, groups, roles and policies to give people exactly the access they need',
  ],
  covers: ['cloud', 'global', 'region', 'az', 'edge', 'account', 'iam'],
  lessons: [
    {
      id: 'cloud-basics',
      title: 'What the cloud really is',
      summary: 'Renting instead of buying, why it changes how you plan, and who secures what.',
      minutes: 20,
      load: () => import('./lessons/cloud-basics/Lesson'),
    },
    {
      id: 'global-infrastructure',
      title: 'The AWS world map',
      summary: 'Regions, Availability Zones and edge locations, and how they nest inside each other.',
      minutes: 20,
      load: () => import('./lessons/global-infrastructure/Lesson'),
    },
    {
      id: 'regions-and-resilience',
      title: 'Choosing a Region and surviving failures',
      summary: 'Pick the right Region for a job, then break things to see why one data center is never enough.',
      minutes: 18,
      load: () => import('./lessons/regions-and-resilience/Lesson'),
    },
    {
      id: 'account-and-access',
      title: 'Your account, and three ways to talk to AWS',
      summary: 'The AWS account, the all-powerful root user, and the console, CLI and SDKs that all speak the same API.',
      minutes: 12,
      load: () => import('./lessons/account-and-access/Lesson'),
    },
    {
      id: 'iam-identities',
      title: 'IAM: who can do what',
      summary: 'Users, groups, roles and policies, and the habit of giving only the access a job needs.',
      minutes: 14,
      load: () => import('./lessons/iam-identities/Lesson'),
    },
    {
      id: 'iam-policies',
      title: 'Reading and testing policies',
      summary: 'Take a policy apart line by line, then watch AWS decide Allow or Deny for real requests.',
      minutes: 15,
      load: () => import('./lessons/iam-policies/Lesson'),
    },
    {
      id: 'iam-roles',
      title: 'Roles and temporary credentials',
      summary: 'Why apps should wear a role instead of carrying a key, and how temporary credentials work.',
      minutes: 12,
      load: () => import('./lessons/iam-roles/Lesson'),
    },
    {
      id: 'checkpoint',
      title: 'Module checkpoint',
      summary: 'Put the whole map back together and test yourself on everything in this module.',
      minutes: 15,
      load: () => import('./lessons/checkpoint/Lesson'),
    },
  ],
  terms: {
    ...cloudBasics,
    ...globalInfrastructure,
    ...regionsAndResilience,
    ...accountAndAccess,
    ...iamIdentities,
    ...iamPolicies,
    ...iamRoles,
    ...checkpoint,
  },
}
