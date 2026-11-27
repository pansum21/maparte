import type { ICache } from "@/core/cache/ports";
import type { IHttp } from "@/core/http/ports";
import type { IGeocodePort } from "../domain/ports";
import type { SearchResult } from "../domain/types";
import {
  normalizeLocationResult,
  parseLocationResponseItems,
} from "./locationParser";
import { GEOCODE_TTL_MS, LOCATION_SEARCH_TTL_MS } from "./constants";
import {
  getGeocodeCacheKey,
  getLocationSearchCacheKey,
  getReverseGeocodeCacheKey,
} from "./cacheKeys";
import {
  parseCoordinatesOrGoogleMaps,
  resolveGoogleMapsLocation,
} from "./googleMapsParser";

// Deduplicate concurrent requests for the same query/coordinates
const inFlightSearchRequests = new Map<string, Promise<SearchResult[]>>();
const inFlightReverseRequests = new Map<string, Promise<SearchResult>>();


async function fetchNominatimData(
  http: IHttp,
  path: string,
  params: string,
  signal?: AbortSignal
): Promise<any> {
  const directUrl = `https://nominatim.openstreetmap.org/${path}?${params}`;
  const directRes = await http.get(directUrl, { headers: { Accept: 'application/json' }, signal }, 14000);
  if (!directRes.ok) {
    throw new Error(`Nominatim request failed with status: ${directRes.status}`);
  }
  return await directRes.json();
}

