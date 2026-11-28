import seoCitiesData from "@/data/seoCities.json";
import type { MatchedCity } from "@/features/location/domain/cityRouteResolver";

/**
 * Full SEO city records, including the description/tagline copy that the city
 * landing pages render. Kept out of `cityRouteResolver.ts` so the editor only
 * loads the compact lookup index and not ~465 KB of page copy.
 */
export const SEO_CITIES: MatchedCity[] = seoCitiesData as MatchedCity[];
