import { useEffect, useState } from "react";
import type { ThemeOption, ResolvedTheme } from "../domain/types";
import "./themeMapPreview.css";

type ThemeMapPreviewComponent = typeof import("./ThemeMapPreview").default;

/**
 * The custom-theme card is the only other place the editor draws a live map, and
 * importing its preview statically put the 1 MB MapLibre core in AppShell's
 * module graph, so the shell could not paint until MapLibre had parsed. Load it
 * when the card actually renders a custom theme, and show the theme's land
 * colour until the component is in hand.
 */
function CustomThemePreview({ theme }: { theme: ResolvedTheme }) {
  const [Preview, setPreview] = useState<ThemeMapPreviewComponent | null>(null);

  useEffect(() => {
    let active = true;
    import("./ThemeMapPreview").then(
      (mod) => {
        if (active) setPreview(() => mod.default);
      },
      () => {},
    );
    return () => {
      active = false;
    };
  }, []);

  if (!Preview) {
    return (
      <div
        aria-hidden="true"
        style={{ width: "100%", height: "100%", backgroundColor: theme.map.land }}
      />
    );
  }

  return (
    <Preview
      theme={theme}
      center={CUSTOM_THEME_PREVIEW_CENTER}
      mapOptions={CUSTOM_THEME_PREVIEW_OPTIONS}
    />
  );
}

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
            <CustomThemePreview theme={previewTheme} />
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
