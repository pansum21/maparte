import { useCallback, useEffect, useRef, useState } from "react";
import { reverseGeocodeCoordinates, searchLocations } from "@/core/services";
import type { SearchResult } from "@/features/location/domain/types";
import {
  isGoogleMapsLink,
  resolveGoogleMapsCoordinates,
} from "@/features/location/domain/googleMapsLink";

interface UseLocationAutocompleteReturn {
  locationSuggestions: SearchResult[];
  isLocationSearching: boolean;
  clearLocationSuggestions: () => void;
  searchNow: (query: string) => Promise<SearchResult | null>;
}

const DEBOUNCE_DELAY_MS = 450;

export function useLocationAutocomplete(
  locationInput: string,
  isFocused: boolean,
): UseLocationAutocompleteReturn {
  const [locationSuggestions, setLocationSuggestions] = useState<
    SearchResult[]
  >([]);
  const [isLocationSearching, setIsLocationSearching] = useState(false);
  const latestQueryRef = useRef("");
  const debounceIdRef = useRef<number | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  const performSearch = useCallback(async (query: string): Promise<SearchResult | null> => {
    const q = String(query ?? "").trim();
    if (q.length < 2) {
      setLocationSuggestions([]);
      return null;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    latestQueryRef.current = q;
    setIsLocationSearching(true);

    try {
      if (isGoogleMapsLink(q)) {
        const coordinates = await resolveGoogleMapsCoordinates(q, controller.signal);
        let nearby: SearchResult | null = null;
        try {
          nearby = await reverseGeocodeCoordinates(coordinates.lat, coordinates.lon);
        } catch {
          // The exact coordinates remain usable even if reverse geocoding is unavailable.
        }

        const coordinateLabel = `${coordinates.lat.toFixed(6)}, ${coordinates.lon.toFixed(6)}`;
        const result: SearchResult = {
          id: `google-maps:${coordinates.lat.toFixed(6)},${coordinates.lon.toFixed(6)}`,
          label: nearby?.label || `Pinned location — ${coordinateLabel}`,
          city: nearby?.city || "Pinned location",
          country: nearby?.country || "",
          continent: nearby?.continent || "",
          lat: coordinates.lat,
          lon: coordinates.lon,
        };
        if (latestQueryRef.current === q) setLocationSuggestions([result]);
        return result;
      }

      const results = await searchLocations(q, 6, controller.signal);
      if (latestQueryRef.current === q) {
        setLocationSuggestions(results);
      }
      return null;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return null;
      }
      if (latestQueryRef.current === q) {
        setLocationSuggestions([]);
      }
      return null;
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      if (latestQueryRef.current === q) {
        setIsLocationSearching(false);
      }
    }
  }, []);

  const searchNow = useCallback(
    async (query: string) => {
      // Cancel any pending debounce so it doesn't fire again after the immediate search
      window.clearTimeout(debounceIdRef.current);
      debounceIdRef.current = undefined;
      return performSearch(query);
    },
    [performSearch],
  );

  useEffect(() => {
    const query = String(locationInput ?? "").trim();
    if (!isFocused || query.length < 2) {
      latestQueryRef.current = "";
      setLocationSuggestions([]);
      setIsLocationSearching(false);
      return undefined;
    }

    let cancelled = false;
    debounceIdRef.current = window.setTimeout(() => {
      if (!cancelled) {
        void performSearch(query);
      }
    }, DEBOUNCE_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(debounceIdRef.current);
      debounceIdRef.current = undefined;
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [locationInput, isFocused, performSearch]);

  const clearLocationSuggestions = useCallback(() => {
    setLocationSuggestions([]);
  }, []);

  return {
    locationSuggestions,
    isLocationSearching,
    clearLocationSuggestions,
    searchNow,
  };
}
