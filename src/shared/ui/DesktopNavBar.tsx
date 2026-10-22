import { useState, useCallback } from "react";
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
} from "./Icons";
import type { MobileTab } from "./MobileNavBar";

export interface DesktopNavBarProps {
  activeTab: MobileTab;
  panelOpen: boolean;
  onTabChange: (tab: MobileTab) => void;
  isLocationVisible?: boolean;
  onLocationToggle?: () => void;
  onSettingsClick?: () => void;
  isEditing?: boolean;
  onToggleEditing?: () => void;
  onToggleCinema?: () => void;
  isPhoneWallpaper?: boolean;
  onTogglePhoneWallpaper?: () => void;
  onOpenAllCities?: () => void;
}

export default function DesktopNavBar({
  activeTab,
  panelOpen,
  onTabChange,
  onSettingsClick,
  isEditing = false,
  onToggleEditing,
  onToggleCinema,
  isPhoneWallpaper = false,
  onTogglePhoneWallpaper,
  onOpenAllCities,
}: DesktopNavBarProps) {
  const { state, dispatch, mapRef } = usePosterContext();
  const { form } = state;
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

  // Recenter map to city coordinates
  const handleRecenter = useCallback(() => {
    const lat = Number.parseFloat(form.latitude);
    const lon = Number.parseFloat(form.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    flyToLocation(lat, lon, true);
  }, [form.latitude, form.longitude, flyToLocation]);

  // Zoom helpers when map editing is active
  const handleZoomIn = useCallback(() => {
    const map = mapRef.current;
    if (map) map.zoomTo(map.getZoom() + 0.5, { duration: 300 });
  }, [mapRef]);

  const handleZoomOut = useCallback(() => {
    const map = mapRef.current;
    if (map) map.zoomTo(map.getZoom() - 0.5, { duration: 300 });
  }, [mapRef]);

  return (
    <nav
      className={`desktop-nav-bar${panelOpen ? " has-panel-open" : ""}`}
      aria-label="Settings and Quick Actions"
    >
      {/* ── 1. LOCATION ROW ── */}
      <div className="desktop-nav-row" data-tab="location">
        <button
          type="button"
          className={`desktop-nav-tab${panelOpen && activeTab === "location" ? " is-active" : ""}`}
          onClick={() => onTabChange("location")}
          title="Location Search & Coordinates"
          aria-label="Location"
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
      </div>

      {/* ── 2. PRESETS ROW (Quick cities + ➕ 81 World Cities) ── */}
      <div className="desktop-nav-row" data-tab="templates">
        <button
          type="button"
          className={`desktop-nav-tab${panelOpen && activeTab === "templates" ? " is-active" : ""}`}
          onClick={() => onTabChange("templates")}
          title="Presets & Styles"
          aria-label="Presets"
        >
          <SparklesIcon className="desktop-nav-icon" />
          <span className="desktop-nav-label">Presets</span>
        </button>

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

      {/* ── 3. THEME ROW (Theme + Recenter Map) ── */}
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

        <div className="desktop-nav-companion">
          <button
            type="button"
            className="desktop-quick-action-btn"
            onClick={handleRecenter}
            title="Recenter Map View to City Coordinates"
          >
            <span className="quick-action-icon">⛶</span>
            <span className="quick-action-text">Recenter</span>
          </button>
        </div>
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

        <div className="desktop-nav-companion">
          <div className="desktop-edit-map-group">
            <button
              type="button"
              className={`desktop-quick-action-btn${isEditing ? " is-active" : ""}`}
              onClick={onToggleEditing}
              title={
                isEditing
                  ? "Finish editing map view"
                  : "Unlock map to pan, drag and zoom"
              }
            >
              <span className="quick-action-icon">{isEditing ? "🔒" : "🔓"}</span>
              <span className="quick-action-text">
                {isEditing ? "Lock Map" : "Edit Map"}
              </span>
            </button>

            {isEditing ? (
              <div className="desktop-quick-zoom-group">
                <button
                  type="button"
                  className="quick-zoom-btn"
                  onClick={handleZoomIn}
                  title="Zoom in"
                >
                  ➕
                </button>
                <button
                  type="button"
                  className="quick-zoom-btn"
                  onClick={handleZoomOut}
                  title="Zoom out"
                >
                  ➖
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="desktop-nav-row" data-tab="frames">
        <button
          type="button"
          className={`desktop-nav-tab${panelOpen && activeTab === "frames" ? " is-active" : ""}`}
          onClick={() => onTabChange("frames")}
          title="Inner Border Lines"
          aria-label="Frame and Border"
        >
          <FrameIcon className="desktop-nav-icon" />
          <span className="desktop-nav-label">Frame & Border</span>
        </button>
      </div>

      {/* ── 5. STYLE ROW (Style / Text + Full Screen / Canvas View) ── */}
      <div className="desktop-nav-row" data-tab="style">
        <button
          type="button"
          className={`desktop-nav-tab${panelOpen && activeTab === "style" ? " is-active" : ""}`}
          onClick={() => onTabChange("style")}
          title="Typography, Margins & Frame Styles"
          aria-label="Style"
        >
          <StyleIcon className="desktop-nav-icon" />
          <span className="desktop-nav-label">Style</span>
        </button>

        <div className="desktop-nav-companion">
          <button
            type="button"
            className="desktop-quick-action-btn desktop-quick-action-cinema"
            onClick={onToggleCinema}
            title="Fullscreen Wall Preview & Living Room View (64 Walls, Custom Colors & Frames • Press Esc to exit)"
          >
            <span className="quick-action-icon">🖼️</span>
            <span className="quick-action-text">Full Screen</span>
          </button>
        </div>
      </div>

      {/* ── 6. LAYERS ROW (Layers + Phone Wallpaper / Poster Toggle) ── */}
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

        <div className="desktop-nav-companion">
          <button
            type="button"
            className={`desktop-quick-action-btn desktop-quick-action-wallpaper${isPhoneWallpaper ? " is-wallpaper" : ""}`}
            onClick={onTogglePhoneWallpaper}
            title={
              isPhoneWallpaper
                ? "Switch back to standard A4 print poster"
                : "Switch to 9:16 vertical smartphone wallpaper layout"
            }
          >
            <span className="quick-action-icon">{isPhoneWallpaper ? "🖼️" : "📱"}</span>
            <span className="quick-action-text">
              {isPhoneWallpaper ? "Poster View" : "Phone Wallpaper"}
            </span>
          </button>
        </div>
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
