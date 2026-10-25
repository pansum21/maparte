import { useEffect, useMemo, useRef, useState } from "react";
import seoCitiesData from "@/data/seoCities.json";
import { useCurrentLocation } from "@/features/location/application/useCurrentLocation";
import { useLocationAutocomplete } from "@/features/location/application/useLocationAutocomplete";
import { useMapSync } from "@/features/map/application/useMapSync";
import { useFormHandlers } from "@/features/poster/application/useFormHandlers";
import { usePosterContext } from "@/features/poster/ui/PosterContext";
import type { SearchResult } from "@/features/location/domain/types";
import { LocationIcon, MyLocationIcon, SearchIcon } from "@/shared/ui/Icons";

interface AllCitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SeoCityItem {
  slug: string;
  city: string;
  country: string;
  continent: string;
  lat: number;
  lon: number;
  distanceMeters: number;
  landmarks: string[];
  tagline: string;
  description?: string;
  rank?: number;
  annualSearches?: string;
}

type CityImage = {
  src: string;
  sourcePage: string;
  author: string;
  license: string;
  licenseUrl: string;
};

const CONTINENTS = ["Americas", "Europe", "Asia", "Africa"] as const;
const cityImageCache = new Map<string, Promise<CityImage | null>>();
let cityImageManifestPromise: Promise<Record<string, CityImage>> | null = null;

function loadCityImage(slug: string): Promise<CityImage | null> {
  const cached = cityImageCache.get(slug);
  if (cached) return cached;

  cityImageManifestPromise ??= fetch("/assets/city-photos/manifest.json")
    .then((response) => response.ok ? response.json() : {})
    .catch(() => ({}));
  const request = cityImageManifestPromise.then((manifest) => manifest[slug] ?? null);
  cityImageCache.set(slug, request);
  return request;
}

function CityPhoto({ city, slug }: { city: string; slug: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const requestedRef = useRef(false);
  const [image, setImage] = useState<CityImage | null>(null);
  const [loadFinished, setLoadFinished] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || requestedRef.current) return;

    let active = true;
    const load = () => {
      if (!active || requestedRef.current) return;
      requestedRef.current = true;
      void loadCityImage(slug).then((result) => {
        if (active) {
          setImage(result);
          setLoadFinished(true);
        }
      });
    };

    if (typeof IntersectionObserver === "undefined") {
      load();
      return () => { active = false; };
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        observer.disconnect();
        load();
      }
    }, { rootMargin: "180px" });
    observer.observe(host);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [slug]);

  return (
    <div ref={hostRef} className={`city-card-photo${image ? " has-image" : ""}`}>
      {image ? (
        <img
          src={image.src}
          alt={`${city} city photo`}
          title={`Photo by ${image.author}; ${image.license}. Source: ${image.sourcePage}${image.licenseUrl ? ` (${image.licenseUrl})` : ""}`}
          loading="lazy"
          decoding="async"
          onError={() => {
            setImage(null);
            setLoadFinished(true);
          }}
        />
      ) : (
        <span className={loadFinished ? "city-photo-unavailable" : "city-photo-loading"} aria-hidden="true" />
      )}
    </div>
  );
}

