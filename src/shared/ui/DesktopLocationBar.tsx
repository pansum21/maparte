import { useState } from "react";
import { usePosterContext } from "@/features/poster/ui/PosterContext";
import { useFormHandlers } from "@/features/poster/application/useFormHandlers";
import { useLocationAutocomplete } from "@/features/location/application/useLocationAutocomplete";
import { useCurrentLocation } from "@/features/location/application/useCurrentLocation";
import { useRecentLocations } from "@/features/location/application/useRecentLocations";
import LocationSuggestionsDropdown from "@/features/location/ui/LocationSuggestionsDropdown";
import { useMapSync } from "@/features/map/application/useMapSync";
import {
  PLACEHOLDER_LOCATION_SEARCH,
  PLACEHOLDER_EXAMPLE_LATITUDE,
  PLACEHOLDER_EXAMPLE_LONGITUDE,
} from "@/features/location/ui/constants";
import { type SearchResult, resolveTargetDistance } from "@/features/location/domain/types";
import { POPULAR_CITIES, type PopularCity } from "@/features/location/domain/popularCities";
import { MyLocationIcon, LocationIcon, SearchIcon } from "@/shared/ui/Icons";

/**
 * Desktop floating location bar.
 * Renders a pill-shaped search row with a search icon on the left,
 * a coords-toggle pin button, and a GPS button on the right.
 * Clicking the pin icon shows/hides the lat/lon coordinate fields.
 */
