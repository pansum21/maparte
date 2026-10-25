import {
  LocationIcon,
  ThemeIcon,
  LayoutIcon,
  LayersIcon,
  MarkersIcon,
  RouteIcon,
  StyleIcon,
  SettingsIcon,
  SparklesIcon,
  FullScreenIcon,
  FrameIcon,
  ScissorsIcon,
  WallIcon,
  LockIcon,
} from "./Icons";

export type MobileTab =
  | "templates"
  | "location"
  | "edit-map"
  | "theme"
  | "wall"
  | "layout"
  | "frames"
  | "style"
  | "layers"
  | "markers"
  | "routes"
  | "settings";

const tabs: {
  id: MobileTab;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "location", label: "Location", Icon: LocationIcon },
  { id: "edit-map", label: "Edit Map", Icon: ScissorsIcon },
  { id: "theme", label: "Theme", Icon: ThemeIcon },
  { id: "wall", label: "Wall", Icon: WallIcon },
  { id: "layout", label: "Layout", Icon: LayoutIcon },
  { id: "frames", label: "Border", Icon: FrameIcon },
  { id: "templates", label: "Presets", Icon: SparklesIcon },
  { id: "style", label: "Text", Icon: StyleIcon },
  { id: "layers", label: "Layers", Icon: LayersIcon },
  { id: "markers", label: "Markers", Icon: MarkersIcon },
  { id: "routes", label: "Routes", Icon: RouteIcon },
];

interface MobileNavBarProps {
  activeTab: MobileTab;
  drawerOpen: boolean;
  isLocationVisible: boolean;
  onTabChange: (tab: MobileTab) => void;
  onOpenFullScreen: () => void;
  onSettingsClick: () => void;
  settingsOpen: boolean;
  wallOpen?: boolean;
  isEditing?: boolean;
  onEditMapToggle?: () => void;
}

export default function MobileNavBar({
  activeTab,
  drawerOpen,
  isLocationVisible,
  onTabChange,
  onOpenFullScreen,
  onSettingsClick,
  settingsOpen,
  wallOpen = false,
  isEditing = false,
  onEditMapToggle,
}: MobileNavBarProps) {
  return (
    <div className="mobile-nav-wrapper">
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <div className="mobile-nav-scroll-container">
          <div className="mobile-nav-tabs">
            {tabs.map(({ id, label, Icon }) => {
              const isLocationTab = id === "location";
              const isActive = id === "edit-map"
                ? isEditing
                : id === "wall"
                ? wallOpen
                : isLocationTab
                  ? isLocationVisible
                  : drawerOpen && activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  className={`mobile-nav-tab${isActive ? " is-active" : ""}`}
                  onClick={() => id === "edit-map" ? onEditMapToggle?.() : onTabChange(id)}
                  aria-label={id === "edit-map" ? (isEditing ? "Lock Map" : "Edit Map") : label}
                  aria-current={!isLocationTab && id !== "edit-map" && activeTab === id ? "page" : undefined}
                  aria-pressed={id === "edit-map" ? isEditing : isLocationTab ? isLocationVisible : undefined}
                >
                  {id === "edit-map" && isEditing ? <LockIcon className="mobile-nav-icon" /> : <Icon className="mobile-nav-icon" />}
                  <span className="mobile-nav-label">{id === "edit-map" && isEditing ? "Lock Map" : label}</span>
                </button>
              );
            })}
            <button
              type="button"
              className="mobile-nav-tab mobile-nav-tab--fullscreen"
              onClick={onOpenFullScreen}
              aria-label="Open full screen preview"
            >
              <FullScreenIcon className="mobile-nav-icon" />
              <span className="mobile-nav-label">Full Screen</span>
            </button>
          </div>
          <div className="mobile-nav-fade" aria-hidden="true" />
        </div>
      </nav>

      <button
        type="button"
        className={`mobile-nav-settings${settingsOpen ? " is-active" : ""}`}
        aria-label="Settings"
        aria-expanded={settingsOpen}
        onClick={onSettingsClick}
      >
        <SettingsIcon className="mobile-nav-settings-icon" />
      </button>
    </div>
  );
}
