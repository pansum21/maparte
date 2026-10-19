import seoCitiesData from "@/data/seoCities.json";

export interface MatchedCity {
  slug: string;
  city: string;
  country: string;
  continent: string;
  lat: number;
  lon: number;
  distanceMeters: number;
  landmarks: string[];
  tagline: string;
  description: string;
}

export const SEO_CITIES: MatchedCity[] = seoCitiesData as MatchedCity[];

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
): MatchedCity | null {
  // 1. Check pathname: /cities/<slug>
  const citiesPrefix = "/cities/";
  if (pathname.includes(citiesPrefix)) {
    const rawSlug = pathname.split(citiesPrefix)[1]?.split("/")[0]?.toLowerCase();
    if (rawSlug) {
      const match = SEO_CITIES.find(
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
        const match = SEO_CITIES.find(
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
