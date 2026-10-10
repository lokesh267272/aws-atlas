import { distanceKm, estimateRoundTripMs, regionByCode, type LatLon, type RegionCode } from './regions'

/**
 * Five small businesses for the "pick the Region" simulation. Each one stresses
 * a different factor. The rules inside a story (such as "data must stay in the
 * EU") are decisions made by that business, not claims about any law.
 */

export type ScenarioId = 'clinic' | 'game' | 'store' | 'startup' | 'news'

export interface Place extends LatLon {
  label: string
}

export interface Scenario {
  id: ScenarioId
  /** Short button label */
  short: string
  title: string
  story: string
  /** Where most users are */
  users: Place
  /** Extra readers spread around the world (news site only) */
  otherUsers?: Place[]
  /** A rule about where data may live, if the business has one */
  rule?: { text: string; allowed: (code: RegionCode) => boolean; passText: string; failText: string }
  /** Round-trip thresholds in ms: at or below good = fast, at or below ok = acceptable */
  latency: { good: number; ok: number }
  /** Needs brand-new services and features */
  needsNewest: boolean
  /** Money is tight, so price weighs more */
  tightBudget: boolean
  best: RegionCode[]
  /** Explanations for specific choices; anything else uses `otherNote` */
  notes: Partial<Record<RegionCode, string>>
  otherNote: string
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'clinic',
    short: 'Clinics in Germany',
    title: 'A group of health clinics in Germany',
    story:
      'The clinics are moving their patient-records app to AWS. Their data protection officer has decided that patient data must stay inside the European Union. Doctors and nurses in Berlin use the app all day.',
    users: { label: 'Staff in Berlin', lat: 52.52, lon: 13.405 },
    rule: {
      text: 'Patient data must stay inside the European Union.',
      allowed: (code) => regionByCode(code).inEU,
      passText: 'Inside the European Union, so the clinics’ rule is met.',
      failText: 'Outside the European Union. The clinics’ rule does not allow it.',
    },
    latency: { good: 40, ok: 110 },
    needsNewest: false,
    tightBudget: false,
    best: ['eu-central-1'],
    notes: {
      'eu-central-1':
        'Frankfurt is inside the EU and close to Berlin. It is the only Region on this shortlist that meets the clinics’ rule, and it is fast too.',
      'eu-west-2':
        'A tempting trap. London is close and in Europe, but the United Kingdom is not in the European Union. The rule does not allow it, however good the other checks look.',
    },
    otherNote:
      'This Region is outside the European Union, so the clinics’ rule does not allow it. When a rule like this applies, it beats every other factor.',
  },
  {
    id: 'game',
    short: 'Game in Japan',
    title: 'A fast multiplayer game in Japan',
    story:
      'A small studio runs a real-time mobile game. Almost all players are in Japan. Every move travels to the game server and back, so any delay makes the game feel laggy.',
    users: { label: 'Players in Japan', lat: 36.2, lon: 138.25 },
    latency: { good: 30, ok: 60 },
    needsNewest: false,
    tightBudget: false,
    best: ['ap-northeast-1'],
    notes: {
      'ap-northeast-1':
        'Tokyo is in Japan, so every move makes a short trip. For a real-time game, that matters more than anything else here.',
      'ap-southeast-1':
        'Singapore is the nearest other Region on this list, but it is thousands of kilometres from Japan. Players would feel the extra delay on every move.',
    },
    otherNote: 'Too far from Japan. Every move would make a long trip, and a fast game would feel laggy.',
  },
  {
    id: 'store',
    short: 'Shop in Brazil',
    title: 'An online shoe shop in Brazil',
    story:
      'A shop in Rio de Janeiro sells shoes online to customers across Brazil. The owners have no rule about where their data must be stored, and they keep a close eye on their monthly bill.',
    users: { label: 'Customers in Brazil', lat: -22.91, lon: -43.17 },
    latency: { good: 40, ok: 140 },
    needsNewest: false,
    tightBudget: false,
    best: ['sa-east-1'],
    notes: {
      'sa-east-1':
        'São Paulo is in Brazil, close to almost every customer, so pages load fast. It is in the highest price group on this list, clearly more than the big US Regions: the shop pays extra for speed.',
      'us-east-1':
        'A real trade-off. N. Virginia costs less, but it is thousands of kilometres from Brazil, so every page loads more slowly. The shop would still work, but slow pages can cost sales.',
      'us-west-2':
        'As cheap as N. Virginia, but even farther from Brazil, so pages would be slower still.',
    },
    otherNote: 'Far from Brazil, so every page takes longer, and it does not save money compared with the big US Regions.',
  },
  {
    id: 'startup',
    short: 'US startup',
    title: 'A two-person startup in the United States',
    story:
      'The startup is building its app on brand-new AWS AI services. Its users are spread across the United States, and money is tight.',
    users: { label: 'Users across the US', lat: 39.8, lon: -98.6 },
    latency: { good: 50, ok: 100 },
    needsNewest: true,
    tightBudget: true,
    best: ['us-east-1', 'us-west-2'],
    notes: {
      'us-east-1':
        'A large, lower-priced US Region that usually gets new services early. A natural fit.',
      'us-west-2':
        'Also large, lower-priced and usually early to get new services. Just as good as N. Virginia for users across the country.',
    },
    otherNote:
      'Far from American users, more expensive than the big US Regions, and new services may arrive here later.',
  },
  {
    id: 'news',
    short: 'Global news site',
    title: 'A news site with readers worldwide',
    story:
      'A news site based in London publishes articles and videos. Most readers are in the UK, but people read it on every continent. The team wonders if it needs servers everywhere.',
    users: { label: 'Most readers (UK)', lat: 52.48, lon: -1.9 },
    otherUsers: [
      { label: 'Readers in New York', lat: 40.71, lon: -74.0 },
      { label: 'Readers in Mumbai', lat: 19.08, lon: 72.88 },
      { label: 'Readers in Sydney', lat: -33.87, lon: 151.21 },
      { label: 'Readers in Lagos', lat: 6.52, lon: 3.38 },
      { label: 'Readers in Mexico City', lat: 19.43, lon: -99.13 },
    ],
    latency: { good: 40, ok: 120 },
    needsNewest: false,
    tightBudget: false,
    best: ['eu-west-2'],
    notes: {
      'eu-west-2':
        'London is right next to most readers. For everyone else, put Amazon CloudFront in front: it keeps copies of articles and videos in edge locations around the world, so you do not need a Region on every continent.',
      'eu-central-1':
        'Close to the UK and fast for most readers, so it works well. London is a little closer. Either way, add CloudFront for readers far away.',
    },
    otherNote:
      'Far from most readers, so your biggest audience gets slower pages. Pick the Region near most readers and let a CDN such as CloudFront serve everyone else.',
  },
]

