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
  LockIcon,
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
  onLocationToggle,
  onSettingsClick,
  onToggleCinema,
  onOpenWall,
  wallOpen = false,
  isEditing = false,
  onEditMapToggle,
}: DesktopNavBarProps) {
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

      </div>

      {/* ── 2. EDIT MAP ROW ── */}
      <div className="desktop-nav-row" data-tab="edit-map">
        <button
          type="button"
          className={`desktop-nav-tab${isEditing ? " is-active" : ""}`}
          onClick={onEditMapToggle}
          title={isEditing ? "Lock map editing" : "Unlock map editing"}
          aria-label={isEditing ? "Lock Map" : "Edit Map"}
          aria-pressed={isEditing}
        >
          {isEditing ? <LockIcon className="desktop-nav-icon" /> : <ScissorsIcon className="desktop-nav-icon" />}
          <span className="desktop-nav-label">{isEditing ? "Lock Map" : "Edit Map"}</span>
        </button>
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
          <span className="desktop-nav-icon" aria-hidden="true">▣</span>
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
