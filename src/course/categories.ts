import type { Category, Scope } from './types'

/** Category colours follow the AWS architecture-icon palette. Use the CSS variable, not the hex. */
export const categories: Record<Category, { label: string; color: string }> = {
  foundation: { label: 'Foundations', color: 'var(--color-foundation)' },
  security: { label: 'Security, identity & compliance', color: 'var(--color-security)' },
  compute: { label: 'Compute', color: 'var(--color-compute)' },
  storage: { label: 'Storage', color: 'var(--color-storage)' },
  networking: { label: 'Networking & content delivery', color: 'var(--color-networking)' },
  database: { label: 'Databases', color: 'var(--color-database)' },
  integration: { label: 'Application integration', color: 'var(--color-integration)' },
  management: { label: 'Management & monitoring', color: 'var(--color-management)' },
  analytics: { label: 'Analytics', color: 'var(--color-analytics)' },
}

export const scopes: Record<Scope, { label: string; explain: string }> = {
  global: {
    label: 'Global',
    explain: 'One service for your whole account. It is not tied to any single Region.',
  },
  edge: {
    label: 'Edge',
    explain: 'Runs in edge locations: hundreds of small AWS sites in cities around the world, close to your users.',
  },
  regional: {
    label: 'Regional',
    explain:
      'You choose a Region when you use it. AWS spreads it across that Region’s Availability Zones for you.',
  },
  vpc: {
    label: 'Inside your VPC',
    explain:
      'Lives inside your own private network (a VPC) and can stretch across several Availability Zones.',
  },
  zonal: {
    label: 'Zonal',
    explain:
      'Lives in exactly one Availability Zone. To survive a zone failure you run copies in more than one.',
  },
}
