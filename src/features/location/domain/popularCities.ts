export interface PopularCity {
  id: string;
  name: string;
  country: string;
  continent: string;
  flag: string;
  lat: number;
  lon: number;
}

export const POPULAR_CITIES: PopularCity[] = [
  {
    id: "nyc",
    name: "New York",
    country: "United States",
    continent: "North America",
    flag: "🗽",
    lat: 40.7128,
    lon: -74.006,
  },
  {
    id: "paris",
    name: "Paris",
    country: "France",
    continent: "Europe",
    flag: "🗼",
    lat: 48.8566,
    lon: 2.3522,
  },
  {
    id: "london",
    name: "London",
    country: "United Kingdom",
    continent: "Europe",
    flag: "🇬🇧",
    lat: 51.5074,
    lon: -0.1278,
  },
  {
    id: "tokyo",
    name: "Tokyo",
    country: "Japan",
    continent: "Asia",
    flag: "🗾",
    lat: 35.6762,
    lon: 139.6503,
  },
  {
    id: "rome",
    name: "Rome",
    country: "Italy",
    continent: "Europe",
    flag: "🏛️",
    lat: 41.9028,
    lon: 12.4964,
  },
  {
    id: "mumbai",
    name: "Mumbai",
    country: "India",
    continent: "Asia",
    flag: "🇮🇳",
    lat: 18.922,
    lon: 72.8347,
  },
];
