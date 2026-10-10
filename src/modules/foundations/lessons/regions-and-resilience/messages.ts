import type { Arch, SimEvent } from './resilienceSim'

/** Names used in the "break the data center" simulation. */
export const PRIMARY = { region: 'us-east-1', place: 'N. Virginia', azA: 'us-east-1a', azB: 'us-east-1b' }
export const STANDBY = { region: 'us-west-2', place: 'Oregon', azA: 'us-west-2a', azB: 'us-west-2b' }

export const archInfo: Record<Arch, { label: string; long: string; cost: string; costHint: string }> = {
  single: {
    label: 'One server',
    long: 'One server in one Availability Zone. Users connect to it directly.',
    cost: '1×',
    costHint: '1 server',
  },
  'multi-az': {
    label: 'Two AZs',
    long: 'Two servers in two Availability Zones, with a load balancer sharing requests between them.',
    cost: 'About 2×',
    costHint: '2 servers and a load balancer',
  },
  'multi-region': {
    label: 'Two Regions',
    long: 'The two-AZ setup copied into a second Region. Route 53 sends users to the standby Region if the primary one fails its health checks.',
    cost: 'About 4×',
    costHint: '4 servers, 2 load balancers and Route 53 health checks',
  },
}

/** One plain sentence or two explaining what just happened, for the live region. */
export function describeEvent(ev: SimEvent, arch: Arch): string {
  switch (ev.kind) {
    case 'incident':
      if (ev.noop) {
        switch (ev.incident) {
          case 'crash':
            if (ev.alreadyDown === 'region')
              return `Server A is already down: the whole ${PRIMARY.region} Region has a problem. Press “Repair everything” to bring it back.`
            if (ev.alreadyDown === 'az')
              return `Server A is already down: AZ a (${PRIMARY.azA}) has no power. Press “Repair everything” to bring it back.`
            return 'Server A is already down. Press “Repair everything” to bring it back.'
          case 'az':
            if (ev.alreadyDown === 'region')
              return `The whole ${PRIMARY.region} Region already has a problem, and AZ a (${PRIMARY.azA}) is part of it. Press “Repair everything” to restore it.`
            return `AZ a (${PRIMARY.azA}) already has no power. Press “Repair everything” to restore it.`
          case 'region':
            return `${PRIMARY.region} already has a problem. Press “Repair everything” to restore it.`
          case 'repair':
            return 'Nothing is broken right now. Try one of the incident buttons first.'
        }
      }
      switch (ev.incident) {
        case 'crash':
          return arch === 'single'
            ? 'Server A crashed. It was your only server, so every request now fails until someone repairs it. That server was a single point of failure.'
            : 'Server A crashed. For a short time (a few seconds here, up to about a minute with AWS’s default settings) the load balancer keeps sending some requests to it, and those fail. Once Server A fails its health checks, every request goes to Server B.'
        case 'az':
          if (ev.alreadyDown === 'crash')
            return arch === 'single'
              ? `A power cut hit AZ a (${PRIMARY.azA}). Your only server had already crashed, so your app stays offline.`
              : `A power cut hit AZ a (${PRIMARY.azA}), where Server A had already crashed, so nothing new breaks. Server B is in AZ b (${PRIMARY.azB}), which has its own power, so it keeps running.`
          return arch === 'single'
            ? `A power cut hit AZ a (${PRIMARY.azA}). Your only server was in that Availability Zone, so your whole app is offline.`
            : `A power cut hit AZ a (${PRIMARY.azA}) and took Server A with it. Server B is in AZ b (${PRIMARY.azB}), which has its own power, so it keeps running. After a short gap the load balancer sends everyone to Server B.`
        case 'region':
          if (arch === 'single') return `The whole ${PRIMARY.region} Region has a problem. Your only server is in it, so your app is offline.`
          if (arch === 'multi-az')
            return `The whole ${PRIMARY.region} Region has a problem. Both of your Availability Zones are inside it, so two AZs cannot help here, and every request fails. This is rare, but it is exactly what a second Region protects against.`
          return `The primary Region (${PRIMARY.region}) has a problem, so requests to it fail. Route 53 first needs several failed health checks, and DNS servers and devices that saved the old DNS answer keep using it until its TTL runs out. Then users go to the standby Region.`
        case 'repair':
          if (arch === 'single') return 'Everything is repaired. Server A answers again straight away, because users connect to it directly.'
          if (arch === 'multi-az')
            return 'Everything is repaired. The load balancer waits until a repaired server passes its health checks before sending it requests again.'
          return 'Everything is repaired. Health checks must pass again before traffic moves back, so the primary Region gets its users back after a short wait.'
      }
      return ''
    case 'lb-removed': {
      const other = ev.target === 'a' ? 'B' : 'A'
      return `The load balancer marked Server ${ev.target.toUpperCase()} unhealthy after it failed its health checks. Every request now goes to Server ${other}, and users are fine again.`
    }
    case 'lb-restored':
      return `Server ${ev.target.toUpperCase()} passed its health checks again, so the load balancer shares requests between both servers once more.`
    case 'dns-failover':
      return `Failover complete. Route 53 now answers with the standby Region (${STANDBY.region}), so new requests go there and users are back online.`
    case 'dns-failback':
      return `The primary Region is healthy again, so Route 53 sends users back to ${PRIMARY.region}.`
  }
}
