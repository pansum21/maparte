import { useState, useEffect, useRef } from "react";
import { usePosterContext } from "@/features/poster/ui/PosterContext";
import { useMapSync } from "@/features/map/application/useMapSync";
import {
  DEFAULT_DISTANCE_METERS,
  MAX_DISTANCE_METERS,
  MAX_MAP_ZOOM,
  MIN_DISTANCE_METERS,
  MIN_MAP_ZOOM,
} from "@/core/config";
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
  const [zoom, setZoom] = useState(MIN_MAP_ZOOM);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  interface SearchedLocationInfo {
    lat: number;
    lon: number;
    distance: number;
  }
  const searchedLocationRef = useRef<SearchedLocationInfo | null>(null);

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
        distance: Number.parseFloat(state.form.distance) || DEFAULT_DISTANCE_METERS,
      };
    } else if (!searchedLocationRef.current) {
      const lat = Number.parseFloat(state.form.latitude);
      const lon = Number.parseFloat(state.form.longitude);
      const distance = Number.parseFloat(state.form.distance) || DEFAULT_DISTANCE_METERS;
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        searchedLocationRef.current = { lat, lon, distance };
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

    const syncZoom = () => setZoom(map.getZoom());

    syncBearing();
    syncZoom();
    map.on("rotate", syncBearing);
    map.on("zoom", syncZoom);
    return () => {
      map.off("rotate", syncBearing);
      map.off("zoom", syncZoom);
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

  const handleResetRotation = () => {
    const map = mapRef.current;
    setBearing(0);
    if (map) {
      map.rotateTo(0, { duration: 300 });
    }
  };

  const handleZoomIn = () => {
    const map = mapRef.current;
    if (map) map.zoomTo(Math.min(MAX_MAP_ZOOM, map.getZoom() + 0.5), { duration: 250 });
  };

  const handleZoomOut = () => {
    const map = mapRef.current;
    if (map) map.zoomTo(Math.max(MIN_MAP_ZOOM, map.getZoom() - 0.5), { duration: 250 });
  };

  const handleZoomSliderChange = (value: number) => {
    const map = mapRef.current;
    if (map) map.zoomTo(value, { duration: 150 });
  };

  const distanceMeters = Math.max(
    MIN_DISTANCE_METERS,
    Math.min(MAX_DISTANCE_METERS, Number(state.form.distance) || DEFAULT_DISTANCE_METERS),
  );
  const distanceSliderValue = Math.round(
    ((Math.log(distanceMeters) - Math.log(MIN_DISTANCE_METERS)) /
      (Math.log(MAX_DISTANCE_METERS) - Math.log(MIN_DISTANCE_METERS))) * 1000,
  );
  const handleDistanceSliderChange = (value: number) => {
    const ratio = value / 1000;
    const nextDistance = Math.round(
      Math.exp(
        Math.log(MIN_DISTANCE_METERS) +
          ratio * (Math.log(MAX_DISTANCE_METERS) - Math.log(MIN_DISTANCE_METERS)),
      ),
    );
    dispatch({ type: "SET_FIELD", name: "distance", value: String(nextDistance) });
  };
  const formatDistance = (meters: number) =>
    meters >= 1_000_000
      ? `${Number((meters / 1_000_000).toFixed(1))}M m`
      : meters >= 100_000
        ? `${Number((meters / 1_000).toFixed(1))}K m`
        : `${Math.round(meters).toLocaleString()} m`;

  const handleRecenter = () => {
    const defaultDist = Number.parseFloat(state.form.distance) || DEFAULT_DISTANCE_METERS;
    const target = searchedLocationRef.current ?? {
      lat: Number.parseFloat(state.form.latitude),
      lon: Number.parseFloat(state.form.longitude),
      distance: defaultDist,
    };
    if (Number.isFinite(target.lat) && Number.isFinite(target.lon)) {
      const map = mapRef.current;
      setBearing(0);
      if (map) {
        map.setBearing(0);
        map.setPitch(0);
      }
      flyToLocation(target.lat, target.lon, false, target.distance);
      dispatch({
        type: "SET_FORM_FIELDS",
        fields: {
          latitude: target.lat.toFixed(6),
          longitude: target.lon.toFixed(6),
          distance: String(Math.round(target.distance)),
        },
      });
    }
  };

  const isLocationActive = Boolean(isLocationVisible || allCitiesOpen);

  return (
    <nav
      className={`desktop-nav-bar${panelOpen ? " has-panel-open" : ""}${isLocationActive ? " is-location-open" : ""}${isToolsOpen ? " is-tools-open" : ""}`}
      data-active-tab={activeTab}
      aria-label="Settings and Quick Actions"
    >
      <button type="button" className="desktop-tools-drawer-toggle" onClick={() => setIsToolsOpen((open) => !open)} aria-expanded={isToolsOpen} aria-label={isToolsOpen ? "Close tools" : "Open tools"}>
        <span aria-hidden="true">{isToolsOpen ? "‹" : "☰"}</span><span>{isToolsOpen ? "Close" : "Tools"}</span>
      </button>
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
            aria-label="Vertical map editing controls"
          >
            <div className="edit-map-companion-panel">
              <section className="edit-map-control-section" aria-label="Zoom">
                <span className="edit-map-title">ZOOM</span>
                <button type="button" className="edit-map-vertical-button" onClick={handleZoomIn} title="Zoom in" aria-label="Zoom in">+</button>
                <div className="edit-map-vertical-range-row">
                  <input type="range" className="edit-map-vertical-slider" min={MIN_MAP_ZOOM} max={MAX_MAP_ZOOM} step="0.1" value={zoom} onChange={(event) => handleZoomSliderChange(Number(event.target.value))} aria-label="Map zoom level" />
                  <output className="edit-map-value-box" aria-live="off">{zoom.toFixed(1)}</output>
                </div>
                <button type="button" className="edit-map-vertical-button" onClick={handleZoomOut} title="Zoom out" aria-label="Zoom out">−</button>
              </section>

              <section className="edit-map-control-section" aria-label="Distance">
                <span className="edit-map-title">DISTANCE</span>
                <div className="edit-map-vertical-range-row edit-map-vertical-range-row--distance">
                  <input type="range" className="edit-map-vertical-slider" min="0" max="1000" step="1" value={distanceSliderValue} onChange={(event) => handleDistanceSliderChange(Number(event.target.value))} aria-label="Map distance" />
                  <output className="edit-map-value-box edit-map-value-box--distance">{formatDistance(distanceMeters)}</output>
                </div>
              </section>

              <section className="edit-map-control-section" aria-label="Rotation">
                <span className="edit-map-title">ROTATION</span>
                <div className="edit-map-vertical-range-row edit-map-vertical-range-row--rotation">
                  <input type="range" className="edit-map-vertical-slider" min="0" max="360" step="1" value={bearing} onChange={(event) => handleBearingChange(Number(event.target.value))} aria-label="Map rotation angle" />
                  <button type="button" className="edit-map-value-box edit-map-value-box--button" onClick={handleSnap0} title="Reset rotation to north" aria-label={`Rotation ${bearing} degrees; click to reset`}>{bearing}°</button>
                </div>
              </section>

              <div className="edit-map-bottom-actions">
                <button type="button" className="edit-map-action-pill edit-map-action-pill--recenter" onClick={handleRecenter} title="Recenter map to the selected place">
                  <span className="edit-map-action-glyph">⛶</span><span>Re-center</span>
                </button>
                <button type="button" className="edit-map-action-pill edit-map-action-pill--reset" onClick={handleResetRotation} title="Reset rotation to north">
                  <RotateIcon className="edit-map-action-icon" /><span>Reset</span>
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

      {/* ── 4. LAYOUT & SHAPES ROW ── */}
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
