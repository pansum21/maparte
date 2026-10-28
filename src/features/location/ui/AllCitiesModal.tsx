import { useEffect, useMemo, useState } from "react";
import "./AllCitiesModal.css";
import cityDirectoryData from "@/data/cityDirectory.json";
import cityPhotosData from "@/data/cityPhotos.json";
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

interface CityDirectoryItem {
  slug: string;
  city: string;
  country: string;
  countryCode?: string;
  continent: string;
  lat: number;
  lon: number;
  landmarks?: string[];
  isCapital?: boolean;
  capitalOf?: string;
}

interface CityPhotoCredit {
  src?: string;
  sourcePage?: string;
  author?: string;
  license?: string;
}

const CITY_REGIONS = [
  "North Asia",
  "South Asia",
  "North America",
  "South America",
  "Central America",
  "Africa",
  "Europe",
  "Oceania",
] as const;
const cityCollator = new Intl.Collator("en", {
  sensitivity: "base",
  numeric: true,
});

function CityPhoto({
  city,
  slug,
  priority,
  credit,
}: {
  city: string;
  slug: string;
  priority: boolean;
  credit?: CityPhotoCredit;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = credit?.src || `/assets/city-photos/${slug}.webp`;

  return (
    <div
      className={`city-card-photo${imageFailed ? "" : " has-image"}`}
      style={{
        position: "relative",
        display: "grid",
        width: "100%",
        height: "112px",
        minHeight: "112px",
        flex: "0 0 112px",
        overflow: "hidden",
      }}
    >
      {imageFailed ? (
        <span className="city-photo-unavailable" aria-hidden="true" />
      ) : (
        <img
          src={imageSrc}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
          alt={`${city} city photo`}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      )}
      {credit?.sourcePage ? (
        <a
          href={credit.sourcePage}
          target="_blank"
          rel="noreferrer"
          aria-label={`Photo credit: ${credit.author || "Wikimedia contributor"}, ${credit.license || "license details"}`}
          title={`Photo: ${credit.author || "Wikimedia contributor"} · ${credit.license || "See source"}`}
          onClick={(event) => event.stopPropagation()}
          style={{
            position: "absolute",
            zIndex: 1,
            right: "5px",
            bottom: "5px",
            display: "grid",
            placeItems: "center",
            width: "18px",
            height: "18px",
            borderRadius: "50%",
            background: "rgba(3, 12, 21, .72)",
            color: "#fff",
            fontSize: "11px",
            textDecoration: "none",
          }}
        >
          ©
        </a>
      ) : null}
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
  const [selectedRegion, setSelectedRegion] = useState<string>("North Asia");
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
    const list = cityDirectoryData as CityDirectoryItem[];
    return list.filter((item) => {
      if (isSearchingCities) {
        return (
          item.city.toLowerCase().includes(normalizedQuery) ||
          item.country.toLowerCase().includes(normalizedQuery) ||
          (item.landmarks &&
            item.landmarks.some((landmark) =>
              landmark.toLowerCase().includes(normalizedQuery),
            ))
        );
      }
      const matchesRegion =
        item.continent === selectedRegion;
      return matchesRegion;
    }).sort(
      (first, second) =>
        cityCollator.compare(first.city, second.city) ||
        cityCollator.compare(first.country, second.country),
    );
  }, [isSearchingCities, normalizedQuery, selectedRegion]);

  if (!isOpen) return null;

  const hasCuratedSearchMatch = isSearchingCities && filteredCities.length > 0;
  const showGeocoderSuggestions = isSearchingCities && !hasCuratedSearchMatch;
  const suggestions = showGeocoderSuggestions ? locationSuggestions : [];
  const hasLocationValue = state.form.location.trim().length > 0;

  const onLocationSelect = (result: SearchResult) => {
    handleLocationSelectBase(result);
    flyToLocation(result.lat, result.lon);
    onClose();
  };

  const handleCityPick = (item: CityDirectoryItem) => {
    const fullLabel = `${item.city}, ${item.country}`;
    const result: SearchResult = {
      id: `dir:${item.slug}`,
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
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            height: "42px",
            padding: "4px 6px",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            className={`all-cities-location-action${showCoords ? " is-active" : ""}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setShowCoords((value) => !value)}
            aria-label="Toggle coordinates"
            title="Show or hide coordinates"
            style={{
              display: "inline-grid",
              placeItems: "center",
              flex: "0 0 30px",
              width: "30px",
              height: "30px",
              padding: 0,
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: "7px",
              background: "rgba(12, 26, 40, 0.65)",
              color: "rgba(210, 231, 245, .9)",
              cursor: "pointer",
            }}
          >
            <LocationIcon />
          </button>
          <button
            type="button"
            className={`all-cities-location-action${isLocatingUser ? " is-locating" : ""}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={useGps}
            disabled={isLocatingUser}
            aria-label="Use current GPS location"
            title="Use current GPS location"
            style={{
              display: "inline-grid",
              placeItems: "center",
              flex: "0 0 30px",
              width: "30px",
              height: "30px",
              padding: 0,
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: "7px",
              background: "rgba(12, 26, 40, 0.65)",
              color: "rgba(210, 231, 245, .9)",
              cursor: "pointer",
            }}
          >
            <MyLocationIcon />
          </button>
          <input
            type="text"
            className="all-cities-search-input"
            name="location"
            placeholder="Search city, country..."
            value={state.form.location}
            onChange={handleInputChange}
            onFocus={() => setLocationFocused(true)}
            onBlur={() => setLocationFocused(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void searchNow(event.currentTarget.value);
            }}
            autoComplete="off"
            style={{
              flex: "1 1 auto",
              minWidth: 0,
              width: 0,
              height: "30px",
              boxSizing: "border-box",
              padding: "0 8px",
              border: "1px solid rgba(56, 189, 248, 0.35)",
              borderRadius: "7px",
              background: "rgba(12, 26, 40, 0.75)",
              color: "#fff",
              fontSize: "14px",
              outline: "none",
            }}
          />
          {hasLocationValue ? (
            <button
              type="button"
              className="all-cities-clear-btn"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setTypedQuery("");
                dispatch({
                  type: "SET_FORM_FIELDS",
                  fields: { location: "" },
                });
              }}
              aria-label="Clear location input"
              title="Clear input"
              style={{
                display: "inline-grid",
                placeItems: "center",
                flex: "0 0 24px",
                width: "24px",
                height: "24px",
                padding: 0,
                border: "none",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.12)",
                color: "#d9e8f5",
                cursor: "pointer",
                fontSize: "12px",
                lineHeight: "1",
              }}
            >
              ✕
            </button>
          ) : null}
          <button
            type="button"
            className="all-cities-search-icon"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => void searchNow(state.form.location)}
            aria-label="Search location"
            title="Search location"
            style={{
              display: "inline-grid",
              placeItems: "center",
              flex: "0 0 30px",
              width: "30px",
              height: "30px",
              padding: 0,
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: "7px",
              background: "rgba(12, 26, 40, 0.65)",
              color: "#9fb9cc",
              cursor: "pointer",
            }}
          >
            <SearchIcon />
          </button>
          <button
            type="button"
            className="all-cities-close-btn"
            onClick={onClose}
            aria-label="Close location panel"
            title="Close location panel"
            style={{
              display: "inline-grid",
              placeItems: "center",
              flex: "0 0 30px",
              width: "30px",
              height: "30px",
              padding: 0,
              border: "1px solid rgba(255, 255, 255, 0.22)",
              borderRadius: "7px",
              background: "rgba(255, 255, 255, 0.08)",
              color: "#e2e8f0",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            ✕
          </button>
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
        {CITY_REGIONS.map((region) => (
          <button
            key={region}
            type="button"
            role="tab"
            aria-selected={selectedRegion === region}
            className={`all-cities-continent-pill${selectedRegion === region ? " is-active" : ""}`}
            onClick={() => {
              setSelectedRegion(region);
              if (isSearchingCities) setTypedQuery("");
            }}
          >{region}</button>
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
                <CityPhoto
                  city={item.city}
                  slug={item.slug}
                  priority={index < 8}
                  credit={(cityPhotosData as Record<string, CityPhotoCredit>)[item.slug]}
                />
                <span
                  className="city-card-name"
                  style={{
                    display: "block",
                    flex: "0 0 auto",
                    minHeight: "36px",
                    boxSizing: "border-box",
                    color: "#fff",
                    visibility: "visible",
                    position: "relative",
                  }}
                >
                  {item.city}, {item.country}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
