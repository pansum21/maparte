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
  { id: "dehradun", name: "Dehradun", country: "India", continent: "Asia", flag: "🏔️", lat: 30.3165, lon: 78.0322 },
  { id: "delhi", name: "Delhi", country: "India", continent: "Asia", flag: "🇮🇳", lat: 28.6139, lon: 77.2090 },
  { id: "mumbai", name: "Mumbai", country: "India", continent: "Asia", flag: "🌊", lat: 19.0760, lon: 72.8777 },
  { id: "london", name: "London", country: "United Kingdom", continent: "Europe", flag: "🇬🇧", lat: 51.5074, lon: -0.1278 },
  { id: "paris", name: "Paris", country: "France", continent: "Europe", flag: "🗼", lat: 48.8566, lon: 2.3522 },
];
