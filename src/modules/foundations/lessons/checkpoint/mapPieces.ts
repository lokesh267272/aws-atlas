import { Building, Cloud, KeyRound, MapPin, Radio } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { BoundaryKind } from '../../../../components/diagram'

export type PieceId = 'cloud' | 'iam' | 'edge' | 'region' | 'az' | 'datacenter'

export interface MapPiece {
  id: PieceId
  /** Name on the piece and on the box once it is placed */
  label: string
  /** Box label once placed, when the box is a place that holds the piece (IAM sits in "Global services") */
  placedLabel?: string
  /** How the box is drawn once the right piece is in it */
  kind: BoundaryKind
  icon: LucideIcon
  /** Letter of the empty box this piece belongs in */
  box: string
  /** Clue printed inside the empty box */
  clue: string
  /** Short description shown in the box once the right piece is in it */
  caption: string
  /** Shown when the learner drops this piece in the wrong box */
  hint: string
  /** Shown when it lands in the right box, and in the final summary */
  fits: string
}

/** Pieces in the order their boxes appear in the diagram (outside in). */
export const pieces: Record<PieceId, MapPiece> = {
  cloud: {
    id: 'cloud',
    label: 'AWS Cloud',
    kind: 'cloud',
    icon: Cloud,
    box: 'A',
    clue: 'The outermost box. Everything AWS runs for you sits inside it.',
    caption: 'Everything AWS runs for you.',
    hint: 'The AWS Cloud is the biggest box. Regions, edge locations and global services all sit inside it.',
    fits: 'The AWS Cloud holds everything: every Region, every edge location and every global service.',
  },
  iam: {
    id: 'iam',
    label: 'IAM',
    placedLabel: 'Global services',
    kind: 'global',
    icon: KeyRound,
    box: 'B',
    clue: 'One setup controls who can sign in and what they may do.',
    caption: 'One set of users, roles and policies for every Region.',
    hint: 'IAM is not inside a Region. It is a global service: one set of users, roles and policies for your whole account.',
    fits: 'IAM is global. The users, roles and policies you create apply in every Region of your account.',
  },
  edge: {
    id: 'edge',
    label: 'Edge location',
    kind: 'edge',
    icon: Radio,
    box: 'C',
    clue: 'Small sites in many cities, close to your users.',
    caption: 'Small sites in many cities, close to your users.',
    hint: 'Edge locations are not inside a Region. They are small sites in many cities, close to the people using your app.',
    fits: 'Edge locations sit outside Regions, near users. CloudFront and Route 53 use them to answer quickly.',
  },
  region: {
    id: 'region',
    label: 'Region',
    kind: 'region',
    icon: MapPin,
    box: 'D',
    clue: 'A geographic area, such as Frankfurt, with a code such as eu-central-1.',
    caption: 'A geographic area, such as Frankfurt (eu-central-1).',
    hint: 'A Region is a geographic area. It sits inside the AWS Cloud and contains Availability Zones.',
    fits: 'A Region is a geographic area inside the AWS Cloud. You choose one for most things you create, such as a virtual server. Global things, such as IAM users and roles, have no Region.',
  },
  az: {
    id: 'az',
    label: 'Availability Zone',
    kind: 'az',
    icon: Building,
    box: 'E',
    clue: 'Has its own power and network, separate from its neighbours.',
    caption: 'Its own power and network. Each Region has at least three.',
    hint: 'An Availability Zone lives inside a Region and holds one or more data centers.',
    fits: 'Availability Zones sit inside a Region. Running copies in two or more Availability Zones lets your app survive one failing.',
  },
  datacenter: {
    id: 'datacenter',
    label: 'Data center',
    kind: 'datacenter',
    icon: Building,
    box: 'F',
    clue: 'A single building full of servers.',
    caption: 'One building full of servers.',
    hint: 'A data center is one building. It is the smallest box: it sits inside an Availability Zone.',
    fits: 'A data center is one building full of servers. One or more of them make up each Availability Zone.',
  },
}

export const pieceIds = Object.keys(pieces) as PieceId[]

/** The order pieces sit in the tray: mixed up, so the tray does not give the answer away. */
export const trayOrder: PieceId[] = ['datacenter', 'iam', 'region', 'edge', 'cloud', 'az']
