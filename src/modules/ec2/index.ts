import type { CourseModule } from '../../course/types'
import { terms as launch } from './lessons/launch/terms'
import { terms as sizing } from './lessons/sizing/terms'
import { terms as storage } from './lessons/storage/terms'
import { terms as access } from './lessons/access/terms'
import { terms as pricing } from './lessons/pricing/terms'
import { terms as scale } from './lessons/scale/terms'

export const ec2: CourseModule = {
  id: 'ec2',
  number: 2,
  title: 'Servers on demand',
  tagline: 'Rent, protect and scale servers',
  description:
    'Launch virtual servers in minutes and pay only for what you use. Follow one food delivery app as it grows from a single server to a setup that survives failures.',
  outcomes: [
    'Launch a server and put a web page online',
    'Choose a server size that fits the job',
    'Keep data safe with disks and snapshots',
    'Control who can reach a server',
    'Cut costs, then scale across zones',
  ],
  covers: ['ec2', 'ebs', 'elb'],
  lessons: [
    {
      id: 'launch',
      title: 'Rent and launch a server',
      summary: 'Launch your first server and get the menu page online.',
      minutes: 10,
      load: () => import('./lessons/launch/Lesson'),
    },
    {
      id: 'sizing',
      title: 'Pick the right size',
      summary: 'Match each job to a server size that fits without waste.',
      minutes: 10,
      load: () => import('./lessons/sizing/Lesson'),
    },
    {
      id: 'storage',
      title: 'Disks that remember',
      summary: 'Keep your orders safe with the right disk and snapshots.',
      minutes: 10,
      load: () => import('./lessons/storage/Lesson'),
    },
    {
      id: 'access',
      title: 'Who can reach it',
      summary: 'Open only the doors you need and give the server a role.',
      minutes: 10,
      load: () => import('./lessons/access/Lesson'),
    },
    {
      id: 'pricing',
      title: 'Pay less',
      summary: 'Choose the cheapest way to pay for each part of the app.',
      minutes: 10,
      load: () => import('./lessons/pricing/Lesson'),
    },
    {
      id: 'scale',
      title: 'Survive and scale',
      summary: 'Spread across zones so a failure or a rush does not hurt.',
      minutes: 10,
      load: () => import('./lessons/scale/Lesson'),
    },
  ],
  terms: {
    ...launch,
    ...sizing,
    ...storage,
    ...access,
    ...pricing,
    ...scale,
  },
}
