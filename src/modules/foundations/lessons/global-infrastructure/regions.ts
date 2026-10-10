/**
 * Every Region a standard AWS account can use (the "aws" partition), as listed
 * on https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-regions.html
 * (checked October 2026: 34 Regions).
 *
 * Not included: AWS GovCloud (US), the China Regions (Beijing, Ningxia) and the
 * AWS European Sovereign Cloud. They live in separate partitions that need
 * separate accounts.
 *
 * Latitude and longitude are the approximate metro area only. AWS does not
 * publish data center addresses, and a Region's AZs are spread over many
 * kilometres.
 */

export type Geography = 'North America' | 'South America' | 'Europe' | 'Africa' | 'Middle East' | 'Asia Pacific'

export interface AwsRegion {
  /** Region code, e.g. us-east-1 */
  code: string
  /** Official Region name, e.g. US East (N. Virginia) */
  name: string
  /** City or area in plain words */
  area: string
  /** Approximate latitude of the metro area (degrees, north positive) */
  lat: number
  /** Approximate longitude of the metro area (degrees, east positive) */
  lon: number
  /** Number of Availability Zones, as listed by AWS */
  azs: number
  /** Extra note about the AZ count, if AWS gives one */
  azNote?: string
  geography: Geography
  /** True for Regions launched after 20 March 2019, which must be turned on before use */
  optIn: boolean
}

export const geographies: Geography[] = [
  'North America',
  'South America',
  'Europe',
  'Africa',
  'Middle East',
  'Asia Pacific',
]

export const regions: AwsRegion[] = [
  // North America
  { code: 'us-east-1', name: 'US East (N. Virginia)', area: 'Northern Virginia, USA', lat: 39.0, lon: -77.5, azs: 6, geography: 'North America', optIn: false },
  { code: 'us-east-2', name: 'US East (Ohio)', area: 'Ohio, USA', lat: 40.0, lon: -83.0, azs: 3, geography: 'North America', optIn: false },
  {
    code: 'us-west-1',
    name: 'US West (N. California)',
    area: 'Northern California, USA',
    lat: 37.4,
    lon: -121.9,
    azs: 3,
    azNote: 'Newer accounts can use two of them.',
    geography: 'North America',
    optIn: false,
  },
  { code: 'us-west-2', name: 'US West (Oregon)', area: 'Oregon, USA', lat: 45.6, lon: -119.7, azs: 4, geography: 'North America', optIn: false },
  { code: 'ca-central-1', name: 'Canada (Central)', area: 'Montréal area, Canada', lat: 45.5, lon: -73.6, azs: 3, geography: 'North America', optIn: false },
  { code: 'ca-west-1', name: 'Canada West (Calgary)', area: 'Calgary, Canada', lat: 51.0, lon: -114.1, azs: 3, geography: 'North America', optIn: true },
  { code: 'mx-central-1', name: 'Mexico (Central)', area: 'Central Mexico', lat: 20.6, lon: -100.4, azs: 3, geography: 'North America', optIn: true },

  // South America
  { code: 'sa-east-1', name: 'South America (São Paulo)', area: 'São Paulo, Brazil', lat: -23.5, lon: -46.6, azs: 3, geography: 'South America', optIn: false },

  // Europe
  { code: 'eu-central-1', name: 'Europe (Frankfurt)', area: 'Frankfurt, Germany', lat: 50.1, lon: 8.7, azs: 3, geography: 'Europe', optIn: false },
  { code: 'eu-west-1', name: 'Europe (Ireland)', area: 'Dublin area, Ireland', lat: 53.3, lon: -6.3, azs: 3, geography: 'Europe', optIn: false },
  { code: 'eu-west-2', name: 'Europe (London)', area: 'London, United Kingdom', lat: 51.5, lon: -0.1, azs: 3, geography: 'Europe', optIn: false },
  { code: 'eu-south-1', name: 'Europe (Milan)', area: 'Milan, Italy', lat: 45.5, lon: 9.2, azs: 3, geography: 'Europe', optIn: true },
  { code: 'eu-west-3', name: 'Europe (Paris)', area: 'Paris, France', lat: 48.9, lon: 2.4, azs: 3, geography: 'Europe', optIn: false },
  { code: 'eu-south-2', name: 'Europe (Spain)', area: 'Spain', lat: 41.6, lon: -0.9, azs: 3, geography: 'Europe', optIn: true },
  { code: 'eu-north-1', name: 'Europe (Stockholm)', area: 'Stockholm, Sweden', lat: 59.3, lon: 18.1, azs: 3, geography: 'Europe', optIn: false },
  { code: 'eu-central-2', name: 'Europe (Zurich)', area: 'Zurich, Switzerland', lat: 47.4, lon: 8.5, azs: 3, geography: 'Europe', optIn: true },

  // Africa
  { code: 'af-south-1', name: 'Africa (Cape Town)', area: 'Cape Town, South Africa', lat: -33.9, lon: 18.4, azs: 3, geography: 'Africa', optIn: true },

  // Middle East
  { code: 'il-central-1', name: 'Israel (Tel Aviv)', area: 'Tel Aviv, Israel', lat: 32.1, lon: 34.8, azs: 3, geography: 'Middle East', optIn: true },
  { code: 'me-south-1', name: 'Middle East (Bahrain)', area: 'Bahrain', lat: 26.1, lon: 50.6, azs: 3, geography: 'Middle East', optIn: true },
  { code: 'me-central-1', name: 'Middle East (UAE)', area: 'United Arab Emirates', lat: 24.8, lon: 55.0, azs: 3, geography: 'Middle East', optIn: true },

  // Asia Pacific
  { code: 'ap-east-1', name: 'Asia Pacific (Hong Kong)', area: 'Hong Kong', lat: 22.3, lon: 114.2, azs: 3, geography: 'Asia Pacific', optIn: true },
  { code: 'ap-east-2', name: 'Asia Pacific (Taipei)', area: 'Taipei, Taiwan', lat: 25.0, lon: 121.6, azs: 3, geography: 'Asia Pacific', optIn: true },
  { code: 'ap-northeast-1', name: 'Asia Pacific (Tokyo)', area: 'Tokyo, Japan', lat: 35.7, lon: 139.7, azs: 4, geography: 'Asia Pacific', optIn: false },
  { code: 'ap-northeast-2', name: 'Asia Pacific (Seoul)', area: 'Seoul, South Korea', lat: 37.6, lon: 127.0, azs: 4, geography: 'Asia Pacific', optIn: false },
  { code: 'ap-northeast-3', name: 'Asia Pacific (Osaka)', area: 'Osaka, Japan', lat: 34.7, lon: 135.5, azs: 3, geography: 'Asia Pacific', optIn: false },
  { code: 'ap-south-1', name: 'Asia Pacific (Mumbai)', area: 'Mumbai, India', lat: 19.1, lon: 72.9, azs: 3, geography: 'Asia Pacific', optIn: false },
  { code: 'ap-south-2', name: 'Asia Pacific (Hyderabad)', area: 'Hyderabad, India', lat: 17.4, lon: 78.5, azs: 3, geography: 'Asia Pacific', optIn: true },
  { code: 'ap-southeast-1', name: 'Asia Pacific (Singapore)', area: 'Singapore', lat: 1.35, lon: 103.8, azs: 3, geography: 'Asia Pacific', optIn: false },
  { code: 'ap-southeast-2', name: 'Asia Pacific (Sydney)', area: 'Sydney, Australia', lat: -33.9, lon: 151.2, azs: 3, geography: 'Asia Pacific', optIn: false },
  { code: 'ap-southeast-3', name: 'Asia Pacific (Jakarta)', area: 'Jakarta, Indonesia', lat: -6.2, lon: 106.8, azs: 3, geography: 'Asia Pacific', optIn: true },
  { code: 'ap-southeast-4', name: 'Asia Pacific (Melbourne)', area: 'Melbourne, Australia', lat: -37.8, lon: 145.0, azs: 3, geography: 'Asia Pacific', optIn: true },
  { code: 'ap-southeast-5', name: 'Asia Pacific (Malaysia)', area: 'Malaysia', lat: 3.1, lon: 101.7, azs: 3, geography: 'Asia Pacific', optIn: true },
  { code: 'ap-southeast-6', name: 'Asia Pacific (New Zealand)', area: 'New Zealand', lat: -36.8, lon: 174.8, azs: 3, geography: 'Asia Pacific', optIn: true },
  { code: 'ap-southeast-7', name: 'Asia Pacific (Thailand)', area: 'Thailand', lat: 13.8, lon: 100.5, azs: 3, geography: 'Asia Pacific', optIn: true },
]