/* ---------------------------------------------------------------- Grading */

export type Mark = 'pass' | 'tradeoff' | 'fail'
export type FactorId = 'compliance' | 'latency' | 'services' | 'price'

export interface FactorResult {
  id: FactorId
  label: string
  mark: Mark
  text: string
}

export type Verdict = 'strong' | 'strong-tradeoff' | 'good' | 'workable' | 'poor' | 'not-allowed'

export interface Grade {
  km: number
  ms: number
  factors: FactorResult[]
  verdict: Verdict
  note: string
}

export const verdictText: Record<Verdict, string> = {
  strong: 'Strong choice',
  'strong-tradeoff': 'Strong choice, with a trade-off',
  good: 'Good choice',
  workable: 'Workable, with trade-offs',
  poor: 'Poor fit',
  'not-allowed': 'Not allowed for this business',
}

export function gradeChoice(s: Scenario, code: RegionCode): Grade {
  const region = regionByCode(code)
  const km = distanceKm(s.users, region)
  const ms = estimateRoundTripMs(km)

  const compliance: FactorResult = s.rule
    ? s.rule.allowed(code)
      ? { id: 'compliance', label: 'Compliance', mark: 'pass', text: s.rule.passText }
      : { id: 'compliance', label: 'Compliance', mark: 'fail', text: s.rule.failText }
    : {
        id: 'compliance',
        label: 'Compliance',
        mark: 'pass',
        text: 'This business has no rule about where its data must live, so any Region is allowed.',
      }

  const latency: FactorResult =
    ms <= s.latency.good
      ? { id: 'latency', label: 'Latency', mark: 'pass', text: `About ${ms} ms there and back. Feels fast for these users.` }
      : ms <= s.latency.ok
        ? {
            id: 'latency',
            label: 'Latency',
            mark: 'tradeoff',
            text: `About ${ms} ms there and back. It works, but users may notice the delay.`,
          }
        : { id: 'latency', label: 'Latency', mark: 'fail', text: `About ${ms} ms there and back. Too slow for this app.` }

  const services: FactorResult = s.needsNewest
    ? region.large
      ? {
          id: 'services',
          label: 'Services',
          mark: 'pass',
          text: 'One of the largest Regions. These usually get new services and features first.',
        }
      : {
          id: 'services',
          label: 'Services',
          mark: 'tradeoff',
          text: 'New services and features may reach this Region later. You would need to check AWS’s list of services by Region.',
        }
    : {
        id: 'services',
        label: 'Services',
        mark: 'pass',
        text: 'This app needs everyday services (servers, storage, a database). Every Region on this list has them.',
      }

  const price: FactorResult =
    region.priceTier === 'lower'
      ? { id: 'price', label: 'Price', mark: 'pass', text: 'In the lowest price group on this list.' }
      : region.priceTier === 'middle'
        ? s.tightBudget
          ? { id: 'price', label: 'Price', mark: 'tradeoff', text: 'Mid-priced: noticeably more than the big US Regions.' }
          : { id: 'price', label: 'Price', mark: 'pass', text: 'Mid-priced. Fine for this business.' }
        : s.tightBudget
          ? { id: 'price', label: 'Price', mark: 'fail', text: 'The highest price group on this list. Hard on a tight budget.' }
          : { id: 'price', label: 'Price', mark: 'tradeoff', text: 'The highest price group on this list.' }

  const factors = [compliance, latency, services, price]
  const anyFail = factors.some((f) => f.mark === 'fail')
  const anyTradeoff = factors.some((f) => f.mark === 'tradeoff')

  let verdict: Verdict
  if (compliance.mark === 'fail') verdict = 'not-allowed'
  else if (s.best.includes(code)) verdict = anyTradeoff ? 'strong-tradeoff' : 'strong'
  else if (anyFail) verdict = 'poor'
  else if (anyTradeoff) verdict = 'workable'
  else verdict = 'good'

  return { km, ms, factors, verdict, note: s.notes[code] ?? s.otherNote }
}