export function createNominatimAdapter(
  http: IHttp,
  cache: ICache,
): IGeocodePort {
  async function searchLocations(
    query: string,
    limit = 6,
    signal?: AbortSignal,
  ): Promise<SearchResult[]> {
    const lookup = String(query ?? "").trim();
    if (lookup.length < 2) {
      return [];
    }

    // 0. Check for Google Maps URLs or raw coordinates
    const gmapsOrCoords = parseCoordinatesOrGoogleMaps(lookup);
    if (gmapsOrCoords) {
      if (gmapsOrCoords.lat != null && gmapsOrCoords.lon != null) {
        try {
          const rev = await reverseGeocode(gmapsOrCoords.lat, gmapsOrCoords.lon);
          const customLabel = gmapsOrCoords.placeName
            ? `${gmapsOrCoords.placeName}, ${rev.city || rev.country}`
            : rev.label;
          const customCity = gmapsOrCoords.placeName || rev.city;
          const result: SearchResult = {
            ...rev,
            id: `gmaps:${gmapsOrCoords.lat.toFixed(6)},${gmapsOrCoords.lon.toFixed(6)}`,
            label: customLabel,
            city: customCity,
            lat: gmapsOrCoords.lat,
            lon: gmapsOrCoords.lon,
            fromGoogleMaps: true,
          };
          return [result];
        } catch {
          const fallbackLabel = gmapsOrCoords.placeName
            ? `${gmapsOrCoords.placeName} (${gmapsOrCoords.lat.toFixed(6)}, ${gmapsOrCoords.lon.toFixed(6)})`
            : `${gmapsOrCoords.lat.toFixed(6)}, ${gmapsOrCoords.lon.toFixed(6)}`;
          const result: SearchResult = {
            id: `gmaps:${gmapsOrCoords.lat.toFixed(6)},${gmapsOrCoords.lon.toFixed(6)}`,
            label: fallbackLabel,
            city: gmapsOrCoords.placeName || "",
            country: "",
            lat: gmapsOrCoords.lat,
            lon: gmapsOrCoords.lon,
            fromGoogleMaps: true,
          };
          return [result];
        }
      }

      if (gmapsOrCoords.shortUrl) {
        try {
          const resolved = await resolveGoogleMapsLocation(lookup, signal);
          if (resolved && resolved.lat != null && resolved.lon != null) {
            const rev = await reverseGeocode(resolved.lat, resolved.lon);
            const customLabel = resolved.placeName
              ? `${resolved.placeName}, ${rev.city || rev.country}`
              : rev.label;
            const customCity = resolved.placeName || rev.city;
            const result: SearchResult = {
              ...rev,
              id: `gmaps:${resolved.lat.toFixed(6)},${resolved.lon.toFixed(6)}`,
              label: customLabel,
              city: customCity,
              lat: resolved.lat,
              lon: resolved.lon,
              fromGoogleMaps: true,
            };
            return [result];
          }
        } catch {
          // Fall through if resolution fails
        }

        if (gmapsOrCoords.placeName) {
          const fallbackResults = await searchLocations(gmapsOrCoords.placeName, limit, signal);
          return fallbackResults.map((r, i) => (i === 0 ? { ...r, fromGoogleMaps: true } : r));
        }
      }
    }

    const normalizedLimit = Math.max(1, Math.min(Math.round(limit), 10));
    const cacheKey = getLocationSearchCacheKey(lookup, normalizedLimit);
    const cached = cache.read<SearchResult[]>(cacheKey, LOCATION_SEARCH_TTL_MS);
    if (Array.isArray(cached)) {
      return cached;
    }

    if (inFlightSearchRequests.has(cacheKey)) {
      return inFlightSearchRequests.get(cacheKey)!;
    }

    // Helper to execute Nominatim query and parse results
    const doFetch = async (queryStr: string): Promise<SearchResult[]> => {
      try {
        const data = await fetchNominatimData(
          http,
          "search",
          `format=jsonv2&addressdetails=1&limit=${normalizedLimit}&q=${encodeURIComponent(queryStr)}`,
          signal
        );
        return parseLocationResponseItems(data);
      } catch (err) {
        return [];
      }
    };

    const promise = (async () => {
      // 1. First attempt: raw user query
      let results = await doFetch(lookup);
      if (results.length > 0) {
        cache.write(cacheKey, results);
        return results;
      }

      // 2. Second attempt: Normalize Hindi / Indic country terms (e.g. सोलन, इंडिया -> सोलन, India)
      let cleaned = lookup
        .replace(/\b(इंडिया|भारत|हिंदुस्तान)\b/gi, "India")
        .replace(/\b(यूएसए|अमेरिका)\b/gi, "USA")
        .replace(/\b(कनाडा)\b/gi, "Canada")
        .replace(/\b(ब्रिटेन|इंग्लैंड)\b/gi, "UK")
        .trim();

      if (cleaned !== lookup) {
        results = await doFetch(cleaned);
        if (results.length > 0) {
          cache.write(cacheKey, results);
          return results;
        }
      }

      // 3. Third attempt: If query has commas (e.g. "सोलन, इंडिया"), search the primary city name before the comma
      const parts = lookup.split(/[,،]+/).map((s) => s.trim()).filter(Boolean);
      if (parts.length > 1) {
        results = await doFetch(parts[0]);
        if (results.length > 0) {
          cache.write(cacheKey, results);
          return results;
        }
      }

      cache.write(cacheKey, []);
      return [];
    })().finally(() => {
      inFlightSearchRequests.delete(cacheKey);
    });

    inFlightSearchRequests.set(cacheKey, promise);
    return promise;
  }

  async function geocodeLocation(query: string): Promise<SearchResult> {
    const lookup = String(query ?? "").trim();
    if (!lookup) {
      throw new Error("Location is required.");
    }

    // Check for Google Maps or coordinates
    const gmapsOrCoords = parseCoordinatesOrGoogleMaps(lookup);
    if (gmapsOrCoords && gmapsOrCoords.lat != null && gmapsOrCoords.lon != null) {
      try {
        const rev = await reverseGeocode(gmapsOrCoords.lat, gmapsOrCoords.lon);
        return {
          ...rev,
          id: `gmaps:${gmapsOrCoords.lat.toFixed(6)},${gmapsOrCoords.lon.toFixed(6)}`,
          label: gmapsOrCoords.placeName
            ? `${gmapsOrCoords.placeName}, ${rev.city || rev.country}`
            : rev.label,
          city: gmapsOrCoords.placeName || rev.city,
          lat: gmapsOrCoords.lat,
          lon: gmapsOrCoords.lon,
          fromGoogleMaps: true,
        };
      } catch {
        return {
          id: `gmaps:${gmapsOrCoords.lat.toFixed(6)},${gmapsOrCoords.lon.toFixed(6)}`,
          label: `${gmapsOrCoords.lat.toFixed(6)}, ${gmapsOrCoords.lon.toFixed(6)}`,
          city: gmapsOrCoords.placeName || "",
          country: "",
          lat: gmapsOrCoords.lat,
          lon: gmapsOrCoords.lon,
          fromGoogleMaps: true,
        };
      }
    }

    const cacheKey = getGeocodeCacheKey(lookup);
    const cached = cache.read<Record<string, unknown>>(
      cacheKey,
      GEOCODE_TTL_MS,
    );
    if (cached && typeof cached === "object") {
      const normalizedCached = normalizeLocationResult(cached as any, lookup);
      if (normalizedCached) {
        return normalizedCached;
      }
    }

    const results = await searchLocations(lookup, 1);
    if (results.length === 0) {
      throw new Error(`No coordinates found for "${lookup}"`);
    }

    const first = results[0];
    cache.write(cacheKey, first);
    return first;
  }

  async function geocodeCity(
    city: string,
    country: string,
  ): Promise<{ lat: number; lon: number; displayName: string }> {
    const lookup = `${city}, ${country}`.trim();
    const location = await geocodeLocation(lookup);
    return {
      lat: location.lat,
      lon: location.lon,
      displayName: location.label,
    };
  }

  async function reverseGeocode(lat: number, lon: number): Promise<SearchResult> {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new Error("Latitude and longitude are required.");
    }

    const cacheKey = getReverseGeocodeCacheKey(lat, lon);
    const cached = cache.read<Record<string, unknown>>(cacheKey, GEOCODE_TTL_MS);
    if (cached && typeof cached === "object") {
      const normalizedCached = normalizeLocationResult(cached as any);
      if (normalizedCached) {
        return normalizedCached;
      }
    }

    if (inFlightReverseRequests.has(cacheKey)) {
      return inFlightReverseRequests.get(cacheKey)!;
    }

    const promise = fetchNominatimData(
      http,
      "reverse",
      `format=jsonv2&addressdetails=1&zoom=10&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`
    )
      .then((data) => {
        const normalized = normalizeLocationResult(data);
        if (!normalized) {
          throw new Error("No nearby city found for the selected coordinates.");
        }
        cache.write(cacheKey, normalized);
        return normalized;
      })
      .finally(() => {
        inFlightReverseRequests.delete(cacheKey);
      });

    inFlightReverseRequests.set(cacheKey, promise);
    return promise;
  }

  return { searchLocations, geocodeLocation, reverseGeocode, geocodeCity };
}
