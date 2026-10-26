import { useState, useEffect, useRef } from "react";
import { usePosterContext } from "@/features/poster/ui/PosterContext";
import { useMapSync } from "@/features/map/application/useMapSync";
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
  WallIcon,
  ScissorsIcon,
  RotateIcon,
  FullScreenIcon,
} from "./Icons";
import type { MobileTab } from "./MobileNavBar";

export interface DesktopNavBarProps {
  activeTab: MobileTab;
  panelOpen: boolean;
  onTabChange: (tab: MobileTab) => void;
  isLocationVisible: boolean;
  allCitiesOpen?: boolean;
  onLocationToggle: () => void;
  onSettingsClick?: () => void;
  onToggleCinema?: () => void;
  onOpenAllCities?: () => void;
  onOpenWall?: () => void;
  wallOpen?: boolean;
  isEditing?: boolean;
  onEditMapToggle?: () => void;
}

export default function DesktopNavBar({
  activeTab,
  panelOpen,
  onTabChange,
  isLocationVisible,
  allCitiesOpen = false,
  onLocationToggle,
  onSettingsClick,
  onToggleCinema,
  onOpenAllCities: _onOpenAllCities,
  onOpenWall,
  wallOpen = false,
  isEditing = false,
  onEditMapToggle,
}: DesktopNavBarProps) {
  const { state, dispatch, mapRef } = usePosterContext();
  const { flyToLocation } = useMapSync(state, dispatch, mapRef);

  const [bearing, setBearing] = useState(0);
  const searchedLocationRef = useRef<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    if (
      state.selectedLocation &&
      typeof state.selectedLocation.lat === "number" &&
      typeof state.selectedLocation.lon === "number" &&
      Number.isFinite(state.selectedLocation.lat) &&
      Number.isFinite(state.selectedLocation.lon)
    ) {
      searchedLocationRef.current = {
        lat: state.selectedLocation.lat,
        lon: state.selectedLocation.lon,
      };
    } else if (!searchedLocationRef.current) {
      const lat = Number.parseFloat(state.form.latitude);
      const lon = Number.parseFloat(state.form.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        searchedLocationRef.current = { lat, lon };
      }
    }
  }, [state.selectedLocation, state.form.latitude, state.form.longitude]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const syncBearing = () => {
      const b = map.getBearing();
      const norm = Math.round(((b % 360) + 360) % 360);
      setBearing((prev) => (prev === 360 && norm === 0 ? 360 : norm));
    };

    syncBearing();
    map.on("rotate", syncBearing);
    return () => {
      map.off("rotate", syncBearing);
    };
  }, [mapRef, isEditing]);

  const handleBearingChange = (newBearing: number) => {
    const map = mapRef.current;
    const clamped = Math.max(0, Math.min(360, newBearing));
    setBearing(clamped);
    if (!map) return;
    map.setBearing(clamped === 360 ? 0 : clamped);
  };

  const handleSnap0 = () => {
    const map = mapRef.current;
    setBearing(0);
    if (map) {
      map.setBearing(0);
    }
  };

  const handleSnap360 = () => {
    const map = mapRef.current;
    setBearing(360);
    if (map) {
      map.setBearing(0);
    }
  };

  const handleResetRotation = () => {
    const map = mapRef.current;
    setBearing(0);
    if (map) {
      map.rotateTo(0, { duration: 300 });
    }
  };

  const handleZoomIn = () => {
    const map = mapRef.current;
    if (map) map.zoomTo(map.getZoom() + 0.5, { duration: 250 });
  };

  const handleZoomOut = () => {
    const map = mapRef.current;
    if (map) map.zoomTo(map.getZoom() - 0.5, { duration: 250 });
  };

  const handleRecenter = () => {
    const target = searchedLocationRef.current ?? {
      lat: Number.parseFloat(state.form.latitude),
      lon: Number.parseFloat(state.form.longitude),
    };
    if (Number.isFinite(target.lat) && Number.isFinite(target.lon)) {
      flyToLocation(target.lat, target.lon, false);
      dispatch({
        type: "SET_FORM_FIELDS",
        fields: {
          latitude: target.lat.toFixed(6),
          longitude: target.lon.toFixed(6),
        },
      });
    }
  };

  const isLocationActive = Boolean(isLocationVisible || allCitiesOpen);

  return (
    <nav
      className={`desktop-nav-bar${panelOpen ? " has-panel-open" : ""}${isLocationActive ? " is-location-open" : ""}`}
      data-active-tab={activeTab}
      aria-label="Settings and Quick Actions"
    >
      {/* ── 1. LOCATION ROW ── */}
      <div className="desktop-nav-row" data-tab="location">
        <button
          type="button"
          className={`desktop-nav-tab${isLocationActive ? " is-active" : ""}`}
          onClick={onLocationToggle}
          title="Location Search & Top 100 Cities"
          aria-label="Location"
          aria-pressed={isLocationActive}
        >
          <LocationIcon className="desktop-nav-icon" />
          <span className="desktop-nav-label">Location</span>
        </button>
      </div>

      {/* ── 2. EDIT MAP ROW ── */}
      <div className="desktop-nav-row" data-tab="edit-map">
        <button
          type="button"
          className={`desktop-nav-tab${isEditing ? " is-active" : ""}`}
          onClick={onEditMapToggle}
          title={isEditing ? "Finish editing map & lock position" : "Unlock map editing & rotation"}
          aria-label="Edit Map"
          aria-pressed={isEditing}
        >
          <ScissorsIcon className="desktop-nav-icon" />
          <span className="desktop-nav-label">Edit Map</span>
        </button>

        {isEditing ? (
          <div
            className="desktop-nav-companion desktop-companion-edit-map"
            role="toolbar"
            aria-label="Map editing and rotation controls"
          >
            <div className="edit-map-companion-panel">
              <div className="edit-map-top-row">
                <span className="edit-map-title">ROTATION</span>

                <div className="edit-map-top-actions">
                  <button
                    type="button"
                    className="edit-map-action-pill edit-map-action-pill--reset"
                    onClick={handleResetRotation}
                    title="Reset rotation to North (0°)"
                  >
                    <RotateIcon className="edit-map-action-icon" />
                    <span>Reset 0°</span>
                  </button>

                  <button
                    type="button"
                    className="edit-map-action-pill edit-map-action-pill--recenter"
                    onClick={handleRecenter}
                    title="Recenter map to city coordinates"
                  >
                    <span className="edit-map-action-glyph">⛶</span>
                    <span>Recenter</span>
                  </button>

                  <div className="edit-map-zoom-group" aria-label="Map zoom controls">
                    <button
                      type="button"
                      className="edit-map-zoom-btn"
                      onClick={handleZoomIn}
                      title="Zoom in"
                      aria-label="Zoom in"
                    >
                      ➕
                    </button>
                    <button
                      type="button"
                      className="edit-map-zoom-btn"
                      onClick={handleZoomOut}
                      title="Zoom out"
                      aria-label="Zoom out"
                    >
                      ➖
                    </button>
                  </div>
                </div>
              </div>

              <div className="edit-map-slider-row">
                <button
                  type="button"
                  className="edit-map-angle-box edit-map-angle-box--left"
                  onClick={handleSnap0}
                  title="Click to reset rotation to 0°"
                  aria-label={`Current map rotation: ${bearing} degrees (click to reset to 0)`}
                >
                  {bearing}°
                </button>

                <input
                  type="range"
                  className="edit-map-rotation-slider"
                  min="0"
                  max="360"
                  step="1"
                  value={bearing}
                  onChange={(e) => handleBearingChange(Number(e.target.value))}
                  aria-label="Map rotation slider"
                />

                <button
                  type="button"
                  className="edit-map-angle-box edit-map-angle-box--right"
                  onClick={handleSnap360}
                  title="Click to snap to 360°"
                  aria-label={`Remaining rotation angle: ${360 - bearing} degrees (click to snap to 360)`}
                >
                  {360 - bearing}°
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── 3. THEME ROW (Theme + Wall Color) ── */}
      <div className="desktop-nav-row" data-tab="theme">
        <button
          type="button"
          className={`desktop-nav-tab${panelOpen && activeTab === "theme" ? " is-active" : ""}`}
          aria-pressed={panelOpen && activeTab === "theme"}
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
          className={`desktop-nav-tab${wallOpen ? " is-active" : ""}`}
          onClick={onOpenWall}
          title="Change only the wall panel behind the poster"
          aria-label="Wall color"
          aria-pressed={wallOpen}
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
          aria-pressed={panelOpen && activeTab === "layout"}
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
          aria-pressed={panelOpen && activeTab === "frames"}
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
          aria-pressed={panelOpen && activeTab === "templates"}
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
          aria-pressed={panelOpen && activeTab === "style"}
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
          aria-pressed={panelOpen && activeTab === "layers"}
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
          aria-pressed={panelOpen && activeTab === "markers"}
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
          aria-pressed={panelOpen && activeTab === "routes"}
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
          <FullScreenIcon className="desktop-nav-icon" />
          <span className="desktop-nav-label">Full Screen</span>
        </button>
      </div>

      {/* ── 9. SETTINGS TAB ── */}
      <div className="desktop-nav-row desktop-nav-row--settings" data-tab="settings">
        <button
          type="button"
          className={`desktop-nav-tab desktop-nav-tab--settings${panelOpen && activeTab === "settings" ? " is-active" : ""}`}
          aria-label="Settings & Tools"
          aria-pressed={panelOpen && activeTab === "settings"}
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