export default function AllCitiesModal({ isOpen, onClose }: AllCitiesModalProps) {
  const { state, dispatch, mapRef } = usePosterContext();
  const { flyToLocation } = useMapSync(state, dispatch, mapRef);
  const {
    handleChange,
    handleClearLocation,
    handleLocationSelect: handleLocationSelectBase,
    setLocationFocused,
  } = useFormHandlers();
  const { locationSuggestions, isLocationSearching, searchNow } =
    useLocationAutocomplete(state.form.location, state.isLocationFocused);
  const { handleUseCurrentLocation, isLocatingUser, locationPermissionMessage } =
    useCurrentLocation(flyToLocation);

  const [typedQuery, setTypedQuery] = useState<string | null>(null);
  const [selectedContinent, setSelectedContinent] = useState<string>("Americas");
  const [showCoords, setShowCoords] = useState(false);
  const isSearchingCities = typedQuery !== null && typedQuery.trim().length > 0;
  const normalizedQuery = typedQuery?.trim().toLowerCase() ?? "";

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const filteredCities = useMemo(() => {
    const list = seoCitiesData as SeoCityItem[];
    return list.filter((item) => {
      if (isSearchingCities) {
        return item.city.toLowerCase().includes(normalizedQuery) ||
          item.country.toLowerCase().includes(normalizedQuery) ||
          item.landmarks.some((landmark) => landmark.toLowerCase().includes(normalizedQuery));
      }
      const matchesContinent = selectedContinent === "Americas"
        ? item.continent === "North America" || item.continent === "South America"
        : selectedContinent === "Asia"
          ? item.continent === "Asia" || item.continent === "Middle East" || item.continent === "Oceania"
          : item.continent === selectedContinent;
      return matchesContinent;
    });
  }, [isSearchingCities, normalizedQuery, selectedContinent]);

  if (!isOpen) return null;

  const hasCuratedSearchMatch = isSearchingCities && filteredCities.length > 0;
  const showGeocoderSuggestions = isSearchingCities && !hasCuratedSearchMatch;
  const suggestions = showGeocoderSuggestions ? locationSuggestions : [];
  const hasLocationValue = state.form.location.trim().length > 0;

  const onLocationSelect = (result: SearchResult) => {
    handleLocationSelectBase(result);
    flyToLocation(result.lat, result.lon);
  };

  const handleCityPick = (item: SeoCityItem) => {
    const fullLabel = `${item.city}, ${item.country}`;
    const result: SearchResult = {
      id: `seo:${item.slug}`,
      label: fullLabel,
      city: item.city,
      country: item.country,
      continent: item.continent,
      lat: item.lat,
      lon: item.lon,
    };
    handleLocationSelectBase(result);
    dispatch({
      type: "SET_FORM_FIELDS",
      resetDisplayNameOverrides: true,
      fields: {
        location: fullLabel,
        latitude: item.lat.toFixed(6),
        longitude: item.lon.toFixed(6),
        displayCity: item.city,
        displayCountry: item.country,
        displayContinent: item.continent,
      },
    });
    flyToLocation(item.lat, item.lon);
    onClose();
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTypedQuery(event.currentTarget.value);
    handleChange(event);
    setLocationFocused(true);
  };

  const clearLocation = () => {
    setTypedQuery("");
    handleClearLocation();
  };

  const useGps = () => {
    setTypedQuery(null);
    handleUseCurrentLocation();
  };

  return (
    <section className="all-cities-modal" role="dialog" aria-label="Choose a city">
      <div className="all-cities-search-main">
        <div className="all-cities-search-bar">
          <span className="all-cities-search-icon" aria-hidden="true"><SearchIcon /></span>
          <input
            type="text"
            className="all-cities-search-input"
            name="location"
            placeholder="Search city or paste Google Maps link"
            value={state.form.location}
            onChange={handleInputChange}
            onFocus={() => setLocationFocused(true)}
            onBlur={() => setLocationFocused(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void searchNow(event.currentTarget.value);
            }}
            autoComplete="off"
          />
          {hasLocationValue ? (
            <button
              type="button"
              className="all-cities-clear-btn"
              onMouseDown={(event) => event.preventDefault()}
              onClick={clearLocation}
              aria-label="Clear location"
            >×</button>
          ) : null}
        </div>
        <div className="all-cities-location-actions">
          <button
            type="button"
            className={`all-cities-location-action${isLocatingUser ? " is-locating" : ""}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={useGps}
            disabled={isLocatingUser}
            aria-label="Use current GPS location"
            title="Use current GPS location"
          ><MyLocationIcon /></button>
          <button
            type="button"
            className={`all-cities-location-action${showCoords ? " is-active" : ""}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setShowCoords((value) => !value)}
            aria-label="Toggle coordinates"
            title="Show or hide coordinates"
          ><LocationIcon /></button>
        </div>

        {showCoords ? (
          <div className="all-cities-coordinates">
            <label>Latitude<input name="latitude" value={state.form.latitude} onChange={handleChange} /></label>
            <label>Longitude<input name="longitude" value={state.form.longitude} onChange={handleChange} /></label>
          </div>
        ) : null}

        {showGeocoderSuggestions ? (
          <ul className="all-cities-geocoder-results" role="listbox">
            {suggestions.map((suggestion) => (
              <li key={suggestion.id}>
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onLocationSelect(suggestion);
                  }}
                >{suggestion.label}</button>
              </li>
            ))}
            {isLocationSearching ? <li className="all-cities-geocoder-status">Searching…</li> : null}
          </ul>
        ) : null}
      </div>

      {locationPermissionMessage ? (
        <p className="location-permission-message">{locationPermissionMessage}</p>
      ) : null}

      <div className="all-cities-continents" role="tablist" aria-label="City regions">
        {CONTINENTS.map((continent) => (
          <button
            key={continent}
            type="button"
            role="tab"
            aria-selected={selectedContinent === continent}
            className={`all-cities-continent-pill${selectedContinent === continent ? " is-active" : ""}`}
            onClick={() => {
              setSelectedContinent(continent);
              if (isSearchingCities) setTypedQuery("");
            }}
          >{continent}</button>
        ))}
      </div>

      {(!isSearchingCities || hasCuratedSearchMatch) ? (
        <div className="all-cities-grid">
          {filteredCities.map((item) => {
            const isCurrent = state.form.displayCity?.toLowerCase() === item.city.toLowerCase();
            return (
              <button
                key={item.slug}
                type="button"
                className={`all-cities-card${isCurrent ? " is-active" : ""}`}
                onClick={() => handleCityPick(item)}
              >
                <CityPhoto city={item.city} slug={item.slug} />
                <span className="city-card-name">{item.city}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
