import type { Glossary } from '../../../../course/types'

/**
 * Glossary terms this lesson adds (only ones missing from the shared glossary).
 * Reused, not redefined: load-balancer, auto-scaling, health-check, multi-az, failover, rds, availability-zone,
 * savings-plan, on-demand-instance, spot-instance, launch-time terms such as ami and security-group.
 */
export const terms: Glossary = {
  'application-load-balancer': {
    term: 'Application Load Balancer (ALB)',
    short:
      'An AWS load balancer for web traffic. It spreads requests across healthy servers in several Availability Zones and stops sending to any server that fails its health checks.',
  },
  'auto-scaling-group': {
    term: 'Auto Scaling group',
    short:
      'A group of EC2 instances that Amazon EC2 Auto Scaling keeps between a minimum and a maximum size. It replaces unhealthy instances and spreads them across the Availability Zones you choose.',
  },
  'desired-capacity': {
    term: 'Desired capacity',
    short:
      'How many instances an Auto Scaling group aims to run right now. Scaling policies move it up and down, always between the minimum and the maximum.',
  },
  'target-tracking': {
    term: 'Target tracking policy',
    short:
      'An Auto Scaling rule that keeps a measurement near a target, such as average CPU near 50%. It adds instances when the measurement is above the target and removes them when it is below.',
  },
  'cpu-utilization': {
    term: 'CPU utilization',
    short: 'How busy a server’s processors are, as a percentage of all they can do.',
  },
  'launch-template': {
    term: 'Launch template',
    short:
      'A saved recipe for launching instances: the AMI, instance type, security group and other settings. An Auto Scaling group builds every new instance from it.',
  },
  'rds-standby': {
    term: 'Standby copy (RDS Multi-AZ)',
    short:
      'A copy of the database that Amazon RDS keeps up to date in a second Availability Zone. If the primary fails, RDS switches to the standby automatically.',
  },
}
