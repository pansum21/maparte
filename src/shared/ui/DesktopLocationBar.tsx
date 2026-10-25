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
import type { SearchResult } from "@/features/location/domain/types";
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
    handleLocationSelectBase(location);
    flyToLocation(location.lat, location.lon);
  };

  const onPopularCityClick = (city: PopularCity) => {
    const fullLabel = `${city.name}, ${city.country}`;
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
        location: fullLabel,
        latitude: city.lat.toFixed(6),
        longitude: city.lon.toFixed(6),
        displayCity: city.name,
        displayCountry: city.country,
        displayContinent: city.continent,
      },
    });
    flyToLocation(city.lat, city.lon);
  };

  return (
    <div className={`dsk-loc-bar${showCoords ? " show-coords" : ""}`}>
      <div className="location-autocomplete">
        <div className="location-search-stack">
          <div className="location-search-main-row">
            <div className="location-search-row">
              <span className="location-search-icon" aria-hidden="true">
                <SearchIcon />
              </span>
              <div className="location-input-wrap">
                <input
                  className="form-control-tall"
                  name="location"
                  value={state.form.location}
                  onChange={handleChange}
                  onFocus={() => setLocationFocused(true)}
                  onBlur={() => setLocationFocused(false)}
                  onKeyDown={async (e) => { if (e.key === "Enter") { const results = await searchNow(e.currentTarget.value); if (results && results.length > 0 && results[0].fromGoogleMaps) { onLocationSelect(results[0]); } } }}
                  placeholder={PLACEHOLDER_LOCATION_SEARCH}
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
