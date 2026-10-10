/**
 * A sample of cities with Amazon CloudFront points of presence (edge locations).
 * This is NOT the full list: CloudFront has 750+ points of presence in 100+
 * cities (aws.amazon.com/cloudfront/features, checked October 2026).
 * Coordinates are the approximate city centre.
 */
export interface EdgeCity {
  city: string
  country: string
  lat: number
  lon: number
}

export const edgeCities: EdgeCity[] = [
  // North America
  { city: 'Seattle', country: 'USA', lat: 47.6, lon: -122.3 },
  { city: 'San Francisco', country: 'USA', lat: 37.8, lon: -122.4 },
  { city: 'Los Angeles', country: 'USA', lat: 34.05, lon: -118.2 },
  { city: 'Denver', country: 'USA', lat: 39.7, lon: -105.0 },
  { city: 'Dallas', country: 'USA', lat: 32.8, lon: -96.8 },
  { city: 'Chicago', country: 'USA', lat: 41.9, lon: -87.6 },
  { city: 'Atlanta', country: 'USA', lat: 33.75, lon: -84.4 },
  { city: 'Miami', country: 'USA', lat: 25.8, lon: -80.2 },
  { city: 'New York', country: 'USA', lat: 40.7, lon: -74.0 },
  { city: 'Toronto', country: 'Canada', lat: 43.65, lon: -79.4 },
  { city: 'Vancouver', country: 'Canada', lat: 49.3, lon: -123.1 },
  { city: 'Mexico City', country: 'Mexico', lat: 19.4, lon: -99.1 },

  // South America
  { city: 'Bogotá', country: 'Colombia', lat: 4.7, lon: -74.1 },
  { city: 'Lima', country: 'Peru', lat: -12.05, lon: -77.0 },
  { city: 'Santiago', country: 'Chile', lat: -33.45, lon: -70.7 },
  { city: 'Buenos Aires', country: 'Argentina', lat: -34.6, lon: -58.4 },
  { city: 'Rio de Janeiro', country: 'Brazil', lat: -22.9, lon: -43.2 },
  { city: 'Fortaleza', country: 'Brazil', lat: -3.7, lon: -38.5 },

  // Europe
  { city: 'London', country: 'United Kingdom', lat: 51.5, lon: -0.1 },
  { city: 'Manchester', country: 'United Kingdom', lat: 53.5, lon: -2.2 },
  { city: 'Paris', country: 'France', lat: 48.9, lon: 2.35 },
  { city: 'Marseille', country: 'France', lat: 43.3, lon: 5.4 },
  { city: 'Madrid', country: 'Spain', lat: 40.4, lon: -3.7 },
  { city: 'Lisbon', country: 'Portugal', lat: 38.7, lon: -9.1 },
  { city: 'Amsterdam', country: 'Netherlands', lat: 52.4, lon: 4.9 },
  { city: 'Berlin', country: 'Germany', lat: 52.5, lon: 13.4 },
  { city: 'Warsaw', country: 'Poland', lat: 52.2, lon: 21.0 },
  { city: 'Oslo', country: 'Norway', lat: 59.9, lon: 10.75 },
  { city: 'Helsinki', country: 'Finland', lat: 60.2, lon: 24.9 },
  { city: 'Vienna', country: 'Austria', lat: 48.2, lon: 16.4 },
  { city: 'Rome', country: 'Italy', lat: 41.9, lon: 12.5 },
  { city: 'Athens', country: 'Greece', lat: 38.0, lon: 23.7 },
  { city: 'Bucharest', country: 'Romania', lat: 44.4, lon: 26.1 },

  // Middle East and Africa
  { city: 'Istanbul', country: 'Turkey', lat: 41.0, lon: 29.0 },
  { city: 'Dubai', country: 'United Arab Emirates', lat: 25.2, lon: 55.3 },
  { city: 'Jeddah', country: 'Saudi Arabia', lat: 21.5, lon: 39.2 },
  { city: 'Cairo', country: 'Egypt', lat: 30.0, lon: 31.2 },
  { city: 'Lagos', country: 'Nigeria', lat: 6.5, lon: 3.4 },
  { city: 'Nairobi', country: 'Kenya', lat: -1.3, lon: 36.8 },
  { city: 'Johannesburg', country: 'South Africa', lat: -26.2, lon: 28.05 },

  // Asia Pacific
  { city: 'New Delhi', country: 'India', lat: 28.6, lon: 77.2 },
  { city: 'Chennai', country: 'India', lat: 13.1, lon: 80.3 },
  { city: 'Bangkok', country: 'Thailand', lat: 13.75, lon: 100.5 },
  { city: 'Manila', country: 'Philippines', lat: 14.6, lon: 121.0 },
  { city: 'Hanoi', country: 'Vietnam', lat: 21.0, lon: 105.85 },
  { city: 'Kuala Lumpur', country: 'Malaysia', lat: 3.1, lon: 101.7 },
  { city: 'Perth', country: 'Australia', lat: -31.95, lon: 115.9 },
  { city: 'Brisbane', country: 'Australia', lat: -27.5, lon: 153.0 },
  { city: 'Auckland', country: 'New Zealand', lat: -36.85, lon: 174.8 },
]