export default function DesktopLocationBar() {
  const { state, dispatch, mapRef } = usePosterContext();
  const {
    handleChange,
    handleLocationSelect: handleLocationSelectBase,
    handleClearLocation,
    setLocationFocused,
  } = useFormHandlers();
  const { locationSuggestions, isLocationSearching, searchNow } = useLocationAutocomplete(
    state.form.location,
    state.isLocationFocused,
  );
  const { flyToLocation } = useMapSync(state, dispatch, mapRef);
  const { handleUseCurrentLocation, isLocatingUser, locationPermissionMessage } =
    useCurrentLocation(flyToLocation);
  const { recent, removeRecent, clearRecent } = useRecentLocations();

  const [showCoords, setShowCoords] = useState(false);

  const hasLocationValue = state.form.location.trim().length > 0;

  const onLocationSelect = (location: SearchResult) => {
    const targetDist = resolveTargetDistance(location);
    handleLocationSelectBase(location);
    dispatch({
      type: "SET_FORM_FIELDS",
      fields: {
        distance: String(targetDist),
        latitude: location.lat.toFixed(6),
        longitude: location.lon.toFixed(6),
        location: location.label,
        displayCity: location.city || location.label.split(",")[0].trim(),
        displayCountry: location.country || "",
        displayContinent: location.continent || "",
      },
    });
    flyToLocation(location.lat, location.lon, false, targetDist);
  };

  const onPopularCityClick = (city: PopularCity) => {
    const fullLabel = `${city.name}, ${city.country}`;
    const targetDist = 4900;
    const searchResult: SearchResult = {
      id: `popular:${city.id}`,
      label: fullLabel,
      city: city.name,
      country: city.country,
      continent: city.continent,
      lat: city.lat,
      lon: city.lon,
    };
    handleLocationSelectBase(searchResult);
    dispatch({
      type: "SET_FORM_FIELDS",
      resetDisplayNameOverrides: true,
      fields: {
        distance: String(targetDist),
        location: fullLabel,
        latitude: city.lat.toFixed(6),
        longitude: city.lon.toFixed(6),
        displayCity: city.name,
        displayCountry: city.country,
        displayContinent: city.continent,
      },
    });
    flyToLocation(city.lat, city.lon, false, targetDist);
  };

  const blurTimerRef = useState<{ id?: number }>({})[0];

  const handleSearchTrigger = async () => {
    const val = state.form.location.trim();
    if (!val) return;
    let results = await searchNow(val);
    if ((!results || results.length === 0) && val.includes(",")) {
      const firstPart = val.split(",")[0].trim();
      if (firstPart) {
        results = await searchNow(firstPart);
      }
    }
    if (results && results.length > 0) {
      onLocationSelect(results[0]);
    }
  };

  return (
    <div className={`dsk-loc-bar${showCoords ? " show-coords" : ""}`}>
      <div className="location-autocomplete">
        <div className="location-search-stack">
          <div className="location-search-main-row">
            <div className="location-search-row">
              <button
                type="button"
                className="location-search-btn"
                title="Search location"
                aria-label="Search location"
                onClick={handleSearchTrigger}
              >
                <SearchIcon />
              </button>
              <div className="location-input-wrap">
                <input
                  className="form-control-tall"
                  name="location"
                  value={state.form.location}
                  onChange={handleChange}
                  onFocus={() => {
                    if (blurTimerRef.id) window.clearTimeout(blurTimerRef.id);
                    setLocationFocused(true);
                  }}
                  onBlur={() => {
                    blurTimerRef.id = window.setTimeout(() => {
                      setLocationFocused(false);
                    }, 220);
                  }}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      await handleSearchTrigger();
                    }
                  }}
                  placeholder={PLACEHOLDER_LOCATION_SEARCH}
                  aria-label="Search for a town, city, address, coordinates, or Google Maps link; press Enter or select search to search"
                  autoComplete="off"
                />
                {hasLocationValue ? (
                  <button
                    type="button"
                    className="location-clear-btn"
                    aria-label="Clear location"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleClearLocation}
                  >
                    x
                  </button>
                ) : null}
              </div>
            </div>

            <div className="location-search-icons">
            <button
              type="button"
              className={`icon-only-btn location-row-icon-btn${isLocatingUser ? " is-locating" : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleUseCurrentLocation}
              disabled={isLocatingUser}
              aria-label="Use current location"
              title="Use current location"
            >
              <MyLocationIcon className="location-current-icon" />
            </button>
            <button
              type="button"
              className={`icon-only-btn location-row-icon-btn${showCoords ? " is-active" : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowCoords((v) => !v)}
              aria-label="Toggle coordinate fields"
              title="Show/hide lat & lon"
            >
              <LocationIcon />
            </button>
            </div>
          </div>

          <LocationSuggestionsDropdown
            query={state.form.location}
            isFocused={state.isLocationFocused}
            suggestions={locationSuggestions}
            isSearching={isLocationSearching}
            onSelect={onLocationSelect}
            recent={recent}
            onRecentSelect={onLocationSelect}
            onRecentRemove={removeRecent}
            onClearRecent={clearRecent}
          />
        </div>

        <div className="popular-cities-bar" role="toolbar" aria-label="Quick city suggestions">
          <span className="popular-cities-label">Quick:</span>
          <div className="popular-cities-list">
            {POPULAR_CITIES.map((city) => (
              <button
                key={city.id}
                type="button"
                className="popular-city-pill"
                onClick={() => onPopularCityClick(city)}
                title={`Explore ${city.name}, ${city.country}`}
              >
                <span className="popular-city-flag">{city.flag}</span>
                <span className="popular-city-name">{city.name}</span>
              </button>
            ))}
          </div>
        </div>

        {locationPermissionMessage ? (
          <p className="location-permission-message">{locationPermissionMessage}</p>
        ) : null}

        <div className="dsk-loc-coords">
          <label>
            Latitude
            <input
              className="form-control-tall"
              name="latitude"
              value={state.form.latitude}
              onChange={handleChange}
              placeholder={PLACEHOLDER_EXAMPLE_LATITUDE}
            />
          </label>
          <label>
            Longitude
            <input
              className="form-control-tall"
              name="longitude"
              value={state.form.longitude}
              onChange={handleChange}
              placeholder={PLACEHOLDER_EXAMPLE_LONGITUDE}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
