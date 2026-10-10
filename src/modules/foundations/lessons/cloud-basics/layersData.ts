import { Box, Building, Cable, CodeXml, Database, HardDrive, KeyRound, Layers, MonitorCog, Server } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type LayerId =
  | 'access'
  | 'data'
  | 'app'
  | 'runtime'
  | 'os'
  | 'virtualization'
  | 'storage'
  | 'servers'
  | 'network'
  | 'building'

export interface Layer {
  id: LayerId
  name: string
  icon: LucideIcon
}

/** The stack of things it takes to run an app, listed top to bottom. */
export const LAYERS: Layer[] = [
  { id: 'access', name: 'User access and settings', icon: KeyRound },
  { id: 'data', name: 'Your data', icon: Database },
  { id: 'app', name: 'Your app’s code', icon: CodeXml },
  { id: 'runtime', name: 'Runtime', icon: Box },
  { id: 'os', name: 'Operating system', icon: MonitorCog },
  { id: 'virtualization', name: 'Virtualization', icon: Layers },
  { id: 'storage', name: 'Storage hardware', icon: HardDrive },
  { id: 'servers', name: 'Physical servers', icon: Server },
  { id: 'network', name: 'Physical network', icon: Cable },
  { id: 'building', name: 'Data center building and power', icon: Building },
]

export type ModelId = 'onprem' | 'iaas' | 'paas' | 'saas'

export interface Model {
  label: string
  /** Who runs the provider layers, in a few words */
  provider: string
  /** How many layers, counted from the bottom, the provider manages */
  providerLayers: number
  example: string
  summary: string
  bakery: string
  /** Extra detail on particular layers for this model */
  notes: Partial<Record<LayerId, string>>
}

export const MODELS: Record<ModelId, Model> = {
  onprem: {
    label: 'On-premises',
    provider: 'nobody else',
    providerLayers: 0,
    example: 'Servers you own, in a room you control',
    summary: 'You own every layer. Nobody else fixes anything for you.',
    bakery:
      'You buy servers, put them in your back room, install everything on them, and get up at night when a disk fails.',
    notes: {
      building: 'Rent, electricity, cooling, locks',
      servers: 'Buying, repairing, replacing',
    },
  },
  iaas: {
    label: 'IaaS',
    provider: 'AWS',
    providerLayers: 5,
    example: 'Amazon EC2 (virtual servers)',
    summary:
      'AWS runs the buildings, hardware and virtualization. You rent virtual servers and manage everything from the operating system up.',
    bakery:
      'You rent a virtual server on Amazon EC2, keep its operating system patched, and install your shop’s runtime and code yourself.',
    notes: {
      os: 'AWS gives you a ready-made copy of the operating system to start from. Keeping it patched is your job.',
      network: 'You still set the network rules for your virtual servers.',
    },
  },
  paas: {
    label: 'PaaS',
    provider: 'AWS',
    providerLayers: 7,
    example: 'AWS Elastic Beanstalk (upload your code)',
    summary:
      'You hand over your code. AWS creates and runs the servers, operating system and runtime underneath it.',
    bakery: 'You upload your shop’s code to Elastic Beanstalk. It sets up the servers and keeps them running for you.',
    notes: {
      os: 'AWS releases the updates. With managed updates on, it applies patch and minor ones; moving to a new major version is your job.',
      runtime: 'You pick the language and its version, for example a Python 3 or Node.js version.',
    },
  },
  saas: {
    label: 'SaaS',
    provider: 'the email provider',
    providerLayers: 8,
    example: 'Web email you open in a browser',
    summary:
      'You use finished software. The provider runs all of it, but your data and who can get into your account are still yours to look after.',
    bakery: 'You use web email for customer orders. You never see a server, but you choose your password and turn on MFA (a second sign-in check).',
    notes: {
      app: 'You cannot change the code, only use it.',
      data: 'What you store, share and delete',
      access: 'Your password, extra sign-in checks, who you share with',
    },
  },
}

export const MODEL_ORDER: ModelId[] = ['onprem', 'iaas', 'paas', 'saas']

/** True when the provider manages this layer under the given model. */
export function providerManages(model: Model, layerIndex: number) {
  return layerIndex >= LAYERS.length - model.providerLayers
}