export const regionByCode: Record<string, AwsRegion> = Object.fromEntries(regions.map((r) => [r.code, r]))

/** Headline totals from aws.amazon.com/about-aws/global-infrastructure, checked October 2026. */
export const headline = {
  asOf: 'October 2026',
  regions: 39,
  azs: 124,
  announcedRegions: 2,
  announcedWhere: 'Saudi Arabia and Chile',
  cloudFrontPops: '750+',
  cloudFrontCities: '100+',
  cloudFrontCountries: '50+',
}

/* ------------------------------------------------------- Region code parts */

export const areaNames: Record<string, string> = {
  us: 'United States',
  ca: 'Canada',
  mx: 'Mexico',
  sa: 'South America',
  eu: 'Europe',
  af: 'Africa',
  il: 'Israel',
  me: 'Middle East',
  ap: 'Asia Pacific',
}

export const directionNames: Record<string, string> = {
  east: 'east',
  west: 'west',
  north: 'north',
  south: 'south',
  central: 'central',
  northeast: 'north-east',
  southeast: 'south-east',
  northwest: 'north-west',
  southwest: 'south-west',
}

export interface CodeParts {
  area: string
  direction: string
  number: string
}

const codePattern = /^([a-z]{2})-(northeast|northwest|southeast|southwest|north|south|east|west|central)-(\d{1,2})$/

/** Splits a Region code such as "ap-southeast-2" into its three parts, or returns null. */
export function splitCode(code: string): CodeParts | null {
  const m = codePattern.exec(code)
  if (!m) return null
  return { area: m[1], direction: m[2], number: m[3] }
}

/** Other Regions that share the same area and direction, e.g. us-east-2 for us-east-1. */
export function siblingsOf(code: string): AwsRegion[] {
  const parts = splitCode(code)
  if (!parts) return []
  return regions.filter((r) => r.code !== code && r.code.startsWith(`${parts.area}-${parts.direction}-`))
}

/** One plain sentence that explains a Region code. */
export function explainCode(code: string): string {
  const parts = splitCode(code)
  if (!parts) return ''
  const area = areaNames[parts.area] ?? parts.area
  const dir = directionNames[parts.direction] ?? parts.direction
  const sibs = siblingsOf(code)
  const numberPart =
    sibs.length > 0
      ? `${parts.number} tells it apart from ${sibs.map((s) => s.code).join(', ')}`
      : `${parts.number} is its number; so far it is the only Region with this area and direction`
  return `${parts.area} = ${area}, ${parts.direction} = the ${dir} part of that area (roughly), and ${numberPart}.`
}
