export interface Location {
  id: string;
  label: string;
  city: string;
  country: string;
  countryCode?: string;
  continent?: string;
  lat: number;
  lon: number;
  fromGoogleMaps?: boolean;
  type?: string;
}

export interface SearchResult extends Location {}

export interface RecentLocation extends Location {
  lastUsedAt: number;
}

export const DEFAULT_CITY_TARGET_DISTANCE = 4900;

export function resolveTargetDistance(location: Partial<Location>): number {
  const type = String(location.type || "").toLowerCase();
  const label = String(location.label || "").toLowerCase();
  if (
    type === "country" ||
    type === "continent" ||
    (!label.includes(",") && location.country && label.trim() === location.country.trim().toLowerCase())
  ) {
    return 2_000_000;
  }
  if (type === "state" || type === "province" || type === "region") {
    return 350_000;
  }
  return DEFAULT_CITY_TARGET_DISTANCE;
}
