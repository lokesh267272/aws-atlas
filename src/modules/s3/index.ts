import type { CourseModule } from '../../course/types'
import { terms as shared } from './terms'
import { terms as buckets } from './lessons/buckets/terms'
import { terms as access } from './lessons/access/terms'
import { terms as classes } from './lessons/classes/terms'
import { terms as versioning } from './lessons/versioning/terms'
import { terms as lifecycle } from './lessons/lifecycle/terms'
import { terms as final } from './lessons/final/terms'

export const s3: CourseModule = {
  id: 's3',
  number: 3,
  title: 'Files that never get lost',
  tagline: 'Store, protect and tidy files',
  description:
    'Keep photos, receipts and backups safe in S3. Follow one food delivery app as its files grow, get shared, and age.',
  outcomes: [
    'Create a bucket and store files in it',
    'Decide who can see each file',
    'Pick a cheaper shelf for older files',
    'Undo mistakes with versioning',
    'Tidy up automatically on a schedule',
  ],
  covers: ['s3'],
  lessons: [
    {
      id: 'buckets',
      title: 'Buckets and objects',
      summary: 'Create a bucket and put your first files in it.',
      minutes: 10,
      load: () => import('./lessons/buckets/Lesson'),
    },
    {
      id: 'access',
      title: 'Who can see a file',
      summary: 'Keep files private and share them only as needed.',
      minutes: 10,
      load: () => import('./lessons/access/Lesson'),
    },
    {
      id: 'classes',
      title: 'Storage classes',
      summary: 'Put each kind of file on the shelf that costs least.',
      minutes: 10,
      load: () => import('./lessons/classes/Lesson'),
    },
    {
      id: 'versioning',
      title: 'Undo with versioning',
      summary: 'Keep old copies so a bad overwrite can be undone.',
      minutes: 10,
      load: () => import('./lessons/versioning/Lesson'),
    },
    {
      id: 'lifecycle',
      title: 'Tidy up on a schedule',
      summary: 'Move or delete files automatically as they age.',
      minutes: 10,
      load: () => import('./lessons/lifecycle/Lesson'),
    },
    {
      id: 'final',
      title: "Build Mealhop's file store",
      summary: 'Put every piece together for the whole app.',
      minutes: 10,
      load: () => import('./lessons/final/Lesson'),
    },
  ],
  terms: {
    ...shared,
    ...buckets,
    ...access,
    ...classes,
    ...versioning,
    ...lifecycle,
    ...final,
  },
}
