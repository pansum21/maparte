import { useState } from "react";
import { usePosterContext } from "@/features/poster/ui/PosterContext";
import { useFormHandlers } from "@/features/poster/application/useFormHandlers";
import { useLocationAutocomplete } from "@/features/location/application/useLocationAutocomplete";
import { useCurrentLocation } from "@/features/location/application/useCurrentLocation";
import { useRecentLocations } from "@/features/location/application/useRecentLocations";
import { useMapSync } from "@/features/map/application/useMapSync";
import LocationSuggestionsDropdown from "@/features/location/ui/LocationSuggestionsDropdown";
import {
  POPULAR_CITIES,
  type PopularCity,
} from "@/features/location/domain/popularCities";
import type { SearchResult } from "@/features/location/domain/types";
import {
  PLACEHOLDER_LOCATION_SEARCH,
  PLACEHOLDER_EXAMPLE_LATITUDE,
  PLACEHOLDER_EXAMPLE_LONGITUDE,
} from "@/features/location/ui/constants";
import {
  LocationIcon,
  ThemeIcon,
  LayoutIcon,
  FrameIcon,
  LayersIcon,
  MarkersIcon,
  RouteIcon,
  StyleIcon,
  SettingsIcon,
  SparklesIcon,
  SearchIcon,
  MyLocationIcon,
  WallIcon,
  ScissorsIcon,
} from "./Icons";
import type { MobileTab } from "./MobileNavBar";

export interface DesktopNavBarProps {
  activeTab: MobileTab;
  panelOpen: boolean;
  onTabChange: (tab: MobileTab) => void;
  isLocationVisible: boolean;
  onLocationToggle: () => void;
  onSettingsClick?: () => void;
  onToggleCinema?: () => void;
  onOpenAllCities?: () => void;
  onOpenWall?: () => void;
}

