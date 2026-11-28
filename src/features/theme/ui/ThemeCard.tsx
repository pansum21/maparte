import type { ThemeOption, ResolvedTheme } from "../domain/types";
import ThemeMapPreview from "./ThemeMapPreview";
import "./themeMapPreview.css";

const CUSTOM_THEME_PREVIEW_CENTER: [number, number] = [-0.1276, 51.5072];
const CUSTOM_THEME_PREVIEW_OPTIONS = {
  distanceMeters: 14_000,
  includeLandcover: true,
  includeForests: true,
  includeParks: true,
  includeMountains: false,
  includeBuildings: true,
  includeWater: true,
  includeAeroway: false,
  includeRail: true,
  includeRoads: true,
  includeRoadPath: true,
  includeRoadMinorLow: true,
  includeRoadOutline: true,
  includeRoadNames: false,
  includePlaceLabels: false,
  includeNeighborhoodLabels: false,
  includeWaterLabels: false,
  includePoiLabels: false,
  includeBoundaries: false,
} as const;
interface ThemeCardProps {
  themeOption: ThemeOption | null;
  onClick?: () => void;
  isSelected?: boolean;
  previewTheme?: ResolvedTheme;
}

export default function ThemeCard({
  themeOption,
  onClick,
  isSelected = false,
  previewTheme,
}: ThemeCardProps) {
  if (!themeOption) return null;

  const isCustomTheme = themeOption.id.startsWith("custom-theme-");
  const className = [
    "theme-card",
    isSelected ? "is-selected" : "",
    isCustomTheme ? "theme-card--palette" : "",
  ].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={themeOption.name}
    >
      {isCustomTheme ? (
        <>
          <div className="theme-card-palette-preview theme-card-palette-preview--desktop" aria-hidden="true">
            <span style={{ backgroundColor: previewTheme.map.land }} />
            <span style={{ backgroundColor: previewTheme.map.water }} />
            <span style={{ backgroundColor: previewTheme.map.parks }} />
            <span style={{ backgroundColor: previewTheme.map.roads.major }} />
            <span style={{ backgroundColor: previewTheme.map.roads.minor_mid }} />
          </div>
          <div className="theme-card-custom-map-preview">
            <ThemeMapPreview
              theme={previewTheme}
              center={CUSTOM_THEME_PREVIEW_CENTER}
              mapOptions={CUSTOM_THEME_PREVIEW_OPTIONS}
            />
          </div>
        </>
      ) : (
        <img
          className="theme-card-map-image"
          src={`/theme-previews/thumbs/${themeOption.id}.webp`}
          alt=""
          loading="lazy"
          decoding="async"
        />
      )}
      <span className="theme-card-name-shadow" aria-hidden="true" />
      <p className="theme-card-name">{themeOption.name}</p>
    </button>
  );
}
