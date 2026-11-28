import seoCitiesIndex from "@/data/seoCitiesIndex.json";

/**
 * The fields URL resolution needs. The full city records carry SEO copy
 * (description, metaDescription, tagline, landmarks) that only the city
 * landing pages render, so the editor reads this compact index instead of
 * downloading ~465 KB of prose it never shows.
 */
export interface CityMatch {
  slug: string;
  city: string;
  country: string;
  countryCode?: string;
  continent: string;
  lat: number;
  lon: number;
  distanceMeters: number;
}

/** Full SEO record, including the copy used on the city landing pages. */
export interface MatchedCity extends CityMatch {
  landmarks: string[];
  tagline: string;
  description: string;
  rank?: number;
  metaDescription?: string;
}

export const CITY_MATCHES: CityMatch[] = seoCitiesIndex as CityMatch[];

/**
 * Normalizes city strings for matching (e.g. "New York" -> "new-york", "San Francisco" -> "san-francisco")
 */
function normalizeCityName(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Resolves a city from either a URL pathname (/cities/:slug) or a query string (?city=...).
 */
export function resolveCityFromUrl(
  pathname: string = "",
  search: string = "",
): CityMatch | null {
  // 1. Check pathname: /cities/<slug>
  const citiesPrefix = "/cities/";
  if (pathname.includes(citiesPrefix)) {
    const rawSlug = pathname.split(citiesPrefix)[1]?.split("/")[0]?.toLowerCase();
    if (rawSlug) {
      const match = CITY_MATCHES.find(
        (c) =>
          c.slug === rawSlug ||
          c.slug === `${rawSlug}-map-poster` ||
          normalizeCityName(c.city) === rawSlug.replace(/-map-poster$/, ""),
      );
      if (match) return match;
    }
  }

  // 2. Check query string: ?city=...
  if (search) {
    try {
      const params = new URLSearchParams(search);
      const cityQuery = params.get("city");
      if (cityQuery) {
        const normalized = normalizeCityName(cityQuery);
        const match = CITY_MATCHES.find(
          (c) =>
            normalizeCityName(c.city) === normalized ||
            c.city.toLowerCase() === cityQuery.toLowerCase() ||
            c.slug.includes(normalized),
        );
        if (match) return match;
      }
    } catch {
      // ignore malformed search params
    }
  }

  return null;
}

/**
 * Finds a matching SEO city by name and optional country.
 */
export function findCityMatch(
  cityName: string = "",
  countryName?: string,
): CityMatch | null {
  if (!cityName || typeof cityName !== "string") return null;
  const cleanCity = cityName.trim();
  if (!cleanCity) return null;
  const normCity = normalizeCityName(cleanCity);

  // 1. Exact city + country match
  if (countryName) {
    const normCountry = normalizeCityName(countryName);
    const exactBoth = CITY_MATCHES.find(
      (c) =>
        normalizeCityName(c.city) === normCity &&
        (normalizeCityName(c.country) === normCountry ||
          c.country.toLowerCase().includes(countryName.toLowerCase())),
    );
    if (exactBoth) return exactBoth;
  }

  // 2. Exact city match
  const exactCity = CITY_MATCHES.find(
    (c) =>
      normalizeCityName(c.city) === normCity ||
      c.slug === `${normCity}-map-poster` ||
      c.slug === normCity,
  );
  if (exactCity) return exactCity;

  // 3. Prefix match if city label has comma (e.g. "Paris, France")
  const firstSegment = cleanCity.split(",")[0]?.trim();
  if (firstSegment && firstSegment !== cleanCity) {
    const normFirst = normalizeCityName(firstSegment);
    const prefixMatch = CITY_MATCHES.find(
      (c) =>
        normalizeCityName(c.city) === normFirst ||
        c.slug === `${normFirst}-map-poster` ||
        c.slug === normFirst,
    );
    if (prefixMatch) return prefixMatch;
  }

  return null;
}
