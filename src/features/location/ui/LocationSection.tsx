import type { SearchResult } from "../domain/types";
import type { PosterForm } from "@/features/poster/application/posterReducer";
import { useRecentLocations } from "../application/useRecentLocations";
import LocationSuggestionsDropdown from "./LocationSuggestionsDropdown";
import {
  PLACEHOLDER_LOCATION_SEARCH,
  PLACEHOLDER_EXAMPLE_LATITUDE,
  PLACEHOLDER_EXAMPLE_LONGITUDE,
} from "./constants";
import { MyLocationIcon } from "@/shared/ui/Icons";
import { POPULAR_CITIES } from "../domain/popularCities";

interface LocationSectionProps {
  form: PosterForm;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onLocationFocus: () => void;
  onLocationBlur: () => void;
  searchNow: (query: string) => Promise<SearchResult[] | void>;
  isLocationFocused: boolean;
  locationSuggestions: SearchResult[];
  isLocationSearching: boolean;
  onLocationSelect: (suggestion: SearchResult) => void;
  onClearLocation: () => void;
  onUseCurrentLocation: () => void;
  isLocatingUser: boolean;
  locationPermissionMessage: string;
}

export default function LocationSection({
  form,
  onChange,
  onLocationFocus,
  onLocationBlur,
  searchNow,
  isLocationFocused,
  locationSuggestions,
  isLocationSearching,
  onLocationSelect,
  onClearLocation,
  onUseCurrentLocation,
  isLocatingUser,
  locationPermissionMessage,
}: LocationSectionProps) {
  const { recent, removeRecent, clearRecent } = useRecentLocations();
  const hasLocationValue = form.location.trim().length > 0;
  const handleQuickCitySelect = (city: (typeof POPULAR_CITIES)[number]) => onLocationSelect({
    id: `popular:${city.id}`,
    label: `${city.name}, ${city.country}`,
    city: city.name,
    country: city.country,
    continent: city.continent,
    lat: city.lat,
    lon: city.lon,
  });

  return (
    <section className="panel-block">
      <h2>Location</h2>
      <label>
        Location
        <div className="location-autocomplete">
          <div className="location-search-row">
            <div className="location-input-wrap">
              <input
                className="form-control-tall"
                name="location"
                value={form.location}
                onChange={onChange}
                onFocus={onLocationFocus}
                onBlur={onLocationBlur}
                onKeyDown={async (e) => { if (e.key === "Enter") { const results = await searchNow(e.currentTarget.value); if (Array.isArray(results) && results.length > 0 && results[0].fromGoogleMaps) { onLocationSelect(results[0]); } } }}
                placeholder={PLACEHOLDER_LOCATION_SEARCH}
                autoComplete="off"
              />
              {hasLocationValue ? (
                <button
                  type="button"
                  className="location-clear-btn"
                  aria-label="Clear location"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={onClearLocation}
                >
                  x
                </button>
              ) : null}
            </div>
            <button
              type="button"
              className="location-current-btn"
              onMouseDown={(event) => event.preventDefault()}
              onClick={onUseCurrentLocation}
              disabled={isLocatingUser}
              aria-label="Use current location"
              title="Use current location"
            >
              <MyLocationIcon />
            </button>
          </div>
          <LocationSuggestionsDropdown
            query={form.location}
            isFocused={isLocationFocused}
            suggestions={locationSuggestions}
            isSearching={isLocationSearching}
            onSelect={onLocationSelect}
            recent={recent}
            onRecentSelect={onLocationSelect}
            onRecentRemove={removeRecent}
            onClearRecent={clearRecent}
          />
          <div className="location-panel-quick-cities" role="toolbar" aria-label="Quick city suggestions">
            <span className="location-panel-quick-label">Quick cities</span>
            <div className="location-panel-quick-list">
              {POPULAR_CITIES.map((city) => <button key={city.id} type="button" className="location-panel-city" data-city-name={city.name}
                onClick={() => handleQuickCitySelect(city)} title={`Explore ${city.name}, ${city.country}`}>
                <span aria-hidden="true">{city.flag}</span><span>{city.name}</span>
              </button>)}
            </div>
          </div>
          {locationPermissionMessage ? (
            <p className="location-permission-message">
              {locationPermissionMessage}
            </p>
          ) : null}
        </div>
      </label>
      <div className="field-grid keep-two-mobile">
        <label>
          Latitude (optional)
          <input
            className="form-control-tall"
            name="latitude"
            value={form.latitude}
            onChange={onChange}
            placeholder={PLACEHOLDER_EXAMPLE_LATITUDE}
          />
        </label>
        <label>
          Longitude (optional)
          <input
            className="form-control-tall"
            name="longitude"
            value={form.longitude}
            onChange={onChange}
            placeholder={PLACEHOLDER_EXAMPLE_LONGITUDE}
          />
        </label>
      </div>
    </section>
  );
}