export default function DesktopNavBar({
  activeTab,
  panelOpen,
  onTabChange,
  isLocationVisible,
  onLocationToggle,
  onSettingsClick,
  onToggleCinema,
  onOpenAllCities,
  onOpenWall,
}: DesktopNavBarProps) {
  const { state, dispatch, mapRef } = usePosterContext();
  const {
    handleChange,
    handleLocationSelect: handleLocationSelectBase,
    handleClearLocation,
    setLocationFocused,
  } = useFormHandlers();
  const { flyToLocation } = useMapSync(state, dispatch, mapRef);
  const { locationSuggestions, isLocationSearching, searchNow } =
    useLocationAutocomplete(state.form.location, state.isLocationFocused);
  const {
    handleUseCurrentLocation,
    isLocatingUser,
    locationPermissionMessage,
  } = useCurrentLocation(flyToLocation);
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
    <nav
      className={`desktop-nav-bar${panelOpen ? " has-panel-open" : ""}${isLocationVisible ? " is-location-open" : ""}`}
      data-active-tab={activeTab}
      aria-label="Settings and Quick Actions"
    >
      {/* ── 1. LOCATION ROW ── */}
      <div className="desktop-nav-row" data-tab="location">
        <button
          type="button"
          className={`desktop-nav-tab${isLocationVisible ? " is-active" : ""}`}
          onClick={onLocationToggle}
          title="Location Search & Coordinates"
          aria-label="Location"
          aria-pressed={isLocationVisible}
        >
          <LocationIcon className="desktop-nav-icon" />
          <span className="desktop-nav-label">Location</span>
        </button>

        <div className="desktop-nav-companion desktop-companion-location">
          <div className="location-search-main-row">
            <div className="location-search-box">
              <span className="location-search-icon" aria-hidden="true">
                <SearchIcon />
              </span>
              <input
                className="desktop-search-input"
                name="location"
                value={state.form.location}
                onChange={handleChange}
                onFocus={() => setLocationFocused(true)}
                onBlur={() => setLocationFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void searchNow(e.currentTarget.value);
                }}
                placeholder={PLACEHOLDER_LOCATION_SEARCH}
                autoComplete="off"
              />
              {hasLocationValue ? (
                <button
                  type="button"
                  className="desktop-search-clear-btn"
                  aria-label="Clear location"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleClearLocation}
                >
                  ✕
                </button>
              ) : null}
            </div>

            <div className="location-search-actions">
              <button
                type="button"
                className={`location-action-btn${isLocatingUser ? " is-locating" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleUseCurrentLocation}
                disabled={isLocatingUser}
                aria-label="Use current GPS location"
                title="Use current GPS location"
              >
                <MyLocationIcon className="location-current-icon" />
              </button>
              <button
                type="button"
                className={`location-action-btn${showCoords ? " is-active" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowCoords((v) => !v)}
                aria-label="Toggle coordinate fields"
                title="Show/hide Latitude & Longitude"
              >
                <LocationIcon />
              </button>
            </div>

            {showCoords ? (
              <div className="desktop-horizontal-coords">
                <label>
                  Lat:
                  <input
                    name="latitude"
                    value={state.form.latitude}
                    onChange={handleChange}
                    placeholder={PLACEHOLDER_EXAMPLE_LATITUDE}
                  />
                </label>
                <label>
                  Lon:
                  <input
                    name="longitude"
                    value={state.form.longitude}
                    onChange={handleChange}
                    placeholder={PLACEHOLDER_EXAMPLE_LONGITUDE}
                  />
                </label>
              </div>
            ) : null}
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

          {locationPermissionMessage ? (
            <p className="location-permission-message">{locationPermissionMessage}</p>
          ) : null}
        </div>

        <div className="desktop-nav-companion desktop-companion-presets">
          <div className="desktop-quick-cities-strip">
            {POPULAR_CITIES.slice(0, 3).map((city) => (
              <button
                key={city.id}
                type="button"
                className="desktop-quick-city-pill"
                onClick={() => onPopularCityClick(city)}
                title={`Explore ${city.name}, ${city.country}`}
              >
                <span className="city-pill-flag">{city.flag}</span>
                <span className="city-pill-name">{city.name}</span>
              </button>
            ))}

            <button
              type="button"
              className="desktop-quick-city-pill desktop-all-cities-btn"
              onClick={onOpenAllCities}
              title="Explore Top 100 World Cities across 6 continents"
            >
              <span className="plus-icon-badge">➕</span>
              <span className="all-cities-text">100 Cities</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. EDIT MAP ROW ── */}
      <div className="desktop-nav-row" data-tab="edit-map">
        <button
          type="button"
          className={`desktop-nav-tab${panelOpen && activeTab === "edit-map" ? " is-active" : ""}`}
          onClick={() => onTabChange("edit-map")}
          title="Edit Map and Recenter"
          aria-label="Edit Map"
        >
          <ScissorsIcon className="desktop-nav-icon" />
          <span className="desktop-nav-label">Edit Map</span>
        </button>
      </div>

      {/* ── 3. THEME ROW (Theme + Wall Color) ── */}
      <div className="desktop-nav-row" data-tab="theme">
        <button
          type="button"
          className={`desktop-nav-tab${panelOpen && activeTab === "theme" ? " is-active" : ""}`}
          onClick={() => onTabChange("theme")}
          title="Themes & Color Palettes"
          aria-label="Theme"
        >
          <ThemeIcon className="desktop-nav-icon" />
          <span className="desktop-nav-label">Theme</span>
        </button>

      </div>

      <div className="desktop-nav-row desktop-nav-row--wall" data-tab="wall">
        <button
          type="button"
          className="desktop-nav-tab"
          onClick={onOpenWall}
          title="Change only the wall panel behind the poster"
          aria-label="Wall color"
        >
          <WallIcon className="desktop-nav-icon" />
          <span className="desktop-nav-label">Wall</span>
        </button>
      </div>

      {/* ── 4. LAYOUT ROW (Layout + Edit Map) ── */}
      <div className="desktop-nav-row" data-tab="layout">
        <button
          type="button"
          className={`desktop-nav-tab${panelOpen && activeTab === "layout" ? " is-active" : ""}`}
          onClick={() => onTabChange("layout")}
          title="Poster Layouts & Dimensions"
          aria-label="Layout"
        >
          <LayoutIcon className="desktop-nav-icon" />
          <span className="desktop-nav-label">Layout</span>
        </button>

      </div>

      <div className="desktop-nav-row" data-tab="frames">
        <button
          type="button"
          className={`desktop-nav-tab${panelOpen && activeTab === "frames" ? " is-active" : ""}`}
          onClick={() => onTabChange("frames")}
          title="Map Border Lines"
          aria-label="Border"
        >
          <FrameIcon className="desktop-nav-icon" />
          <span className="desktop-nav-label">Border</span>
        </button>
      </div>

      <div className="desktop-nav-row" data-tab="templates">
        <button
          type="button"
          className={`desktop-nav-tab${panelOpen && activeTab === "templates" ? " is-active" : ""}`}
          onClick={() => onTabChange("templates")}
          title="Preset styles"
          aria-label="Presets"
        >
          <SparklesIcon className="desktop-nav-icon" />
          <span className="desktop-nav-label">Presets</span>
        </button>
      </div>

      {/* ── 5. TEXT ROW ── */}
      <div className="desktop-nav-row" data-tab="style">
        <button
          type="button"
          className={`desktop-nav-tab${panelOpen && activeTab === "style" ? " is-active" : ""}`}
          onClick={() => onTabChange("style")}
          title="Poster Text and Typography"
          aria-label="Text"
        >
          <StyleIcon className="desktop-nav-icon" />
          <span className="desktop-nav-label">Text</span>
        </button>
      </div>

      {/* ── 6. LAYERS ROW ── */}
      <div className="desktop-nav-row" data-tab="layers">
        <button
          type="button"
          className={`desktop-nav-tab${panelOpen && activeTab === "layers" ? " is-active" : ""}`}
          onClick={() => onTabChange("layers")}
          title="Map Layer Filters (Roads, Water, Parks)"
          aria-label="Layers"
        >
          <LayersIcon className="desktop-nav-icon" />
          <span className="desktop-nav-label">Layers</span>
        </button>

      </div>

      {/* ── 7. MARKERS ROW ── */}
      <div className="desktop-nav-row" data-tab="markers">
        <button
          type="button"
          className={`desktop-nav-tab${panelOpen && activeTab === "markers" ? " is-active" : ""}`}
          onClick={() => onTabChange("markers")}
          title="Custom Map Markers"
          aria-label="Markers"
        >
          <MarkersIcon className="desktop-nav-icon" />
          <span className="desktop-nav-label">Markers</span>
        </button>
      </div>

      {/* ── 8. ROUTES ROW ── */}
      <div className="desktop-nav-row" data-tab="routes">
        <button
          type="button"
          className={`desktop-nav-tab${panelOpen && activeTab === "routes" ? " is-active" : ""}`}
          onClick={() => onTabChange("routes")}
          title="Travel Routes & GPX Tracks"
          aria-label="Routes"
        >
          <RouteIcon className="desktop-nav-icon" />
          <span className="desktop-nav-label">Routes</span>
        </button>
      </div>

      {/* Full Screen is the last editor action before Settings. */}
      <div className="desktop-nav-row desktop-nav-row--fullscreen" data-tab="fullscreen">
        <button
          type="button"
          className="desktop-nav-tab desktop-nav-tab--fullscreen"
          onClick={onToggleCinema}
          title="Open Full Screen preview"
          aria-label="Full Screen"
        >
          <span className="desktop-nav-icon" aria-hidden="true">▣</span>
          <span className="desktop-nav-label">Full Screen</span>
        </button>
      </div>

      {/* ── 9. SETTINGS TAB ── */}
      <div className="desktop-nav-row desktop-nav-row--settings" data-tab="settings">
        <button
          type="button"
          className="desktop-nav-tab desktop-nav-tab--settings"
          aria-label="Settings & Tools"
          title="Settings & Tools"
          onClick={onSettingsClick}
        >
          <SettingsIcon className="desktop-nav-icon" />
          <span className="desktop-nav-label">Settings</span>
        </button>
      </div>
    </nav>
  );
}
