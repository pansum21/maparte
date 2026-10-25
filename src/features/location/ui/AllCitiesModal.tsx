import { useEffect, useMemo, useState } from "react";
import "./AllCitiesModal.css";
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

const CONTINENTS = ["Americas", "Europe", "Asia", "Africa"] as const;

function CityPhoto({ city, slug, priority }: { city: string; slug: string; priority: boolean }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = `/assets/city-photos/${slug}.webp`;

  return (
    <div className={`city-card-photo${imageFailed ? "" : " has-image"}`} style={{ display: "grid", width: "100%", height: "112px", minHeight: "112px", flex: "0 0 112px", overflow: "hidden" }}>
      {imageFailed ? (
        <span className="city-photo-unavailable" aria-hidden="true" />
      ) : (
        <img
          src={imageSrc}
          style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
          alt={`${city} city photo`}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      )}
    </div>
  );
}

export default function AllCitiesModal({ isOpen, onClose }: AllCitiesModalProps) {
  const { state, dispatch, mapRef } = usePosterContext();
  const { flyToLocation } = useMapSync(state, dispatch, mapRef);
  const {
    handleChange,
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

  const useGps = () => {
    setTypedQuery(null);
    handleUseCurrentLocation();
  };

  return (
    <section className="all-cities-modal" role="dialog" aria-label="Choose a city">
      <div className="all-cities-search-main">
        <div
          className="all-cities-search-bar"
          style={{ display: "flex", alignItems: "center", gap: "5px", height: "42px", padding: "4px 6px", boxSizing: "border-box", overflow: "hidden" }}
        >
          <button
            type="button"
            className={`all-cities-location-action${showCoords ? " is-active" : ""}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setShowCoords((value) => !value)}
            aria-label="Toggle coordinates"
            title="Show or hide coordinates"
            style={{ display: "inline-grid", placeItems: "center", flex: "0 0 30px", width: "30px", height: "30px", padding: 0, border: "1px solid rgba(171, 201, 224, .28)", borderRadius: "7px", background: "rgba(31, 56, 75, .62)", color: "rgba(210, 231, 245, .9)", cursor: "pointer" }}
          ><LocationIcon /></button>
          <button
            type="button"
            className={`all-cities-location-action${isLocatingUser ? " is-locating" : ""}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={useGps}
            disabled={isLocatingUser}
            aria-label="Use current GPS location"
            title="Use current GPS location"
            style={{ display: "inline-grid", placeItems: "center", flex: "0 0 30px", width: "30px", height: "30px", padding: 0, border: "1px solid rgba(171, 201, 224, .28)", borderRadius: "7px", background: "rgba(31, 56, 75, .62)", color: "rgba(210, 231, 245, .9)", cursor: "pointer" }}
          ><MyLocationIcon /></button>
          <input
            type="text"
            className="all-cities-search-input"
            name="location"
            placeholder="City, state, or Google Maps link"
            value={state.form.location}
            onChange={handleInputChange}
            onFocus={() => setLocationFocused(true)}
            onBlur={() => setLocationFocused(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void searchNow(event.currentTarget.value);
            }}
            autoComplete="off"
            style={{ flex: "1 1 auto", minWidth: 0, width: 0, height: "30px", boxSizing: "border-box", padding: "0 8px", border: "1px solid rgba(171, 201, 224, .28)", borderRadius: "7px", background: "rgba(4, 12, 21, .68)", color: "#fff", fontSize: "14px", outline: "none" }}
          />
          <button
            type="button"
            className="all-cities-search-icon"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => void searchNow(state.form.location)}
            aria-label="Search location"
            title="Search location"
            style={{ display: "inline-grid", placeItems: "center", flex: "0 0 30px", width: "30px", height: "30px", padding: 0, border: "1px solid rgba(171, 201, 224, .28)", borderRadius: "7px", background: "rgba(31, 56, 75, .62)", color: "#9fb9cc", cursor: "pointer" }}
          ><SearchIcon /></button>
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
          {filteredCities.map((item, index) => {
            const isCurrent = state.form.displayCity?.toLowerCase() === item.city.toLowerCase();
            return (
              <button
                key={item.slug}
                type="button"
                className={`all-cities-card${isCurrent ? " is-active" : ""}`}
                style={{ display: "flex", flexDirection: "column", minHeight: "148px", overflow: "hidden" }}
                onClick={() => handleCityPick(item)}
              >
                <CityPhoto city={item.city} slug={item.slug} priority={index < 8} />
                <span className="city-card-name" style={{ display: "block", flex: "0 0 auto", minHeight: "36px", boxSizing: "border-box", color: "#fff", visibility: "visible", position: "relative" }}>{item.city}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
