import { useCallback, useEffect, useRef, useState } from "react";
import { searchLocations } from "@/core/services";
import type { SearchResult } from "@/features/location/domain/types";

interface UseLocationAutocompleteReturn {
  locationSuggestions: SearchResult[];
  isLocationSearching: boolean;
  clearLocationSuggestions: () => void;
  searchNow: (query: string) => Promise<SearchResult[]>;
}

export function useLocationAutocomplete(
  locationInput: string,
  _isFocused: boolean,
): UseLocationAutocompleteReturn {
  const [locationSuggestions, setLocationSuggestions] = useState<
    SearchResult[]
  >([]);
  const [isLocationSearching, setIsLocationSearching] = useState(false);
  const latestQueryRef = useRef("");
  const abortRef = useRef<AbortController | null>(null);

  const performSearch = useCallback(async (query: string): Promise<SearchResult[]> => {
    const q = String(query ?? "").trim();
    if (q.length < 2) {
      setLocationSuggestions([]);
      return [];
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    latestQueryRef.current = q;
    setIsLocationSearching(true);

    try {
      const results = await searchLocations(q, 6, controller.signal);
      if (latestQueryRef.current === q) {
        setLocationSuggestions(results);
      }
      return results;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return [];
      }
      if (latestQueryRef.current === q) {
        setLocationSuggestions([]);
      }
      return [];
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
    async (query: string): Promise<SearchResult[]> => {
      return await performSearch(query);
    },
    [performSearch],
  );

  useEffect(() => {
    latestQueryRef.current = "";
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLocationSearching(false);
    setLocationSuggestions([]);
  }, [locationInput]);

  const clearLocationSuggestions = useCallback(() => {
    latestQueryRef.current = "";
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLocationSearching(false);
    setLocationSuggestions([]);
  }, []);

  return {
    locationSuggestions,
    isLocationSearching,
    clearLocationSuggestions,
    searchNow,
  };
}
